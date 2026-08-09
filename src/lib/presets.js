/** Starting points, so the composer is never a blank page. */

export const GENRES = [
  'Lo-fi hip hop',
  'Indie folk',
  'Synthwave',
  'Deep house',
  'Soul / R&B',
  'Acoustic pop',
  'Cinematic orchestral',
  'Bossa nova',
  'Punk rock',
  'Ambient',
  'Reggaeton',
  'Jazz trio',
  'Gospel choir',
  'Drum & bass',
  'Country ballad',
  'Afrobeat',
];

export const MOODS = [
  'Uplifting',
  'Melancholy',
  'Dreamy',
  'Aggressive',
  'Romantic',
  'Nostalgic',
  'Triumphant',
  'Eerie',
  'Playful',
  'Hypnotic',
];

export const IDEAS = [
  {
    title: 'Late Night Drive',
    prompt:
      'A dreamy synthwave track for driving through a city at 2am — warm analog pads, a steady heartbeat bassline, and distant reverb-soaked vocals about missing someone.',
    style: 'Synthwave, dreamy, retro',
  },
  {
    title: 'Coffee Shop Morning',
    prompt:
      'A gentle indie folk song about slow mornings and second chances. Fingerpicked acoustic guitar, brushed drums, soft male vocals, warm and unhurried.',
    style: 'Indie folk, acoustic, warm',
  },
  {
    title: 'Deadline Panic',
    prompt:
      'High-energy drum & bass with frantic breakbeats, a growling reece bass, and no vocals. Builds relentlessly, made for working against the clock.',
    style: 'Drum & bass, frantic, instrumental',
  },
  {
    title: 'Sunday Kind of Love',
    prompt:
      'A slow soul ballad with Rhodes piano, a walking bassline, lush horns and a powerhouse female vocal about a love that finally feels easy.',
    style: 'Soul, R&B, vintage',
  },
  {
    title: 'The Long Way Home',
    prompt:
      'Cinematic orchestral piece that starts with a lone piano and swells into strings and timpani — the sound of finally arriving somewhere.',
    style: 'Cinematic orchestral, epic, instrumental',
  },
  {
    title: 'Rooftop in July',
    prompt:
      'Sun-drenched afrobeat with bright guitar licks, layered percussion and a chanted group hook about dancing until the sun comes up.',
    style: 'Afrobeat, summery, danceable',
  },
];

/** Things people commonly want to keep *out* of a track. */
export const NEGATIVE_PRESETS = [
  'Heavy metal',
  'Autotune',
  'Distorted guitar',
  'Aggressive drums',
  'Spoken word',
  'Children’s choir',
];
