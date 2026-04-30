import 'server-only';
import jwt from 'jsonwebtoken';
import { createAdminClient } from '@/lib/supabase/admin';

// PDF signed URL — short-lived (10 min), service-role-issued because the
// bucket is private. Never expose storage_path to the client; always sign
// server-side and pass the resulting URL down.
export async function signPdfUrl(bucket: string, path: string, expiresInSeconds = 600) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// Mux signed playback JWT. Audience codes:
//   'v' = playback,  't' = thumbnail,  's' = storyboard,  'g' = gif
// We sign per-request; tokens expire in 30 minutes.
export function signMuxPlayback(playbackId: string) {
  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const privateKeyB64 = process.env.MUX_SIGNING_KEY_PRIVATE;
  if (!keyId || !privateKeyB64) {
    throw new Error('MUX_SIGNING_KEY_ID / MUX_SIGNING_KEY_PRIVATE are not set');
  }
  // SECURITY: private key is base64-encoded in env to keep newlines safe
  const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');

  const sign = (aud: string) =>
    jwt.sign(
      { sub: playbackId, aud, exp: Math.floor(Date.now() / 1000) + 1800 },
      privateKey,
      { algorithm: 'RS256', keyid: keyId }
    );

  return {
    playback: sign('v'),
    thumbnail: sign('t'),
    storyboard: sign('s'),
  };
}
