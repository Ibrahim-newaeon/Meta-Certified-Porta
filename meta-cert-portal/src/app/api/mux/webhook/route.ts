import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Mux webhook handler. Configure in Mux dashboard:
//   POST {APP_URL}/api/mux/webhook
//   signing secret -> MUX_WEBHOOK_SECRET (env)

export async function POST(req: Request) {
  const raw = await req.text();
  const h = await headers();
  const sig = h.get('mux-signature') ?? '';
  const secret = process.env.MUX_WEBHOOK_SECRET;

  // SECURITY: HMAC verification of the webhook to reject spoofed asset events.
  if (!secret) {
    return NextResponse.json({ error: 'webhook_secret_not_configured' }, { status: 500 });
  }

  // Header format: "t=<timestamp>,v1=<hex-hmac>"
  const parts = Object.fromEntries(
    sig.split(',').map((p) => p.split('=')) as [string, string][]
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) {
    return NextResponse.json({ error: 'bad_signature_header' }, { status: 400 });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${raw}`)
    .digest('hex');

  const provided = Buffer.from(v1, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (
    provided.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(provided, expectedBuf)
  ) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }

  // Reject events older than 5 minutes to mitigate replay attacks.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    return NextResponse.json({ error: 'stale_event' }, { status: 400 });
  }

  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (evt.type === 'video.asset.ready') {
    const asset = evt.data as {
      id: string;
      upload_id?: string;
      duration?: number;
      playback_ids?: { id: string; policy: string }[];
    };
    const playbackId = asset.playback_ids?.find((p) => p.policy === 'signed')?.id ?? asset.playback_ids?.[0]?.id;
    const uploadId = asset.upload_id;

    if (!playbackId || !uploadId) {
      return NextResponse.json({ ok: true, skipped: 'missing_ids' });
    }

    await admin
      .from('resources')
      .update({
        video_asset_id: asset.id,
        video_playback_id: playbackId,
        video_duration_s: Math.round(asset.duration ?? 0),
      })
      .eq('video_playback_id', uploadId);
  }

  return NextResponse.json({ ok: true });
}
