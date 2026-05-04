import { NextRequest, NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, buildAuthUrl } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const reauth = req.nextUrl.searchParams.get('reauth') === 'true';
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(buildAuthUrl(challenge, state, reauth));
  const opts = { httpOnly: true, sameSite: 'lax' as const, maxAge: 600, path: '/' };
  response.cookies.set('pkce_verifier', verifier, opts);
  response.cookies.set('oauth_state', state, opts);
  if (reauth) response.cookies.set('post_auth_redirect', '/playlist', opts);
  return response;
}
