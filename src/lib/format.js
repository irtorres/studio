export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Suno deletes generated files 15 days after creation. */
export const RETENTION_DAYS = 15;

export function daysLeft(createdAt) {
  const elapsed = (Date.now() - createdAt) / 86400000;
  return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed));
}

export function expiryLabel(track) {
  if (track.cached) return 'Saved offline';
  const left = daysLeft(track.createdAt);
  if (left <= 0) return 'Expired on Suno';
  if (left === 1) return 'Expires tomorrow';
  return `Expires in ${left} days`;
}

export function expiryTone(track) {
  if (track.cached) return 'safe';
  const left = daysLeft(track.createdAt);
  if (left <= 0) return 'gone';
  if (left <= 3) return 'urgent';
  return 'normal';
}

export function tagList(tags) {
  if (!tags) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
}

/** Turn a title into something safe for a filesystem. */
export function slugify(text, fallback = 'track') {
  const s = (text || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return s || fallback;
}

export function relativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
