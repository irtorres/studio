import { useEffect, useState } from 'react';
import { IconButton, Spinner } from './ui';
import {
  Close,
  Download,
  Heart,
  Lyrics as LyricsIcon,
  Music,
  Muted,
  Pause,
  Play,
  SkipNext,
  SkipPrev,
  Volume,
} from './Icons';
import { formatTime } from '../lib/format';
import { downloadTrack } from '../lib/download';

/**
 * Persistent bottom player. Lives outside the routed content so playback
 * survives switching between the composer and the library.
 */
export default function PlayerBar({
  player,
  onFavorite,
  onLyrics,
  onCached,
  onNotify,
}) {
  const {
    current,
    playing,
    time,
    duration,
    volume,
    muted,
    loading,
    error,
    hasNext,
    hasPrev,
    toggle,
    seek,
    next,
    prev,
    stop,
    setVolume,
    setMuted,
  } = player;

  const [scrubbing, setScrubbing] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (error) onNotify(error, 'error');
  }, [error, onNotify]);

  if (!current) return null;

  const shown = scrubbing ?? time;
  const total = duration || current.duration || 0;
  const pct = total ? (shown / total) * 100 : 0;

  const handleDownload = async () => {
    setDownloading(true);
    const result = await downloadTrack(current);
    setDownloading(false);
    if (result === 'saved') {
      onCached(current.id);
      onNotify(`Saved “${current.title}” offline.`, 'success');
    } else if (result === 'opened') {
      onNotify('Opened in a new tab — use right-click → Save As.', 'warning');
    } else {
      onNotify('Download failed.', 'error');
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40">
      <div className="bg-surface/95 backdrop-blur-xl border-t border-hair">
        {/* Seek bar sits flush along the top edge */}
        <div className="px-3 sm:px-5 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray nums-tabular w-10 text-right shrink-0">
              {formatTime(shown)}
            </span>
            <input
              type="range"
              aria-label="Seek"
              className="range flex-1"
              style={{
                '--track': `linear-gradient(90deg, var(--color-lime) ${pct}%, var(--color-navy-600) ${pct}%)`,
              }}
              min={0}
              max={total || 100}
              step={0.1}
              value={shown}
              onChange={(e) => setScrubbing(Number(e.target.value))}
              onPointerUp={() => {
                if (scrubbing !== null) seek(scrubbing);
                setScrubbing(null);
              }}
              onKeyUp={() => {
                if (scrubbing !== null) seek(scrubbing);
                setScrubbing(null);
              }}
            />
            <span className="text-[11px] text-gray nums-tabular w-10 shrink-0">
              {formatTime(total)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5">
          {/* Now playing ------------------------------------------------ */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-navy-700 shrink-0">
              {current.imageUrl ? (
                <img src={current.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-navy-500">
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-bone truncate">
                {current.title}
              </p>
              <p className="text-xs text-gray truncate">
                {current.tags || 'AI generated'}
              </p>
            </div>
          </div>

          {/* Transport -------------------------------------------------- */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <IconButton
              label="Previous"
              onClick={prev}
              disabled={!hasPrev && time < 3}
              className="w-9 h-9"
            >
              <SkipPrev />
            </IconButton>

            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
              className="grid place-items-center w-11 h-11 rounded-full bg-lime text-navy
                hover:bg-lime-600 active:scale-95 transition-all duration-150
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2"
            >
              {loading ? (
                <Spinner className="w-5 h-5" />
              ) : playing ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <IconButton
              label="Next"
              onClick={next}
              disabled={!hasNext}
              className="w-9 h-9"
            >
              <SkipNext />
            </IconButton>
          </div>

          {/* Secondary -------------------------------------------------- */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-end shrink-0">
            <IconButton
              label={current.favorite ? 'Remove from favourites' : 'Add to favourites'}
              onClick={() => onFavorite(current.id)}
              className={`w-9 h-9 hidden xs:inline-flex ${current.favorite ? 'text-lime' : ''}`}
            >
              <Heart filled={current.favorite} className="w-4 h-4" />
            </IconButton>

            {current.lyrics && (
              <IconButton
                label="Lyrics"
                onClick={() => onLyrics(current)}
                className="w-9 h-9 hidden sm:inline-flex"
              >
                <LyricsIcon className="w-4 h-4" />
              </IconButton>
            )}

            <IconButton
              label="Download"
              onClick={handleDownload}
              disabled={downloading}
              className="w-9 h-9 hidden sm:inline-flex"
            >
              {downloading ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            </IconButton>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-1.5 ml-1">
              <IconButton
                label={muted ? 'Unmute' : 'Mute'}
                onClick={() => setMuted(!muted)}
                className="w-9 h-9"
              >
                {muted || volume === 0 ? (
                  <Muted className="w-4 h-4" />
                ) : (
                  <Volume level={volume} className="w-4 h-4" />
                )}
              </IconButton>
              <input
                type="range"
                aria-label="Volume"
                className="range w-20"
                style={{
                  '--track': `linear-gradient(90deg, var(--color-lime) ${
                    (muted ? 0 : volume) * 100
                  }%, var(--color-navy-600) ${(muted ? 0 : volume) * 100}%)`,
                }}
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>

            <IconButton label="Close player" onClick={stop} className="w-9 h-9">
              <Close className="w-4 h-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
