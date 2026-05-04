'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { SpotifyTrack, AudioFeatureRecord, AudioFeatureTargets, ChatMessage } from '@/lib/types';

interface TunePanelProps {
  tracks: SpotifyTrack[];
  audioFeatures: Record<string, AudioFeatureRecord>;
  chatHistory: ChatMessage[];
  isTuning: boolean;
  onTune: (message: string | null, audioTargets: AudioFeatureTargets | null) => void;
}

const SLIDERS = [
  { key: 'energy' as const, label: 'Energy', min: 0, max: 1, step: 0.01, fmt: (v: number) => v.toFixed(2) },
  { key: 'danceability' as const, label: 'Dance', min: 0, max: 1, step: 0.01, fmt: (v: number) => v.toFixed(2) },
  { key: 'valence' as const, label: 'Mood', min: 0, max: 1, step: 0.01, fmt: (v: number) => v.toFixed(2) },
  { key: 'tempo' as const, label: 'Tempo', min: 60, max: 200, step: 1, fmt: (v: number) => `${Math.round(v)} bpm` },
];

type SliderValues = { energy: number; danceability: number; valence: number; tempo: number };

function computeAverages(tracks: SpotifyTrack[], features: Record<string, AudioFeatureRecord>): SliderValues {
  const with_features = tracks.filter((t) => features[t.id]);
  if (!with_features.length) return { energy: 0.5, danceability: 0.5, valence: 0.5, tempo: 120 };
  const n = with_features.length;
  const sum = with_features.reduce(
    (acc, t) => {
      const f = features[t.id];
      return { energy: acc.energy + f.energy, danceability: acc.danceability + f.danceability, valence: acc.valence + f.valence, tempo: acc.tempo + f.tempo };
    },
    { energy: 0, danceability: 0, valence: 0, tempo: 0 }
  );
  return { energy: sum.energy / n, danceability: sum.danceability / n, valence: sum.valence / n, tempo: sum.tempo / n };
}

function MessageText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function TunePanel({ tracks, audioFeatures, chatHistory, isTuning, onTune }: TunePanelProps) {
  const averages = useMemo(() => computeAverages(tracks, audioFeatures), [tracks, audioFeatures]);
  const [sliders, setSliders] = useState<SliderValues>(averages);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasFeatures = Object.keys(audioFeatures).length > 0;

  useEffect(() => { setSliders(averages); }, [averages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isTuning]);

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || isTuning) return;
    onTune(chatInput.trim(), null);
    setChatInput('');
  }

  function handleSliderApply() {
    if (isTuning) return;
    const targets: AudioFeatureTargets = {};
    for (const { key } of SLIDERS) {
      if (Math.abs(sliders[key] - averages[key]) > 0.015) {
        targets[key] = sliders[key];
      }
    }
    if (!Object.keys(targets).length) return;
    onTune(null, targets);
  }

  return (
    <div className="flex flex-col h-full bg-[#111]">
      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0 scroll-thin">
        {chatHistory.length === 0 && (
          <p className="text-zinc-600 text-xs text-center mt-8 leading-relaxed px-2">
            Describe what to change, or adjust the audio sliders below.
          </p>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] text-sm px-4 py-2.5 rounded-2xl leading-[1.6] ${
                msg.role === 'user'
                  ? 'bg-[#1db954] text-black rounded-br-sm font-medium'
                  : 'bg-zinc-800/80 text-zinc-300 rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? <MessageText text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}
        {isTuning && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/80 rounded-2xl rounded-bl-sm px-4 py-3.5 flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat input */}
      <form onSubmit={handleChatSubmit} className="px-3 pb-3 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="more energetic, less 90s…"
            disabled={isTuning}
            className="flex-1 bg-zinc-900 border border-zinc-700/60 text-white placeholder-zinc-500 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#1db954]/60 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isTuning}
            className="bg-[#1db954] hover:bg-[#1ed760] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border disabled:border-zinc-700 disabled:cursor-not-allowed text-black font-bold px-4 py-2 rounded-full text-sm transition-colors shrink-0"
          >
            →
          </button>
        </div>
      </form>

      {/* Audio feature sliders */}
      <div className="border-t border-zinc-800 px-4 pt-3 pb-4 shrink-0">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-zinc-600 text-[10px] uppercase tracking-widest">Audio Features</span>
          {!hasFeatures && (
            <div className="relative group">
              <span className="text-zinc-700 text-[9px] border border-zinc-700 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center cursor-help hover:border-zinc-500 hover:text-zinc-500 transition-colors select-none leading-none">
                ?
              </span>
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-[#1a1a1a] border border-zinc-800 rounded-xl p-3 text-zinc-400 text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-2xl">
                Spotify restricts audio feature access for new developer apps. Use chat to tune your playlist instead.
              </div>
            </div>
          )}
        </div>
        {hasFeatures && (
          <>
            <div className="space-y-3">
              {SLIDERS.map(({ key, label, min, max, step, fmt }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs w-[72px] shrink-0">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={sliders[key]}
                    onChange={(e) => setSliders((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    className="flex-1 h-1 accent-[#1db954]"
                  />
                  <span className="text-zinc-500 text-xs w-14 text-right shrink-0 tabular-nums">{fmt(sliders[key])}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleSliderApply}
              disabled={isTuning}
              className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700/80 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 text-sm py-2 rounded-full transition-colors"
            >
              Apply
            </button>
          </>
        )}
      </div>
    </div>
  );
}
