@AGENTS.md

# Brew My Spot

Next.js 16 App Router + TS + Tailwind v4. AI playlist generator: user describes vibe → Claude Haiku searches Spotify → returns playlist → user refines via chat or audio sliders.

## Stack
- Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic SDK, tool use (`search_spotify`)
- Spotify OAuth 2.0 PKCE (no client secret). Redirect URI: `http://127.0.0.1:3000/api/auth/callback`
- Tokens in httpOnly cookie `spotify_tokens` as `{access_token, refresh_token, expires_at}`. Auto-refresh if <5min left.
- Playlist state in `sessionStorage` as `brew_playlist` (PlaylistData). Stateless API routes.

## Key files
- `lib/auth.ts` — PKCE helpers, token cookie r/w, buildAuthUrl (showDialog param for reauth)
- `lib/spotify.ts` — spotifyFetch wrapper, search/audioFeatures/createPlaylist/addTracks/unfollowPlaylist
- `lib/claude.ts` — generatePlaylist + tunePlaylist. Claude gets slim track objects, full SpotifyTrack cached in Map. maxIterations: ≤15→6, ≤30→10, >30→14. Handles max_tokens stop_reason.
- `lib/types.ts` — SpotifyTrack, AudioFeatureRecord, AudioFeatureTargets, ChatMessage, PlaylistData
- `app/api/generate/route.ts` — POST {prompt, count(10-50)}
- `app/api/tune/route.ts` — POST {currentTracks, message, audioTargets, audioFeatures, count}
- `app/api/playlist/save/route.ts` — creates private playlist then adds tracks. Returns `{isRestriction:true}` on 403.
- `app/api/auth/login/route.ts` — ?reauth=true sets show_dialog+post_auth_redirect cookie
- `app/api/auth/callback/route.ts` — reads post_auth_redirect cookie, redirects there after token exchange
- `app/playlist/page.tsx` — main playlist view. handleRemove filters tracks + updates sessionStorage.
- `components/TunePanel.tsx` — chat thread + sliders. MessageText renders **bold** markdown.
- `components/TrackList.tsx` — onRemove prop, hover × button, shows name/artist/album.

## Spotify API restrictions (new apps, 2024-2026)
- `GET /audio-features` → 403. Silently returns [] in getAudioFeatures(). Sliders show ? tooltip.
- `POST /playlists/{id}/tracks` → 403. Extended Quota requires registered business + 250k MAU. Not fixable in dev.
- `POST /me/playlists` (create empty playlist) → works fine.
- Workaround: save returns isRestriction:true, UI shows "Copy links" button + per-track Spotify links.

## Env
```
SPOTIFY_CLIENT_ID=
ANTHROPIC_API_KEY=
```
Run on 127.0.0.1:3000 (not localhost — Spotify redirect URI).

## Status
Working: auth, generation, chat tuning, track remove, copy links, UI.
Broken by Spotify policy: audio feature sliders, save to Spotify.
Missing: mobile layout, persistence beyond session.
