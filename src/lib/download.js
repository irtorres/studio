/**
 * Downloading cross-origin audio is the one genuinely awkward part of a
 * frontend-only build.
 *
 * Browsers ignore the `download` attribute on cross-origin links, so a plain
 * anchor navigates to the MP3 instead of saving it. The fix is to fetch the
 * bytes and save an object URL — which needs the CDN to allow the read.
 *
 * Strategy, in order:
 *   1. Use an already-cached blob (offline, instant, always works).
 *   2. fetch() the file directly and save the blob.
 *   3. Retry through the same-origin proxy path (vite dev proxy / Netlify
 *      redirect) for when the CDN withholds CORS headers.
 *   4. Give up gracefully and open the file in a new tab so the user can
 *      still save it manually.
 */

import { getAudio, putAudio } from './storage';
import { slugify } from './format';

/** Rewrites a Suno CDN URL onto our own origin so CORS stops applying. */
export function toProxyUrl(url) {
  try {
    const u = new URL(url);
    return `/cdn-audio${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

async function fetchBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/**
 * Resolve a track's audio as a Blob, caching it for offline use.
 * Returns null if every strategy fails.
 */
export async function resolveBlob(track, { onProgress } = {}) {
  const cached = await getAudio(track.id).catch(() => null);
  if (cached) return cached;

  onProgress?.('fetching');

  let blob = null;
  try {
    blob = await fetchBlob(track.audioUrl);
  } catch {
    const proxied = toProxyUrl(track.audioUrl);
    if (proxied) {
      try {
        blob = await fetchBlob(proxied);
      } catch {
        blob = null;
      }
    }
  }

  if (blob) {
    await putAudio(track.id, blob).catch(() => {});
  }
  return blob;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Download a track to disk. Resolves to a status the UI can report honestly:
 * 'saved' | 'opened' (fallback — user must save manually) | 'failed'.
 */
export async function downloadTrack(track, { onProgress } = {}) {
  const filename = `${slugify(track.title, 'studio-track')}.mp3`;

  const blob = await resolveBlob(track, { onProgress });
  if (blob) {
    saveBlob(blob, filename);
    return 'saved';
  }

  // Last resort: hand the raw URL to the browser.
  const opened = window.open(track.audioUrl, '_blank', 'noopener,noreferrer');
  return opened ? 'opened' : 'failed';
}

/** Save the cover art alongside the audio. */
export async function downloadImage(track) {
  if (!track.imageUrl) return 'failed';
  const filename = `${slugify(track.title, 'studio-track')}.jpg`;
  try {
    const blob = await fetchBlob(track.imageUrl);
    saveBlob(blob, filename);
    return 'saved';
  } catch {
    const opened = window.open(track.imageUrl, '_blank', 'noopener,noreferrer');
    return opened ? 'opened' : 'failed';
  }
}

export function downloadText(text, filename) {
  saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
  return 'saved';
}
