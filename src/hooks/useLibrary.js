import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cachedIds,
  deleteAudio,
  loadLibrary,
  saveLibrary,
} from '../lib/storage';

/**
 * The library is the source of truth for every track the user has made.
 * Suno's own copies vanish after 15 days, so this — plus the IndexedDB blob
 * cache — is what makes the collection durable.
 */
export function useLibrary() {
  const [tracks, setTracks] = useState(() => loadLibrary());

  // Reconcile the `cached` flag with what's actually in IndexedDB, in case a
  // cache was cleared by the browser behind our back.
  useEffect(() => {
    let alive = true;
    cachedIds()
      .then((ids) => {
        if (!alive) return;
        setTracks((prev) => {
          let changed = false;
          const next = prev.map((t) => {
            const cached = ids.has(t.id);
            if (cached !== Boolean(t.cached)) {
              changed = true;
              return { ...t, cached };
            }
            return t;
          });
          return changed ? next : prev;
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    saveLibrary(tracks);
  }, [tracks]);

  const addTracks = useCallback((incoming) => {
    setTracks((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const track of incoming) {
        // Re-polling a task returns the same tracks with fuller data; merge
        // rather than duplicate, and never clobber user edits.
        const existing = byId.get(track.id);
        byId.set(track.id, existing ? { ...track, ...pickUserFields(existing) } : track);
      }
      return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    });
  }, []);

  const updateTrack = useCallback((id, patch) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }, []);

  const removeTrack = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    deleteAudio(id).catch(() => {});
  }, []);

  const toggleFavorite = useCallback((id) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)),
    );
  }, []);

  const stats = useMemo(
    () => ({
      total: tracks.length,
      favorites: tracks.filter((t) => t.favorite).length,
      cached: tracks.filter((t) => t.cached).length,
    }),
    [tracks],
  );

  return {
    tracks,
    addTracks,
    updateTrack,
    removeTrack,
    toggleFavorite,
    stats,
  };
}

/** Fields the user owns — these survive a refresh from the API. */
function pickUserFields(track) {
  const out = {};
  if (track.favorite) out.favorite = true;
  if (track.cached) out.cached = true;
  if (track.renamed) {
    out.renamed = true;
    out.title = track.title;
  }
  return out;
}

/** Normalise a Suno `sunoData` entry into our own track shape. */
export function toTrack(raw, meta = {}) {
  return {
    id: raw.id,
    taskId: meta.taskId,
    title: raw.title || 'Untitled',
    audioUrl: raw.audioUrl || raw.audio_url || '',
    streamUrl: raw.streamAudioUrl || raw.stream_audio_url || '',
    imageUrl: raw.imageUrl || raw.image_url || '',
    lyrics: raw.prompt || '',
    tags: raw.tags || '',
    model: raw.modelName || raw.model_name || meta.model || '',
    duration: raw.duration || 0,
    createdAt: raw.createTime ? Date.parse(raw.createTime) || Date.now() : Date.now(),
    sourcePrompt: meta.sourcePrompt || '',
    params: meta.params || null,
    favorite: false,
    cached: false,
  };
}
