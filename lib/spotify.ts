import { getTokens } from './auth';
import type { SpotifyTrack, AudioFeatureRecord } from './types';

export type { SpotifyTrack, AudioFeatureRecord };

async function spotifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const tokens = await getTokens();
  if (!tokens) throw new Error('Not authenticated with Spotify');
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const granted = res.headers.get('x-oauth-scopes') ?? 'not-returned';
    const required = res.headers.get('x-accepted-oauth-scopes') ?? 'not-returned';
    console.error(`[spotify] ${res.status} ${path} | granted scopes: [${granted}] | required: [${required}] | body: ${text}`);
    throw new Error(`Spotify ${res.status}: ${text}`);
  }
  return res;
}

export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(Math.min(limit, 20)) });
  const res = await spotifyFetch(`/search?${params}`);
  const data = await res.json();
  return (data.tracks?.items ?? []) as SpotifyTrack[];
}

export async function getAudioFeatures(trackIds: string[]): Promise<AudioFeatureRecord[]> {
  if (!trackIds.length) return [];
  try {
    const params = new URLSearchParams({ ids: trackIds.slice(0, 100).join(',') });
    const res = await spotifyFetch(`/audio-features?${params}`);
    const data = await res.json();
    return ((data.audio_features ?? []) as AudioFeatureRecord[]).filter(Boolean);
  } catch {
    // Spotify restricts this endpoint for new apps — degrade gracefully
    return [];
  }
}

export async function getMe(): Promise<{ id: string; display_name: string; images: { url: string }[] }> {
  const res = await spotifyFetch('/me');
  return res.json();
}

export async function createPlaylist(
  name: string,
  description: string
): Promise<{ id: string; external_urls: { spotify: string } }> {
  const res = await spotifyFetch('/me/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  });
  const granted = res.headers.get('x-oauth-scopes') ?? 'not-returned';
  console.log(`[spotify] createPlaylist ok | granted scopes: [${granted}]`);
  return res.json();
}

export async function unfollowPlaylist(playlistId: string): Promise<void> {
  try {
    await spotifyFetch(`/playlists/${playlistId}/followers`, { method: 'DELETE' });
  } catch {
    // best-effort cleanup, don't propagate
  }
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
  for (let i = 0; i < trackUris.length; i += 100) {
    await spotifyFetch(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: trackUris.slice(i, i + 100) }),
    });
  }
}
