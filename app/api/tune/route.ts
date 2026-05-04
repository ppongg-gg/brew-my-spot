import { NextRequest, NextResponse } from 'next/server';
import { tunePlaylist } from '@/lib/claude';
import { getAudioFeatures } from '@/lib/spotify';
import { getTokens } from '@/lib/auth';
import type { SpotifyTrack, AudioFeatureRecord, AudioFeatureTargets } from '@/lib/types';

export async function POST(req: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { currentTracks, message, audioTargets, audioFeatures, count } = (await req.json()) as {
    currentTracks: SpotifyTrack[];
    message: string | null;
    audioTargets: AudioFeatureTargets | null;
    audioFeatures: Record<string, AudioFeatureRecord>;
    count: number;
  };

  if (!currentTracks?.length) return NextResponse.json({ error: 'No tracks provided' }, { status: 400 });

  const safeCount = Math.min(50, Math.max(10, Number(count) || 15));

  try {
    const { tracks, reasoning } = await tunePlaylist(currentTracks, message, audioTargets, audioFeatures, safeCount);
    const features = await getAudioFeatures(tracks.map((t) => t.id));
    const newAudioFeatures = Object.fromEntries(features.map((f) => [f.id, f]));
    return NextResponse.json({ tracks, reasoning, audioFeatures: newAudioFeatures });
  } catch (err) {
    console.error('[tune]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
