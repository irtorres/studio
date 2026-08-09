import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Close } from './Icons';

const VARIANTS = {
  primary:
    'bg-lime text-navy hover:bg-lime-600 disabled:bg-navy-600 disabled:text-gray',
  ghost:
    'bg-transparent text-mist hover:text-bone hover:bg-white/5 disabled:text-slate',
  outline:
    'bg-transparent text-bone border border-hair hover:border-lime-700 hover:bg-white/5',
  danger:
    'bg-transparent text-error border border-error/40 hover:bg-error/10',
};

const SIZES = {
  sm: 'min-h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'min-h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'min-h-13 px-7 text-base gap-2.5 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2
        active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg text-mist transition-colors duration-150
        hover:text-bone hover:bg-white/8 active:scale-95
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2
        disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Chip({ active, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2
        ${
          active
            ? 'bg-lime text-navy border-lime'
            : 'bg-white/4 text-mist border-hair hover:border-lime-700 hover:text-bone'
        } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-surface/70 border border-hair rounded-2xl backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Label({ children, hint, htmlFor }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-mist">
        {children}
      </label>
      {hint && <span className="text-xs text-slate nums-tabular">{hint}</span>}
    </div>
  );
}

const FIELD = `w-full bg-ink/60 border border-hair rounded-xl px-4 py-3 text-sm text-bone
  placeholder:text-slate transition-colors duration-150
  focus:border-lime-700 focus:outline-none focus:ring-2 focus:ring-lime/20`;

export function Input({ className = '', ...props }) {
  return <input className={`${FIELD} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${FIELD} resize-y leading-relaxed ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`${FIELD} appearance-none cursor-pointer bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%238B939C" stroke-width="2" stroke-linecap="round"><path d="m4 6 4 4 4-4"/></svg>')] bg-no-repeat bg-[right_1rem_center] pr-10 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2 rounded-lg"
    >
      <span
        className={`mt-0.5 shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${
          checked ? 'bg-lime' : 'bg-navy-600'
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-bone">{label}</span>
        {description && (
          <span className="block text-xs text-gray mt-0.5">{description}</span>
        )}
      </span>
    </button>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-mist">{label}</span>
        <span className="text-xs text-lime nums-tabular">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        className="range w-full"
        style={{
          '--track': `linear-gradient(90deg, var(--color-lime) ${pct}%, var(--color-navy-600) ${pct}%)`,
        }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[88vh] overflow-y-auto
          bg-surface border border-hair rounded-t-2xl sm:rounded-2xl shadow-2xl`}
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 px-6 py-4 bg-surface/95 backdrop-blur border-b border-hair">
          <h2 className="font-serif text-xl text-bone">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="w-9 h-9 -mr-2">
            <Close />
          </IconButton>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Animated bars that mark the currently playing row. */
export function Equaliser({ className = '' }) {
  return (
    <span className={`flex items-end gap-[2px] h-3.5 ${className}`} aria-hidden="true">
      {[0, 0.3, 0.15, 0.45].map((delay, i) => (
        <span
          key={i}
          className="eq-bar w-[2px] h-full bg-lime rounded-full"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}
