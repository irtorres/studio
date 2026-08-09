import { useEffect, useState } from 'react';
import { Card, IconButton, Spinner } from './ui';
import { Check, Close, Warning } from './Icons';
import { STAGES } from '../hooks/useGeneration';
import { formatTime } from '../lib/format';

/**
 * Live progress for one generation.
 *
 * The stages come from the real status ladder, so this is honest reporting
 * rather than a fake progress bar: "Composing" genuinely means Suno has
 * finished the lyrics and started rendering audio.
 */
export default function JobCard({ job, onDismiss, onPlay }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (job.stage === 'done' || job.stage === 'failed') return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - job.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [job.startedAt, job.stage]);

  const failed = job.stage === 'failed';
  const activeIndex = STAGES.findIndex((s) => s.key === job.stage);
  const currentStage = STAGES[activeIndex];

  // A track is playable as soon as it has a stream URL, well before SUCCESS.
  const playable = (job.tracks || []).filter((t) => t.streamUrl || t.audioUrl);

  return (
    <Card
      className={`relative overflow-hidden p-5 ${
        failed ? 'border-error/40' : 'border-lime-700/40'
      }`}
    >
      {!failed && job.stage !== 'done' && (
        <div className="shimmer absolute inset-0 pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            {failed ? (
              <Warning className="w-4 h-4 text-error shrink-0" />
            ) : job.stage === 'done' ? (
              <Check className="w-4 h-4 text-success shrink-0" />
            ) : (
              <Spinner className="w-4 h-4 text-lime shrink-0" />
            )}
            <h3 className="font-semibold text-bone truncate">{job.title}</h3>
          </div>

          <p className={`text-sm ${failed ? 'text-error' : 'text-gray'}`}>
            {failed
              ? job.error
              : job.stage === 'done'
                ? 'Both versions ready.'
                : `${currentStage?.label ?? 'Working'} — ${currentStage?.hint ?? ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!failed && job.stage !== 'done' && (
            <span className="text-xs text-slate nums-tabular">
              {formatTime(elapsed)}
            </span>
          )}
          <IconButton
            label="Dismiss"
            onClick={() => onDismiss(job.taskId)}
            className="w-8 h-8"
          >
            <Close className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* Stage rail */}
      {!failed && (
        <div className="relative mt-4 flex gap-1.5">
          {STAGES.map((stage, i) => {
            const done = job.stage === 'done' || i < activeIndex;
            const active = i === activeIndex;
            return (
              <div key={stage.key} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-colors duration-500 ${
                    done
                      ? 'bg-lime'
                      : active
                        ? 'bg-lime/40'
                        : 'bg-navy-600'
                  }`}
                />
                <span
                  className={`block mt-1.5 text-[10px] uppercase tracking-wide transition-colors ${
                    done || active ? 'text-mist' : 'text-slate'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Early playback: stream URLs arrive ~30-40s in */}
      {playable.length > 0 && job.stage !== 'done' && (
        <div className="relative mt-4 pt-3 border-t border-hair">
          <p className="text-xs text-lime mb-2">
            Ready to preview while the rest finishes:
          </p>
          <div className="flex flex-wrap gap-2">
            {playable.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPlay(t, playable)}
                className="px-3 py-1.5 text-xs font-medium bg-lime/10 text-lime border border-lime-700/50 rounded-lg hover:bg-lime/20 transition-colors"
              >
                ▶ {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
