import 'server-only';
import Mux from '@mux/mux-node';

// Lazy singleton so unset env doesn't crash imports during build.
let _mux: Mux | null = null;

export function getMux(): Mux {
  if (_mux) return _mux;
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    throw new Error('MUX_TOKEN_ID / MUX_TOKEN_SECRET are not set');
  }
  _mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  });
  return _mux;
}
