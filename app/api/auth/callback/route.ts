import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, saveTokens } from '@/lib/auth';
import { cookies } from 'next/headers';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) return NextResponse.redirect(`${BASE}/?error=spotify_denied`);

  const jar = await cookies();
  const storedState = jar.get('oauth_state')?.value;
  const verifier = jar.get('pkce_verifier')?.value;

  if (!code || !state || state !== storedState || !verifier) {
    return NextResponse.redirect(`${BASE}/?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCode(code, verifier);
    await saveTokens(tokens);
    const redirect = jar.get('post_auth_redirect')?.value ?? '/';
    jar.delete('pkce_verifier');
    jar.delete('oauth_state');
    jar.delete('post_auth_redirect');
    return NextResponse.redirect(`${BASE}${redirect}`);
  } catch {
    return NextResponse.redirect(`${BASE}/?error=token_exchange_failed`);
  }
}
