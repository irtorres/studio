import { createPortal } from 'react-dom';
import { Check, Close, Warning } from './Icons';

const TONE = {
  success: 'border-success/40 text-success',
  error: 'border-error/40 text-error',
  warning: 'border-warning/40 text-warning',
  info: 'border-hair text-mist',
};

export default function Toasts({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 p-3.5 bg-surface border rounded-xl shadow-2xl backdrop-blur ${
            TONE[t.tone] ?? TONE.info
          }`}
        >
          <span className="shrink-0 mt-0.5">
            {t.tone === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Warning className="w-4 h-4" />
            )}
          </span>
          <p className="flex-1 text-sm text-bone leading-snug">{t.message}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-slate hover:text-bone transition-colors"
          >
            <Close className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
