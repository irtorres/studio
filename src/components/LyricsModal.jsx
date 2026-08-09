import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Spinner } from './ui';
import { Copy, Check, Download } from './Icons';
import { getTimestampedLyrics } from '../lib/suno';
import { downloadText } from '../lib/download';
import { slugify } from '../lib/format';

/**
 * Lyrics, with karaoke highlighting when Suno can give us word timings.
 *
 * The timestamped-lyrics endpoint returns per-word start/end seconds. We sync
 * against the live player clock and auto-scroll the active line into view.
 */
export default function LyricsModal({ open, track, player, onClose, onNotify }) {
  const [aligned, setAligned] = useState(null);
  const [loading, setLoading] = useState(false);
  const [karaoke, setKaraoke] = useState(true);
  const [copied, setCopied] = useState(false);
  const activeRef = useRef(null);
  const scrollRef = useRef(null);

  // Fetch word timings once per track.
  useEffect(() => {
    if (!open || !track?.taskId || !track?.id) return;
    let alive = true;
    setAligned(null);
    setLoading(true);

    getTimestampedLyrics(track.taskId, track.id)
      .then((data) => {
        if (!alive) return;
        setAligned(data?.alignedWords?.filter((w) => w.word) ?? []);
      })
      .catch(() => {
        // Timings are a bonus — plain lyrics still render.
        if (alive) setAligned([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [open, track?.taskId, track?.id]);

  const isCurrent = player.current?.id === track?.id;
  const time = isCurrent ? player.time : 0;

  /** Group the flat word list into lines, splitting on newlines. */
  const lines = useMemo(() => {
    if (!aligned?.length) return null;
    const out = [];
    let line = [];
    for (const w of aligned) {
      const text = w.word ?? '';
      // Suno embeds newlines inside word tokens to mark line breaks.
      if (text.includes('\n') && line.length) {
        const [head, ...rest] = text.split('\n');
        if (head.trim()) line.push({ ...w, word: head });
        out.push(line);
        line = [];
        const tail = rest.join('\n').trim();
        if (tail) line.push({ ...w, word: tail });
      } else {
        line.push(w);
      }
    }
    if (line.length) out.push(line);
    return out.filter((l) => l.length);
  }, [aligned]);

  const canKaraoke = Boolean(lines?.length) && isCurrent;

  // Keep the active line centred.
  useEffect(() => {
    if (!karaoke || !canKaraoke) return;
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [time, karaoke, canKaraoke]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(track.lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('Could not copy to clipboard.', 'error');
    }
  };

  if (!track) return null;

  const activeLineIndex = lines
    ? lines.findIndex(
        (l) => time >= l[0].startS && time <= l[l.length - 1].endS + 0.4,
      )
    : -1;

  return (
    <Modal open={open} onClose={onClose} title={track.title} wide>
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-hair">
        {canKaraoke && (
          <Button
            variant={karaoke ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setKaraoke((k) => !k)}
          >
            {karaoke ? 'Karaoke on' : 'Karaoke off'}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadText(track.lyrics, `${slugify(track.title, 'lyrics')}.txt`)
          }
        >
          <Download className="w-4 h-4" /> .txt
        </Button>

        {loading && (
          <span className="inline-flex items-center gap-2 text-xs text-gray ml-auto">
            <Spinner className="w-3.5 h-3.5" /> Loading timings…
          </span>
        )}
        {!loading && !canKaraoke && lines?.length > 0 && (
          <span className="text-xs text-gray ml-auto">
            Play this track to follow along
          </span>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[52vh] overflow-y-auto pr-1">
        {karaoke && canKaraoke ? (
          <div className="space-y-3">
            {lines.map((line, i) => {
              const isActive = i === activeLineIndex;
              const isPast = line[line.length - 1].endS < time;
              return (
                <p
                  key={i}
                  ref={isActive ? activeRef : null}
                  onClick={() => player.seek(line[0].startS)}
                  className={`cursor-pointer leading-relaxed transition-all duration-300 ${
                    isActive
                      ? 'text-lg text-bone font-medium'
                      : isPast
                        ? 'text-sm text-slate'
                        : 'text-sm text-gray'
                  }`}
                >
                  {line.map((w, j) => {
                    const sung = time >= w.startS;
                    return (
                      <span
                        key={j}
                        className={
                          isActive && sung
                            ? 'text-lime transition-colors duration-150'
                            : ''
                        }
                      >
                        {w.word}{' '}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-mist leading-relaxed">
            {track.lyrics || 'This track is instrumental — no lyrics.'}
          </pre>
        )}
      </div>
    </Modal>
  );
}
