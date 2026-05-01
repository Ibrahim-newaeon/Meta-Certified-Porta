// SECURITY: Route protection. Runs on every request.
// Renamed from middleware.ts → proxy.ts per Next.js 16's file-convention rename.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Webhooks must be public — they're called by external services (Mux) without
// our auth cookie. The handlers verify the request via signing-secret HMAC.
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth/callback',
  '/api/health',
  '/api/mux/webhook',
  '/',
];
const ADMIN_ROUTES = ['/admin'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // SECURITY: getUser() validates the JWT against Supabase, unlike getSession()
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // SECURITY: Redirect unauthenticated users away from protected routes
  const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // SECURITY: Admin route check — verify role from profiles table
  if (user && ADMIN_ROUTES.some(r => path.startsWith(r))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
