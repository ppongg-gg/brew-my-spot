import Anthropic from '@anthropic-ai/sdk';
import { searchTracks } from './spotify';
import type { SpotifyTrack, AudioFeatureRecord, AudioFeatureTargets } from './types';

const anthropic = new Anthropic();

function makeSystemPrompt(count: number): string {
  return `You are a music curator. Build Spotify playlists from user descriptions.

Rules:
- Do 3–5 searches to find candidate tracks, then IMMEDIATELY output the JSON. Do not search more than 5 times.
- Each search returns up to 5 tracks.
- Select the best ${count} tracks from your results.
- Output ONLY this raw JSON — no preamble, no markdown, nothing else:
{"track_ids": ["id1", "id2", ...], "reasoning": "one sentence"}

track_ids must be Spotify track IDs from your search results. Never invent IDs.`;
}

function makeTuneSystemPrompt(count: number): string {
  return `You are a music curator adjusting an existing Spotify playlist.

Rules:
- Do 2–4 searches maximum to find replacement tracks, then IMMEDIATELY output the JSON.
- Keep tracks from the current list that already fit.
- Return exactly ${count} tracks total.
- Output ONLY this raw JSON — no preamble, no markdown, nothing else:
{"track_ids": ["id1", "id2", ...], "reasoning": "one sentence"}

track_ids must be Spotify track IDs — from the current playlist or your searches.`;
}

const searchSpotifyTool: Anthropic.Tool = {
  name: 'search_spotify',
  description: 'Search Spotify for tracks. Returns up to 5 track objects with id, name, artist, album.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search query — artist name, genre, mood, track title, etc.' },
    },
    required: ['query'],
  },
};

type SlimTrack = { id: string; name: string; artist: string; album: string };

function slim(tracks: SpotifyTrack[]): SlimTrack[] {
  return tracks.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
  }));
}

function maxIterationsFor(count: number): number {
  if (count <= 15) return 6;
  if (count <= 30) return 10;
  return 14;
}

async function runWithTools(
  system: string,
  messages: Anthropic.MessageParam[],
  count: number,
  seedTracks: SpotifyTrack[] = []
): Promise<{ tracks: SpotifyTrack[]; reasoning: string }> {
  const cache = new Map<string, SpotifyTrack>();
  seedTracks.forEach((t) => cache.set(t.id, t));
  let msgs = [...messages];
  const maxIter = maxIterationsFor(count);

  for (let i = 0; i < maxIter; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      tools: [searchSpotifyTool],
      messages: msgs,
    });

    console.log(`[claude] turn ${i + 1}/${maxIter} stop_reason=${response.stop_reason} cache=${cache.size}`);

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      const textBlock = response.content.find((b) => b.type === 'text');

      if (response.stop_reason === 'max_tokens' && !textBlock) {
        // No text at all — ask Claude to output the JSON now
        msgs = [
          ...msgs,
          { role: 'assistant', content: response.content },
          { role: 'user', content: [{ type: 'text' as const, text: 'Output the JSON now. Only the raw JSON, nothing else.' }] },
        ];
        continue;
      }

      if (!textBlock || textBlock.type !== 'text') throw new Error('No text in Claude response');

      let jsonStr = textBlock.text.trim();
      const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) jsonStr = codeBlock[1].trim();
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];

      // If JSON is incomplete (max_tokens cut it off mid-string), ask for continuation
      if (response.stop_reason === 'max_tokens' && !objMatch) {
        msgs = [
          ...msgs,
          { role: 'assistant', content: response.content },
          { role: 'user', content: [{ type: 'text' as const, text: 'Continue the JSON from where you stopped.' }] },
        ];
        continue;
      }

      const parsed = JSON.parse(jsonStr);
      const ids: string[] = parsed.track_ids ?? [];
      const tracks = ids.map((id) => cache.get(id)).filter((t): t is SpotifyTrack => !!t);
      console.log(`[claude] done — ${tracks.length}/${count} tracks resolved from ${cache.size} cached`);
      return { tracks, reasoning: parsed.reasoning ?? '' };
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b) => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUses) {
        if (block.type !== 'tool_use') continue;
        const input = block.input as { query: string };
        console.log(`[claude] search: "${input.query}"`);
        try {
          const results = await searchTracks(input.query, 5);
          results.forEach((t) => cache.set(t.id, t));
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(slim(results)),
          });
        } catch (err) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${err}`, is_error: true });
        }
      }

      msgs = [
        ...msgs,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }
  }

  throw new Error('Claude did not finish within iteration limit');
}

export async function generatePlaylist(
  prompt: string,
  count: number
): Promise<{ tracks: SpotifyTrack[]; reasoning: string }> {
  return runWithTools(
    makeSystemPrompt(count),
    [{ role: 'user', content: `Create a playlist of ${count} tracks for: "${prompt}"` }],
    count
  );
}

export async function tunePlaylist(
  currentTracks: SpotifyTrack[],
  message: string | null,
  audioTargets: AudioFeatureTargets | null,
  audioFeatures: Record<string, AudioFeatureRecord>,
  count: number
): Promise<{ tracks: SpotifyTrack[]; reasoning: string }> {
  const trackList = currentTracks
    .map((t) => {
      const af = audioFeatures[t.id];
      const afStr = af
        ? ` [energy:${af.energy.toFixed(2)}, dance:${af.danceability.toFixed(2)}, mood:${af.valence.toFixed(2)}, tempo:${Math.round(af.tempo)}]`
        : '';
      return `${t.id} | "${t.name}" by ${t.artists[0]?.name}${afStr}`;
    })
    .join('\n');

  const instructions = [
    message ? `User request: "${message}"` : null,
    audioTargets && Object.keys(audioTargets).length > 0
      ? `Audio feature targets: ${JSON.stringify(audioTargets)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return runWithTools(
    makeTuneSystemPrompt(count),
    [{ role: 'user', content: `Current playlist (id | title | audio features):\n${trackList}\n\n${instructions}` }],
    count,
    currentTracks
  );
}
