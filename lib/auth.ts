import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
    : 'http://127.0.0.1:3000/api/auth/callback';

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function buildAuthUrl(challenge: string, state: string, showDialog = false): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: 'playlist-modify-public playlist-modify-private user-read-private user-read-email',
  });
  if (showDialog) params.set('show_dialog', 'true');
  return `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCode(code: string, verifier: string): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

async function refreshToken(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
};

export async function getTokens(): Promise<SpotifyTokens | null> {
  const jar = await cookies();
  const raw = jar.get('spotify_tokens')?.value;
  if (!raw) return null;

  let tokens: SpotifyTokens;
  try { tokens = JSON.parse(raw); } catch { return null; }

  if (tokens.expires_at - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshToken(tokens.refresh_token);
      jar.set('spotify_tokens', JSON.stringify(refreshed), TOKEN_COOKIE_OPTIONS);
      return refreshed;
    } catch {
      return null;
    }
  }

  return tokens;
}

export async function saveTokens(tokens: SpotifyTokens): Promise<void> {
  const jar = await cookies();
  jar.set('spotify_tokens', JSON.stringify(tokens), TOKEN_COOKIE_OPTIONS);
}
