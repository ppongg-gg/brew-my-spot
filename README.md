# Brew My Spot

Tell it a vibe, get a playlist. That's basically it.

Brew My Spot is a web app that uses Claude AI to generate Spotify playlists from natural language prompts. You type something like "late night study session with jazz undertones" or "2000s pop punk but make it sad" and it goes off, searches Spotify, and builds you a playlist. Then you can keep refining it through chat or audio sliders until it feels right.

---

## What it does

**Generate** — Describe any vibe, mood, era, genre, or artist style in plain English. You can also pick how many tracks you want (10–50). Claude will search Spotify and handpick tracks that match, then explain its picks in the chat.

**Tune** — Once you have a playlist, you can keep tweaking it:
- Chat: "more upbeat", "less mainstream", "add some post-rock" — Claude will swap tracks accordingly
- Audio sliders (Energy, Danceability, Mood, Tempo) — adjust and hit Apply to nudge the playlist toward a specific sound. *Note: Spotify currently restricts audio feature data for new developer apps, so sliders may be unavailable depending on your app's quota status.*

**Remove tracks** — Hover any track and hit × to pull it out. No need to type "remove track 4" into the chat.

**Save to Spotify** — One button saves the whole playlist to your Spotify library. *Note: Spotify's Developer Mode API currently blocks playlist-saving for apps that haven't gone through their Extended Quota approval process (which requires being a registered business). So this feature works if your app has been approved, otherwise you'll get an API restriction error. The workaround is clicking each track — they all link directly to Spotify.*

---

## Current state

This is a personal/hobby project, not a polished product. Here's where things stand:

✅ Auth flow (Spotify OAuth PKCE) — solid  
✅ Playlist generation via Claude + Spotify search — works well  
✅ Chat-based tuning — works  
✅ Track removal — works  
✅ UI — decent dark theme, mobile is untested  
⚠️ Audio sliders — UI is there but Spotify restricts the data for new apps  
⚠️ Save to Spotify — blocked by Spotify's API tier restrictions for new developer apps  
❌ No mobile layout  
❌ No user accounts / persistence beyond the current session  

---

## Tech stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Claude Haiku** (`claude-haiku-4-5`) via Anthropic SDK — handles playlist generation and tuning with tool use
- **Spotify Web API** — search, audio features, playlist CRUD
- **Spotify OAuth 2.0 PKCE** — no client secret needed

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/ppongg-gg/brew-my-spot.git
cd brew-my-spot
npm install
```

### 2. Get a Spotify Client ID

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in
2. Click **Create app**
3. Fill in a name and description (anything works)
4. Under **Redirect URIs**, add: `http://127.0.0.1:3000/api/auth/callback`
5. Under **Which API/SDKs are you planning to use?**, check **Web API**
6. Save, then copy your **Client ID** from the app overview page

> **User Management**: In your app settings, go to **User Management** and add the Spotify account(s) you'll use for testing. Spotify restricts development apps to 25 test users max.

### 3. Get an Anthropic API key

Head to [console.anthropic.com](https://console.anthropic.com), sign up or log in, and grab an API key from the API Keys section.

### 4. Create your `.env.local`

Create a file called `.env.local` in the project root:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

That's all you need. No client secret, no database, no extra services.

### 5. Run it

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) — use `127.0.0.1` not `localhost`, since that's what the Spotify redirect URI is set to.

Log in with Spotify, type a prompt, and brew.

---

## Known Spotify API limitations

Spotify has been tightening their API access for new apps since 2024. Two things are affected:

- **Audio features** (`/v1/audio-features`) — restricted for new apps, so the energy/danceability/tempo sliders won't have real data to work with
- **Playlist saving** (`POST /playlists/{id}/tracks`) — returns 403 for apps that haven't been approved for Extended Quota mode, which currently requires being a registered business with significant scale

Neither of these are bugs in the app — it's a Spotify platform restriction. Chat-based tuning and everything else works fine.
