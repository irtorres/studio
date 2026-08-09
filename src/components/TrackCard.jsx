import { useState } from 'react';
import { Equaliser, IconButton, Spinner } from './ui';
import {
  Download,
  Heart,
  Image as ImageIcon,
  Lyrics as LyricsIcon,
  Music,
  Offline,
  Pause,
  Play,
  Remix,
  Trash,
} from './Icons';
import { downloadImage, downloadTrack } from '../lib/download';
import { expiryLabel, expiryTone, formatTime, tagList } from '../lib/format';

const TONE_CLASS = {
  safe: 'text-success',
  normal: 'text-slate',
  urgent: 'text-warning',
  gone: 'text-error',
};

export default function TrackCard({
  track,
  isCurrent,
  isPlaying,
  onPlay,
  onToggle,
  onFavorite,
  onDelete,
  onRemix,
  onLyrics,
  onCached,
  onNotify,
}) {
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await downloadTrack(track);
      if (result === 'saved') {
        onCached(track.id);
        onNotify(`Saved “${track.title}” — it’s now offline and permanent.`, 'success');
      } else if (result === 'opened') {
        onNotify(
          'Your browser blocked the direct save. The file opened in a new tab — use right-click → Save As.',
          'warning',
        );
      } else {
        onNotify('Download failed. The file may have expired on Suno.', 'error');
      }
    } catch {
      onNotify('Download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const tags = tagList(track.tags);
  const tone = expiryTone(track);

  return (
    <div
      className={`group relative flex gap-4 p-3 rounded-2xl border transition-all duration-200 ${
        isCurrent
          ? 'bg-lime/6 border-lime-700/60'
          : 'bg-surface/50 border-hair hover:border-navy-500 hover:bg-surface'
      }`}
    >
      {/* Cover + play ------------------------------------------------- */}
      <div className="relative shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-navy-700">
          {track.imageUrl ? (
            <img
              src={track.imageUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-navy-500">
              <Music className="w-7 h-7" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => (isCurrent ? onToggle() : onPlay(track))}
          aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="absolute inset-0 grid place-items-center rounded-xl bg-ink/55 opacity-0 group-hover:opacity-100
            focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime
            transition-opacity duration-150 data-[on=true]:opacity-100"
          data-on={isCurrent}
        >
          <span className="grid place-items-center w-10 h-10 rounded-full bg-lime text-navy shadow-lg">
            {isCurrent && isPlaying ? <Pause /> : <Play />}
          </span>
        </button>
      </div>

      {/* Body ---------------------------------------------------------- */}
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start gap-2">
          <h3 className="font-semibold text-bone truncate flex-1">{track.title}</h3>
          {isCurrent && isPlaying && <Equaliser className="mt-1 shrink-0" />}
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gray">
          <span className="nums-tabular">{formatTime(track.duration)}</span>
          {track.model && (
            <>
              <span className="text-navy-500">·</span>
              <span>{track.model.replace('chirp-', 'v')}</span>
            </>
          )}
          <span className="text-navy-500">·</span>
          <span className={`inline-flex items-center gap-1 ${TONE_CLASS[tone]}`}>
            {track.cached && <Offline className="w-3 h-3" />}
            {expiryLabel(track)}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-[11px] rounded-full bg-navy-700 text-mist border border-hair"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 mt-2 -ml-1.5">
          <IconButton
            label={track.favorite ? 'Remove from favourites' : 'Add to favourites'}
            onClick={() => onFavorite(track.id)}
            className={`w-8 h-8 ${track.favorite ? 'text-lime hover:text-lime' : ''}`}
          >
            <Heart filled={track.favorite} className="w-4 h-4" />
          </IconButton>

          <IconButton
            label="Download MP3"
            onClick={handleDownload}
            disabled={downloading}
            className="w-8 h-8"
          >
            {downloading ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          </IconButton>

          {track.lyrics && (
            <IconButton label="Lyrics" onClick={() => onLyrics(track)} className="w-8 h-8">
              <LyricsIcon className="w-4 h-4" />
            </IconButton>
          )}

          <IconButton
            label="Remix — reuse these settings"
            onClick={() => onRemix(track)}
            className="w-8 h-8"
          >
            <Remix className="w-4 h-4" />
          </IconButton>

          <IconButton
            label="More"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8"
          >
            <span className="text-lg leading-none">⋯</span>
          </IconButton>
        </div>

        {menuOpen && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-hair">
            <button
              type="button"
              onClick={() => {
                downloadImage(track);
                setMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-mist hover:text-bone rounded-lg hover:bg-white/5"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Save cover
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(track.id);
                setMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-error/90 hover:text-error rounded-lg hover:bg-error/10"
            >
              <Trash className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
