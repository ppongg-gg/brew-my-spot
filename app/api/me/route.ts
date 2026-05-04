import { NextResponse } from 'next/server';
import { getMe } from '@/lib/spotify';
import { getTokens } from '@/lib/auth';

export async function GET() {
  const tokens = await getTokens();
  if (!tokens) return NextResponse.json({ user: null });
  try {
    const user = await getMe();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
