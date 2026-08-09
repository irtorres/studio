/**
 * Suno API client (https://docs.sunoapi.org).
 *
 * The API sets `access-control-allow-origin` to the calling origin, so every
 * request here runs straight from the browser — no backend, no proxy.
 *
 * Every generation endpoint marks `callBackUrl` as required, but we have no
 * server to receive a webhook. The docs sanction the alternative: poll
 * `record-info` instead. We send a placeholder URL and never rely on it.
 */

const BASE = 'https://api.sunoapi.org/api/v1';

// Required by the schema, never actually called — we poll instead. Uses the
// IANA-reserved example.com so it can never resolve to a real endpoint.
const CALLBACK_PLACEHOLDER = 'https://example.com/suno-callback-unused';

const KEY_STORAGE = 'avanzo.apiKey';

export function getApiKey() {
  return (
    localStorage.getItem(KEY_STORAGE) ||
    import.meta.env.VITE_SUNO_API_KEY ||
    ''
  );
}

export function setApiKey(key) {
  if (key) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

export function hasApiKey() {
  return Boolean(getApiKey());
}

/** Documented status codes, turned into something a human can act on. */
const CODE_MESSAGES = {
  400: 'Invalid parameters — check the prompt, style and title lengths.',
  401: 'Unauthorized. That API key was rejected — check it in Settings.',
  404: 'Endpoint not found.',
  405: 'Rate limit exceeded. Wait a moment and try again.',
  413: 'Your prompt or style description is too long for this model.',
  429: 'Insufficient credits. Top up your balance at sunoapi.org.',
  430: 'Too many requests too quickly. Wait a few seconds and retry.',
  455: 'Suno is in system maintenance. Try again shortly.',
  500: 'Suno had a server error. Try again.',
};

export class SunoError extends Error {
  constructor(code, message) {
    super(message || CODE_MESSAGES[code] || `Request failed (${code})`);
    this.name = 'SunoError';
    this.code = code;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const key = getApiKey();
  if (!key) throw new SunoError(401, 'No API key set. Add one in Settings.');

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new SunoError(0, 'Network error — could not reach the Suno API.');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new SunoError(res.status, `Unexpected response (HTTP ${res.status}).`);
  }

  // The API returns HTTP 200 with a non-200 `code` for most failures.
  if (json.code !== 200) {
    throw new SunoError(json.code ?? res.status, json.msg);
  }
  return json.data;
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export function getCredits() {
  return request('/generate/credit');
}

/* ------------------------------------------------------------------ */
/* Music generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Kick off a generation. Returns a taskId.
 *
 * Simple mode  (customMode: false): only `prompt` (<=500 chars) is used and
 *   lyrics are written for you. Every other creative field must be omitted.
 * Custom mode  (customMode: true): `style` + `title` required, and `prompt`
 *   is used verbatim as the lyrics unless `instrumental` is true.
 */
export function generateMusic(options) {
  const {
    prompt,
    style,
    title,
    customMode = false,
    instrumental = false,
    model = 'V4_5ALL',
    negativeTags,
    vocalGender,
    styleWeight,
    weirdnessConstraint,
    duration,
  } = options;

  const body = {
    customMode,
    instrumental,
    model,
    callBackUrl: CALLBACK_PLACEHOLDER,
  };

  if (customMode) {
    body.style = style;
    body.title = title;
    // In custom mode an instrumental track takes no prompt at all.
    if (!instrumental && prompt) body.prompt = prompt;
    if (negativeTags) body.negativeTags = negativeTags;
    if (!instrumental && vocalGender) body.vocalGender = vocalGender;
    if (typeof styleWeight === 'number') body.styleWeight = styleWeight;
    if (typeof weirdnessConstraint === 'number') {
      body.weirdnessConstraint = weirdnessConstraint;
    }
    // Exact duration is a V5_5-only, custom-mode-only capability.
    if (model === 'V5_5' && typeof duration === 'number') {
      body.duration = Math.round(duration);
    }
  } else {
    // Non-custom mode: the docs are explicit that everything else stays empty.
    body.prompt = prompt;
  }

  return request('/generate', { method: 'POST', body });
}

/** Continue an existing track from a given second. */
export function extendMusic({
  audioId,
  model,
  continueAt,
  prompt,
  style,
  title,
  instrumental = false,
}) {
  const body = {
    audioId,
    model,
    defaultParamFlag: true,
    instrumental,
    continueAt,
    style,
    title,
    callBackUrl: CALLBACK_PLACEHOLDER,
  };
  if (!instrumental && prompt) body.prompt = prompt;
  return request('/generate/extend', { method: 'POST', body });
}

export function getTaskDetails(taskId) {
  return request(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
}

/* ------------------------------------------------------------------ */
/* Lyrics                                                              */
/* ------------------------------------------------------------------ */

export function generateLyrics(prompt) {
  return request('/lyrics', {
    method: 'POST',
    body: { prompt, callBackUrl: CALLBACK_PLACEHOLDER },
  });
}

export function getLyricsTask(taskId) {
  return request(`/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`);
}

/** Per-word timings + waveform peaks, for karaoke display and the scrubber. */
export function getTimestampedLyrics(taskId, audioId) {
  return request('/generate/get-timestamped-lyrics', {
    method: 'POST',
    body: { taskId, audioId },
  });
}

/* ------------------------------------------------------------------ */
/* Style                                                               */
/* ------------------------------------------------------------------ */

/** Expands a terse style ("Pop, mysterious") into a rich prompt. Synchronous. */
export function boostStyle(content) {
  return request('/style/generate', { method: 'POST', body: { content } });
}

/* ------------------------------------------------------------------ */
/* Polling                                                             */
/* ------------------------------------------------------------------ */

const TERMINAL_FAILURES = [
  'CREATE_TASK_FAILED',
  'GENERATE_AUDIO_FAILED',
  'GENERATE_LYRICS_FAILED',
  'CALLBACK_EXCEPTION',
  'SENSITIVE_WORD_ERROR',
];

const FAILURE_COPY = {
  SENSITIVE_WORD_ERROR:
    'Your prompt tripped Suno’s content filter. Try rewording it.',
  GENERATE_AUDIO_FAILED: 'Suno failed to render the audio. Try again.',
  CREATE_TASK_FAILED: 'Suno could not start the task. Try again.',
  CALLBACK_EXCEPTION: 'The task errored while finishing up.',
  GENERATE_LYRICS_FAILED: 'Suno failed to write the lyrics. Try again.',
};

export function isFailure(status) {
  return TERMINAL_FAILURES.includes(status);
}

export function failureMessage(status, fallback) {
  return FAILURE_COPY[status] || fallback || 'Generation failed.';
}

/**
 * Poll a music task until it succeeds or fails.
 *
 * `onUpdate` fires on every poll so the UI can react to the intermediate
 * states: TEXT_SUCCESS (lyrics exist) and FIRST_SUCCESS (a streamable track
 * exists) both arrive well before SUCCESS.
 *
 * Streaming audio is playable ~30-40s in; the final MP3 takes 2-3 min.
 */
export async function pollTask(taskId, { onUpdate, signal, intervalMs = 5000, timeoutMs = 600000 } = {}) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const data = await getTaskDetails(taskId);
    onUpdate?.(data);

    if (data.status === 'SUCCESS') return data;
    if (isFailure(data.status)) {
      throw new SunoError(
        data.errorCode ?? 500,
        failureMessage(data.status, data.errorMessage),
      );
    }

    await sleep(intervalMs, signal);
  }
  throw new SunoError(0, 'Generation timed out after 10 minutes.');
}

export async function pollLyricsTask(taskId, { signal, intervalMs = 3000, timeoutMs = 180000 } = {}) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const data = await getLyricsTask(taskId);
    if (data.status === 'SUCCESS') return data.response?.data ?? [];
    if (isFailure(data.status)) {
      throw new SunoError(
        data.errorCode ?? 500,
        failureMessage(data.status, data.errorMessage),
      );
    }
    await sleep(intervalMs, signal);
  }
  throw new SunoError(0, 'Lyrics generation timed out.');
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/* ------------------------------------------------------------------ */
/* Model metadata                                                      */
/* ------------------------------------------------------------------ */

export const MODELS = [
  { id: 'V5', label: 'v5', blurb: 'Best musicality, fastest', maxMin: 8 },
  { id: 'V5_5', label: 'v5.5', blurb: 'Exact duration control', maxMin: 6 },
  { id: 'V4_5ALL', label: 'v4.5 All', blurb: 'Best song structure', maxMin: 8 },
  { id: 'V4_5PLUS', label: 'v4.5+', blurb: 'Richest sound', maxMin: 8 },
  { id: 'V4_5', label: 'v4.5', blurb: 'Great genre blending', maxMin: 8 },
  { id: 'V4', label: 'v4', blurb: 'Cleanest audio, shorter', maxMin: 4 },
];

/** Character ceilings differ per model — the UI enforces these live. */
export function limitsFor(model) {
  const isV4 = model === 'V4';
  return {
    prompt: isV4 ? 3000 : 5000,
    simplePrompt: 500,
    style: isV4 ? 200 : 1000,
    title: model === 'V4' || model === 'V4_5ALL' ? 80 : 100,
  };
}

export function supportsDuration(model) {
  return model === 'V5_5';
}
