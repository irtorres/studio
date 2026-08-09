import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudio } from '../lib/storage';

/**
 * A single long-lived <audio> element drives the whole app, so playback
 * survives navigating between the composer and the library.
 *
 * Source preference: cached blob (offline, instant) > final MP3 > stream URL.
 * The stream URL matters because it exists ~30-40s into a generation, long
 * before the downloadable file is ready.
 */
export function usePlayer() {
  const audioRef = useRef(null);
  if (audioRef.current === null && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const stored = Number(localStorage.getItem('avanzo.volume'));
    return Number.isFinite(stored) && stored > 0 ? stored : 0.8;
  });
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Object URLs for cached blobs must be revoked when we move on.
  const objectUrlRef = useRef(null);
  const revokePending = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  /* --------------------------------------------------------------- */
  /* Wire up the audio element                                        */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setError(null);
    };
    const onError = () => {
      setLoading(false);
      setError('Could not play this track. The file may have expired on Suno.');
      setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
    localStorage.setItem('avanzo.volume', String(volume));
  }, [volume, muted]);

  useEffect(() => revokePending, [revokePending]);

  /* --------------------------------------------------------------- */
  /* Controls                                                         */
  /* --------------------------------------------------------------- */

  const play = useCallback(
    async (track, upcoming) => {
      const audio = audioRef.current;
      if (!audio || !track) return;

      if (Array.isArray(upcoming)) setQueue(upcoming);

      // Same track — just resume.
      if (current?.id === track.id && audio.src) {
        try {
          await audio.play();
        } catch {
          /* user gesture required */
        }
        return;
      }

      setLoading(true);
      setError(null);
      setCurrent(track);
      setTime(0);
      setDuration(track.duration || 0);

      revokePending();

      let src = track.audioUrl || track.streamUrl;
      try {
        const blob = await getAudio(track.id);
        if (blob) {
          src = URL.createObjectURL(blob);
          objectUrlRef.current = src;
        }
      } catch {
        /* fall through to the network URL */
      }

      if (!src) {
        setLoading(false);
        setError('This track has no playable audio yet.');
        return;
      }

      audio.src = src;
      try {
        await audio.play();
      } catch {
        setLoading(false);
      }
    },
    [current, revokePending],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
    setTime(audio.currentTime);
  }, []);

  const skip = useCallback(
    (delta) => {
      const audio = audioRef.current;
      if (audio) seek(audio.currentTime + delta);
    },
    [seek],
  );

  const setVolume = useCallback((v) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
    setMuted(false);
  }, []);

  const index = current ? queue.findIndex((t) => t.id === current.id) : -1;
  const hasNext = index >= 0 && index < queue.length - 1;
  const hasPrev = index > 0;

  const next = useCallback(() => {
    if (hasNext) play(queue[index + 1], queue);
  }, [hasNext, index, play, queue]);

  const prev = useCallback(() => {
    // Match the usual convention: restart the track before stepping back.
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      seek(0);
      return;
    }
    if (hasPrev) play(queue[index - 1], queue);
  }, [hasPrev, index, play, queue, seek]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    revokePending();
    setCurrent(null);
    setPlaying(false);
    setTime(0);
  }, [revokePending]);

  // Auto-advance through the queue.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (hasNext) play(queue[index + 1], queue);
      else setPlaying(false);
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [hasNext, index, play, queue]);

  /* --------------------------------------------------------------- */
  /* Keyboard shortcuts                                               */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      // Never hijack typing.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }
      if (!current) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          toggle();
          break;
        case 'ArrowRight':
          if (e.shiftKey) next();
          else skip(5);
          break;
        case 'ArrowLeft':
          if (e.shiftKey) prev();
          else skip(-5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(volume - 0.05);
          break;
        case 'm':
          setMuted((m) => !m);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, toggle, skip, next, prev, setVolume, volume]);

  /* --------------------------------------------------------------- */
  /* OS media controls (lock screen, headphone buttons)               */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title,
      artist: 'Studio',
      album: current.tags || 'AI generated',
      artwork: current.imageUrl
        ? [{ src: current.imageUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    const handlers = [
      ['play', () => toggle()],
      ['pause', () => toggle()],
      ['previoustrack', () => prev()],
      ['nexttrack', () => next()],
    ];
    for (const [action, fn] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, fn);
      } catch {
        /* unsupported action */
      }
    }
  }, [current, toggle, next, prev]);

  return {
    current,
    queue,
    playing,
    time,
    duration,
    volume,
    muted,
    loading,
    error,
    hasNext,
    hasPrev,
    play,
    toggle,
    seek,
    skip,
    next,
    prev,
    stop,
    setVolume,
    setMuted,
    setQueue,
  };
}
