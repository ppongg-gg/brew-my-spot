'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUGGESTIONS = [
  'Radiohead style',
  '70s soul',
  'Modern jazz after midnight',
  'Summer road trip',
  'Focus & study',
  'Indie folk Sunday morning',
];

interface SpotifyUser {
  id: string;
  display_name: string;
  images: { url: string }[];
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SpotifyUser | null | undefined>(undefined);
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');

    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));

    if (authError) setError(`Spotify login failed: ${authError}`);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      sessionStorage.setItem('brew_playlist', JSON.stringify({ prompt: prompt.trim(), ...data }));
      router.push('/playlist');
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] px-4 gap-4">
        <h1 className="text-5xl font-bold text-white">Brew My Spot</h1>
        <p className="text-zinc-400 text-lg text-center">Describe a vibe. Get a playlist.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <a
          href="/api/auth/login"
          className="mt-4 flex items-center gap-3 bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold px-8 py-4 rounded-full transition-colors"
        >
          <SpotifyIcon />
          Connect with Spotify
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <span className="text-white font-bold">Brew My Spot</span>
        <div className="flex items-center gap-3">
          {user.images?.[0] && (
            <img src={user.images[0].url} className="w-8 h-8 rounded-full object-cover" alt="" />
          )}
          <span className="text-zinc-400 text-sm">{user.display_name}</span>
          <a href="/api/auth/logout" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            Logout
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-2">What should we brew?</h2>
        <p className="text-zinc-500 mb-10">Describe a mood, artist, era, or anything.</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='"radiohead style", "70s soul", "modern jazz after midnight"'
              className="flex-1 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-full px-5 py-3 focus:outline-none focus:border-[#1db954] transition-colors"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="bg-[#1db954] hover:bg-[#1ed760] disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-full transition-colors whitespace-nowrap"
            >
              {loading ? 'Brewing…' : 'Brew it →'}
            </button>
          </div>

          {/* Length picker */}
          <div className="flex items-center gap-3 mt-5 px-1">
            <span className="text-zinc-500 text-sm shrink-0">Songs</span>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={loading}
              className="flex-1 h-1 accent-[#1db954] disabled:opacity-50"
            />
            <span className="text-[#1db954] text-sm font-semibold w-6 text-right shrink-0">{count}</span>
          </div>

          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}

          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                disabled={loading}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm px-4 py-2 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        {loading && (
          <div className="mt-10 text-center">
            <Spinner />
            <p className="text-zinc-400 mt-3 text-sm">Brewing your playlist… usually under a minute.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
