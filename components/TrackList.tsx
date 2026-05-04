import type { SpotifyTrack } from '@/lib/types';

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface TrackListProps {
  tracks: SpotifyTrack[];
  onRemove?: (id: string) => void;
}

export default function TrackList({ tracks, onRemove }: TrackListProps) {
  return (
    <div className="flex flex-col divide-y divide-zinc-800/50">
      {tracks.map((track, i) => {
        const art = track.album.images[track.album.images.length - 1]?.url;
        const artist = track.artists.map((a) => a.name).join(', ');
        return (
          <a
            key={`${track.id}-${i}`}
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/60 transition-colors group relative"
          >
            <span className="text-zinc-700 text-xs w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
            {art ? (
              <img src={art} className="w-10 h-10 rounded shrink-0 object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 bg-zinc-800 rounded shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-zinc-100 text-sm font-medium truncate group-hover:text-white transition-colors">
                {track.name}
              </p>
              <p className="text-zinc-500 text-xs truncate">{artist}</p>
              <p className="text-zinc-700 text-xs truncate mt-0.5">{track.album.name}</p>
            </div>
            <span className="text-zinc-700 text-xs shrink-0 tabular-nums mr-1 group-hover:opacity-0 transition-opacity">
              {formatDuration(track.duration_ms)}
            </span>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(track.id);
                }}
                aria-label="Remove track"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-400 transition-colors text-xl leading-none opacity-0 group-hover:opacity-100 font-light"
              >
                ×
              </button>
            )}
          </a>
        );
      })}
    </div>
  );
}
