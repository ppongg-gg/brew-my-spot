import { NextRequest, NextResponse } from 'next/server';
import { generatePlaylist } from '@/lib/claude';
import { getAudioFeatures } from '@/lib/spotify';
import { getTokens } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const prompt: string = body?.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

  const count = Math.min(50, Math.max(10, Number(body?.count) || 15));

  try {
    const { tracks, reasoning } = await generatePlaylist(prompt, count);
    const features = await getAudioFeatures(tracks.map((t) => t.id));
    const audioFeatures = Object.fromEntries(features.map((f) => [f.id, f]));
    return NextResponse.json({ tracks, reasoning, audioFeatures, count });
  } catch (err) {
    console.error('[generate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
