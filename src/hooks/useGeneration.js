import { useCallback, useEffect, useRef, useState } from 'react';
import { generateMusic, getTaskDetails, isFailure, pollTask, SunoError } from '../lib/suno';
import { toTrack } from './useLibrary';

const JOBS_KEY = 'avanzo.activeJobs';

/**
 * Generation stages, derived from the documented status ladder:
 *   PENDING → TEXT_SUCCESS → FIRST_SUCCESS → SUCCESS
 *
 * These map to something the user actually understands, and let us surface
 * lyrics and a playable stream long before the final files land.
 */
export const STAGES = [
  { key: 'queued', label: 'Queued', hint: 'Suno is picking up the request' },
  { key: 'writing', label: 'Writing lyrics', hint: 'Shaping words and structure' },
  { key: 'composing', label: 'Composing', hint: 'First track is rendering' },
  { key: 'mastering', label: 'Mastering', hint: 'Finishing both versions' },
];

function stageFor(status) {
  switch (status) {
    case 'TEXT_SUCCESS':
      return 'composing';
    case 'FIRST_SUCCESS':
      return 'mastering';
    case 'SUCCESS':
      return 'done';
    case 'PENDING':
    default:
      return 'queued';
  }
}

/**
 * Manages in-flight generations. Jobs are persisted to localStorage so a
 * page refresh mid-generation picks polling back up instead of losing the
 * task (and the credits already spent on it).
 */
export function useGeneration({ onTracks }) {
  const [jobs, setJobs] = useState([]);
  const controllers = useRef(new Map());
  const onTracksRef = useRef(onTracks);
  onTracksRef.current = onTracks;

  const patchJob = useCallback((taskId, patch) => {
    setJobs((prev) =>
      prev.map((j) => (j.taskId === taskId ? { ...j, ...patch } : j)),
    );
  }, []);

  /** Persist just enough to resume polling after a refresh. */
  useEffect(() => {
    const resumable = jobs
      .filter((j) => j.stage !== 'done' && !j.error)
      .map((j) => ({ taskId: j.taskId, title: j.title, meta: j.meta, startedAt: j.startedAt }));
    localStorage.setItem(JOBS_KEY, JSON.stringify(resumable));
  }, [jobs]);

  const watch = useCallback(
    async (taskId, meta) => {
      const controller = new AbortController();
      controllers.current.set(taskId, controller);

      try {
        await pollTask(taskId, {
          signal: controller.signal,
          onUpdate: (data) => {
            const stage = stageFor(data.status);
            const raw = data.response?.sunoData ?? [];
            patchJob(taskId, {
              stage,
              status: data.status,
              // Partial results stream in — show them as soon as they exist.
              tracks: raw.map((r) => toTrack(r, meta)),
            });

            // Push playable tracks to the library the moment they appear, so
            // a closed tab or a failed later stage never loses a finished song.
            if (raw.length) {
              onTracksRef.current?.(raw.map((r) => toTrack(r, meta)));
            }
          },
        });
        patchJob(taskId, { stage: 'done', completedAt: Date.now() });
      } catch (err) {
        if (err.name === 'AbortError') return;
        patchJob(taskId, {
          error: err.message || 'Generation failed.',
          stage: 'failed',
        });
      } finally {
        controllers.current.delete(taskId);
      }
    },
    [patchJob],
  );

  /** Resume anything that was mid-flight when the page last closed. */
  useEffect(() => {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
    } catch {
      return;
    }
    if (!Array.isArray(raw) || raw.length === 0) return;

    // Drop anything older than the 10-minute polling ceiling.
    const fresh = raw.filter((j) => Date.now() - (j.startedAt || 0) < 600000);
    if (!fresh.length) {
      localStorage.removeItem(JOBS_KEY);
      return;
    }

    setJobs(
      fresh.map((j) => ({
        ...j,
        stage: 'queued',
        tracks: [],
        resumed: true,
      })),
    );
    for (const j of fresh) watch(j.taskId, j.meta || {});
  }, [watch]);

  const start = useCallback(
    async (options) => {
      const label = options.title || options.prompt?.slice(0, 60) || 'New song';

      // Optimistic placeholder so the UI reacts instantly.
      const pending = {
        taskId: `pending-${Date.now()}`,
        title: label,
        stage: 'queued',
        tracks: [],
        startedAt: Date.now(),
        submitting: true,
      };
      setJobs((prev) => [pending, ...prev]);

      try {
        const data = await generateMusic(options);
        const taskId = data.taskId;
        const meta = {
          taskId,
          model: options.model,
          sourcePrompt: options.prompt,
          params: options,
        };

        setJobs((prev) =>
          prev.map((j) =>
            j.taskId === pending.taskId
              ? { ...j, taskId, meta, submitting: false }
              : j,
          ),
        );

        watch(taskId, meta);
        return taskId;
      } catch (err) {
        setJobs((prev) =>
          prev.map((j) =>
            j.taskId === pending.taskId
              ? {
                  ...j,
                  submitting: false,
                  stage: 'failed',
                  error:
                    err instanceof SunoError
                      ? err.message
                      : 'Could not start generation.',
                }
              : j,
          ),
        );
        throw err;
      }
    },
    [watch],
  );

  const dismiss = useCallback((taskId) => {
    controllers.current.get(taskId)?.abort();
    controllers.current.delete(taskId);
    setJobs((prev) => prev.filter((j) => j.taskId !== taskId));
  }, []);

  /** Manual re-check, for when someone is impatient. */
  const refresh = useCallback(
    async (taskId) => {
      try {
        const data = await getTaskDetails(taskId);
        const raw = data.response?.sunoData ?? [];
        patchJob(taskId, {
          stage: stageFor(data.status),
          status: data.status,
          tracks: raw.map((r) => toTrack(r, { taskId })),
          ...(isFailure(data.status) ? { error: data.errorMessage } : {}),
        });
        if (raw.length) onTracksRef.current?.(raw.map((r) => toTrack(r, { taskId })));
      } catch {
        /* leave the existing state alone */
      }
    },
    [patchJob],
  );

  useEffect(() => {
    const map = controllers.current;
    return () => {
      for (const c of map.values()) c.abort();
      map.clear();
    };
  }, []);

  const active = jobs.filter((j) => j.stage !== 'done' && j.stage !== 'failed');

  return { jobs, active, start, dismiss, refresh };
}
