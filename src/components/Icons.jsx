/* Single-source icon set. 24x24 grid, stroke-based, inherits currentColor. */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Play = (p) => (
  <svg {...base} {...p}>
    <path d="M6 4.5v15l13-7.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const Pause = (p) => (
  <svg {...base} {...p}>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const SkipNext = (p) => (
  <svg {...base} {...p}>
    <path d="M6 5.5v13l9-6.5z" fill="currentColor" stroke="none" />
    <rect x="16.5" y="5.5" width="2.5" height="13" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const SkipPrev = (p) => (
  <svg {...base} {...p}>
    <path d="M18 5.5v13L9 12z" fill="currentColor" stroke="none" />
    <rect x="5" y="5.5" width="2.5" height="13" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const Download = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" />
    <path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
  </svg>
);

export const Heart = ({ filled, ...p }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 5.15-7 9.5-7 9.5z" />
  </svg>
);

export const Volume = ({ level = 1, ...p }) => (
  <svg {...base} {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19z" fill="currentColor" stroke="none" />
    {level > 0 && <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />}
    {level > 0.5 && <path d="M17.5 7a7 7 0 0 1 0 10" />}
  </svg>
);

export const Muted = (p) => (
  <svg {...base} {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19z" fill="currentColor" stroke="none" />
    <path d="m15.5 10 5 4m0-4-5 4" />
  </svg>
);

export const Sparkle = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.7L12 18l-1.7-5.6L5 10.7 10.3 9z" />
    <path d="M18.5 3.5v3M20 5h-3" />
  </svg>
);

export const Trash = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" />
  </svg>
);

export const Settings = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
);

export const Search = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const Close = (p) => (
  <svg {...base} {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const Music = (p) => (
  <svg {...base} {...p}>
    <path d="M9 18V6l11-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </svg>
);

export const Remix = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h4l3 10h5" />
    <path d="M4 17h4l1.5-5" />
    <path d="m17 4 3 3-3 3M17 14l3 3-3 3" />
  </svg>
);

export const Lyrics = (p) => (
  <svg {...base} {...p}>
    <path d="M4 6h11M4 11h16M4 16h9" />
    <circle cx="18.5" cy="17" r="2.5" />
    <path d="M21 17V9" />
  </svg>
);

export const Extend = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12h13" />
    <path d="m12 7 5 5-5 5" />
    <path d="M21 5v14" />
  </svg>
);

export const Copy = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15" />
  </svg>
);

export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Warning = (p) => (
  <svg {...base} {...p}>
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 16.5v.5" />
  </svg>
);

export const Offline = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v9m0 0 3.5-3.5M12 12 8.5 8.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
  </svg>
);

export const Plus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Image = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m4 17 5-4 3.5 3 3-2.5L20 17" />
  </svg>
);
