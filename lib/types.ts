export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_urls: { spotify: string };
  duration_ms: number;
}

export interface AudioFeatureRecord {
  id: string;
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
}

export interface AudioFeatureTargets {
  energy?: number;
  danceability?: number;
  valence?: number;
  tempo?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface PlaylistData {
  prompt: string;
  count: number;
  tracks: SpotifyTrack[];
  audioFeatures: Record<string, AudioFeatureRecord>;
  reasoning: string;
}
