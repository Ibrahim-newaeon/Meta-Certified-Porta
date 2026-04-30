import { NextResponse } from 'next/server';

// Public health check used to smoke-test middleware. Listed in PUBLIC_ROUTES.
export async function GET() {
  return NextResponse.json({ ok: true });
}
