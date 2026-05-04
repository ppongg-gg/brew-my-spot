import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000';

export async function GET() {
  const jar = await cookies();
  jar.delete('spotify_tokens');
  return NextResponse.redirect(`${BASE}/`);
}
