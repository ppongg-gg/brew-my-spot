import { NextRequest, NextResponse } from 'next/server';
import { createPlaylist, addTracksToPlaylist, unfollowPlaylist } from '@/lib/spotify';
import { getTokens } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { name, description, trackIds } = (await req.json()) as {
    name: string;
    description: string;
    trackIds: string[];
  };

  const validIds = (trackIds ?? []).filter((id) => typeof id === 'string' && id.length > 5);
  console.log(`[save] ${validIds.length} valid track ids`);

  if (!validIds.length) {
    return NextResponse.json({ error: 'No valid track IDs provided' }, { status: 400 });
  }

  let playlistId: string | null = null;
  try {
    const playlist = await createPlaylist(name ?? 'Brew My Spot Playlist', description ?? '');
    playlistId = playlist.id;

    const uris = validIds.map((id) => `spotify:track:${id}`);
    console.log(`[save] adding ${uris.length} tracks to ${playlistId}`);
    await addTracksToPlaylist(playlistId, uris);

    return NextResponse.json({ playlistUrl: playlist.external_urls.spotify });
  } catch (err) {
    console.error('[save]', err);
    // Remove the empty playlist so it doesn't litter the user's library
    if (playlistId) await unfollowPlaylist(playlistId);

    const msg = String(err);
    if (msg.includes('403')) {
      return NextResponse.json(
        {
          error: "Spotify's Developer Mode blocks playlist saving — this is an API restriction, not an auth issue. Open each track below to add it manually.",
          isRestriction: true,
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
