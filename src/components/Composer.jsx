import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Select,
  Slider,
  Spinner,
  Textarea,
  Toggle,
} from './ui';
import { Lyrics, Sparkle } from './Icons';
import { GENRES, IDEAS, MOODS, NEGATIVE_PRESETS } from '../lib/presets';
import {
  MODELS,
  boostStyle,
  generateLyrics,
  limitsFor,
  pollLyricsTask,
  supportsDuration,
} from '../lib/suno';

const DEFAULTS = {
  mode: 'simple',
  prompt: '',
  lyrics: '',
  style: '',
  title: '',
  instrumental: false,
  model: 'V5',
  negativeTags: '',
  vocalGender: '',
  styleWeight: 0.65,
  weirdnessConstraint: 0.5,
  duration: 120,
};

export default function Composer({ onGenerate, busy, credits, onNotify, seed }) {
  const [form, setForm] = useState(DEFAULTS);
  const [advanced, setAdvanced] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [writingLyrics, setWritingLyrics] = useState(false);
  const [lyricOptions, setLyricOptions] = useState(null);
  const promptRef = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const limits = useMemo(() => limitsFor(form.model), [form.model]);

  // "Remix" hands us an existing track's parameters to start from.
  useEffect(() => {
    if (!seed) return;
    setForm({ ...DEFAULTS, ...seed });
    if (seed.mode === 'custom') setAdvanced(true);
    promptRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [seed]);

  const isCustom = form.mode === 'custom';

  /* ----------------------------------------------------------------- */
  /* Validation — mirrors the API's own required-field matrix           */
  /* ----------------------------------------------------------------- */
  const problems = [];
  if (isCustom) {
    if (!form.style.trim()) problems.push('Add a style.');
    if (!form.title.trim()) problems.push('Add a title.');
    if (!form.instrumental && !form.lyrics.trim()) {
      problems.push('Add lyrics, or switch on Instrumental.');
    }
    if (form.style.length > limits.style) problems.push('Style is too long.');
    if (form.title.length > limits.title) problems.push('Title is too long.');
    if (form.lyrics.length > limits.prompt) problems.push('Lyrics are too long.');
  } else {
    if (!form.prompt.trim()) problems.push('Describe the song you want.');
    if (form.prompt.length > limits.simplePrompt) {
      problems.push('Description is too long.');
    }
  }

  const noCredits = typeof credits === 'number' && credits <= 0;
  const canGenerate = problems.length === 0 && !busy && !noCredits;

  const submit = (e) => {
    e.preventDefault();
    if (!canGenerate) return;

    const options = isCustom
      ? {
          customMode: true,
          instrumental: form.instrumental,
          model: form.model,
          style: form.style.trim(),
          title: form.title.trim(),
          prompt: form.instrumental ? undefined : form.lyrics.trim(),
          negativeTags: form.negativeTags.trim() || undefined,
          vocalGender: form.vocalGender || undefined,
          styleWeight: form.styleWeight,
          weirdnessConstraint: form.weirdnessConstraint,
          duration: supportsDuration(form.model) ? form.duration : undefined,
        }
      : {
          customMode: false,
          instrumental: form.instrumental,
          model: form.model,
          prompt: form.prompt.trim(),
        };

    onGenerate(options);
  };

  /* ----------------------------------------------------------------- */
  /* Style boost — expands a terse style into a rich description        */
  /* ----------------------------------------------------------------- */
  const boost = async () => {
    const seedText = form.style.trim() || form.prompt.trim();
    if (!seedText) {
      onNotify('Write a rough style first, then boost it.', 'warning');
      return;
    }
    setBoosting(true);
    try {
      const data = await boostStyle(seedText);
      if (data?.result) {
        set({ style: data.result.slice(0, limits.style), mode: 'custom' });
        onNotify('Style expanded.', 'success');
      } else {
        onNotify('Boost returned nothing usable.', 'warning');
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setBoosting(false);
    }
  };

  /* ----------------------------------------------------------------- */
  /* Ask Suno to write the lyrics                                       */
  /* ----------------------------------------------------------------- */
  const writeLyrics = async () => {
    const idea = form.prompt.trim() || form.title.trim();
    if (!idea) {
      onNotify('Describe the song first — that becomes the lyric brief.', 'warning');
      return;
    }
    setWritingLyrics(true);
    setLyricOptions(null);
    try {
      // The lyrics endpoint caps the brief at 200 characters.
      const { taskId } = await generateLyrics(idea.slice(0, 200));
      const options = await pollLyricsTask(taskId);
      const usable = options.filter((o) => o.status === 'complete' && o.text);
      if (!usable.length) {
        onNotify('Suno did not return usable lyrics. Try rewording.', 'warning');
      } else {
        setLyricOptions(usable);
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setWritingLyrics(false);
    }
  };

  const applyLyricDraft = (option) => {
    set({
      mode: 'custom',
      lyrics: option.text,
      title: form.title || option.title || '',
    });
    setLyricOptions(null);
    onNotify('Lyrics loaded into Custom mode.', 'success');
  };

  const applyIdea = (idea) => {
    set({ mode: 'simple', prompt: idea.prompt, title: idea.title, style: idea.style });
    promptRef.current?.focus();
  };

  const appendChip = (field, value) => {
    const current = form[field];
    const parts = current.split(',').map((s) => s.trim()).filter(Boolean);
    const next = parts.includes(value)
      ? parts.filter((p) => p !== value)
      : [...parts, value];
    set({ [field]: next.join(', ') });
  };

  return (
    <Card className="p-6 sm:p-7">
      <form onSubmit={submit}>
        {/* Mode switch --------------------------------------------------- */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="inline-flex p-1 bg-ink/60 border border-hair rounded-xl">
            {[
              { id: 'simple', label: 'Describe it' },
              { id: 'custom', label: 'Write it myself' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set({ mode: m.id })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  form.mode === m.id
                    ? 'bg-lime text-navy'
                    : 'text-mist hover:text-bone'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <Select
            aria-label="Model"
            value={form.model}
            onChange={(e) => set({ model: e.target.value })}
            className="w-auto min-w-44 py-2 text-xs"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.blurb}
              </option>
            ))}
          </Select>
        </div>

        {/* Simple mode --------------------------------------------------- */}
        {!isCustom && (
          <div className="space-y-5">
            <div>
              <Label
                htmlFor="prompt"
                hint={`${form.prompt.length} / ${limits.simplePrompt}`}
              >
                What should it sound like?
              </Label>
              <Textarea
                id="prompt"
                ref={promptRef}
                rows={4}
                maxLength={limits.simplePrompt}
                placeholder="A dreamy synthwave track for driving through a city at 2am — warm analog pads, a steady heartbeat bassline, and distant reverb-soaked vocals about missing someone."
                value={form.prompt}
                onChange={(e) => set({ prompt: e.target.value })}
              />
              <p className="mt-2 text-xs text-gray">
                Suno writes the lyrics, title and cover art for you. Be specific
                about instruments, mood and tempo.
              </p>
            </div>

            <div>
              <Label>Need a starting point?</Label>
              <div className="flex flex-wrap gap-2">
                {IDEAS.map((idea) => (
                  <Chip key={idea.title} onClick={() => applyIdea(idea)}>
                    {idea.title}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom mode --------------------------------------------------- */}
        {isCustom && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" hint={`${form.title.length} / ${limits.title}`}>
                  Title
                </Label>
                <Input
                  id="title"
                  maxLength={limits.title}
                  placeholder="Late Night Drive"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="style" hint={`${form.style.length} / ${limits.style}`}>
                  Style
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="style"
                    maxLength={limits.style}
                    placeholder="Synthwave, dreamy, retro"
                    value={form.style}
                    onChange={(e) => set({ style: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={boost}
                    disabled={boosting}
                    title="Expand this into a richer style description"
                    className="shrink-0 px-3"
                  >
                    {boosting ? <Spinner /> : <Sparkle />}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Genres</Label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Chip
                    key={g}
                    active={form.style.includes(g)}
                    onClick={() => appendChip('style', g)}
                  >
                    {g}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label>Mood</Label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <Chip
                    key={m}
                    active={form.style.includes(m)}
                    onClick={() => appendChip('style', m)}
                  >
                    {m}
                  </Chip>
                ))}
              </div>
            </div>

            {!form.instrumental && (
              <div>
                <Label
                  htmlFor="lyrics"
                  hint={`${form.lyrics.length} / ${limits.prompt}`}
                >
                  Lyrics — sung exactly as written
                </Label>
                <Textarea
                  id="lyrics"
                  rows={10}
                  maxLength={limits.prompt}
                  placeholder={'[Verse]\nNeon bleeding on the windshield\nEvery exit looks like you\n\n[Chorus]\nI keep driving...'}
                  value={form.lyrics}
                  onChange={(e) => set({ lyrics: e.target.value })}
                  className="font-mono text-[13px]"
                />
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <p className="text-xs text-gray flex-1 min-w-48">
                    Use <code className="text-mist">[Verse]</code>,{' '}
                    <code className="text-mist">[Chorus]</code>,{' '}
                    <code className="text-mist">[Bridge]</code> to shape the structure.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={writeLyrics}
                    disabled={writingLyrics}
                  >
                    {writingLyrics ? <Spinner /> : <Lyrics />}
                    {writingLyrics ? 'Writing…' : 'Write them for me'}
                  </Button>
                </div>
              </div>
            )}

            {/* Lyric drafts to choose from */}
            {lyricOptions && (
              <div className="space-y-3 p-4 bg-ink/50 border border-lime-700/40 rounded-xl">
                <p className="text-sm font-semibold text-lime">
                  Pick a draft ({lyricOptions.length})
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lyricOptions.map((o, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyLyricDraft(o)}
                      className="text-left p-3 bg-surface border border-hair rounded-lg hover:border-lime-700 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-bone mb-1">
                        {o.title || `Draft ${i + 1}`}
                      </span>
                      <span className="block text-xs text-gray whitespace-pre-line line-clamp-6 leading-relaxed">
                        {o.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shared options ------------------------------------------------ */}
        <div className="mt-6 pt-5 border-t border-hair space-y-5">
          <Toggle
            checked={form.instrumental}
            onChange={(v) => set({ instrumental: v })}
            label="Instrumental"
            description="No vocals at all"
          />

          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            className="text-xs font-semibold uppercase tracking-wider text-mist hover:text-lime transition-colors"
          >
            {advanced ? '− Hide' : '+ Show'} advanced controls
          </button>

          {advanced && (
            <div className="space-y-5 p-4 bg-ink/40 border border-hair rounded-xl">
              <div>
                <Label htmlFor="negative">Exclude these</Label>
                <Input
                  id="negative"
                  placeholder="Heavy metal, autotune"
                  value={form.negativeTags}
                  onChange={(e) => set({ negativeTags: e.target.value })}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {NEGATIVE_PRESETS.map((n) => (
                    <Chip
                      key={n}
                      active={form.negativeTags.includes(n)}
                      onClick={() => appendChip('negativeTags', n)}
                    >
                      {n}
                    </Chip>
                  ))}
                </div>
              </div>

              {!form.instrumental && (
                <div>
                  <Label htmlFor="vocal">Vocal</Label>
                  <Select
                    id="vocal"
                    value={form.vocalGender}
                    onChange={(e) => set({ vocalGender: e.target.value })}
                  >
                    <option value="">Let Suno decide</option>
                    <option value="f">Female</option>
                    <option value="m">Male</option>
                  </Select>
                </div>
              )}

              <Slider
                label="Style adherence"
                min={0}
                max={1}
                step={0.05}
                value={form.styleWeight}
                onChange={(v) => set({ styleWeight: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                label="Experimentation"
                min={0}
                max={1}
                step={0.05}
                value={form.weirdnessConstraint}
                onChange={(v) => set({ weirdnessConstraint: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />

              {supportsDuration(form.model) && (
                <Slider
                  label="Exact length"
                  min={10}
                  max={360}
                  step={5}
                  value={form.duration}
                  onChange={(v) => set({ duration: v })}
                  format={(v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`}
                />
              )}

              {!supportsDuration(form.model) && (
                <p className="text-xs text-gray">
                  Exact length control is available on v5.5 only.
                </p>
              )}

              {!isCustom && (
                <p className="text-xs text-warning/90">
                  Advanced controls only apply in “Write it myself” mode — the
                  API ignores them otherwise.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit -------------------------------------------------------- */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={!canGenerate} className="flex-1 min-w-56">
            {busy ? <Spinner className="w-5 h-5" /> : <Sparkle />}
            {busy ? 'Generating…' : 'Generate 2 versions'}
          </Button>
          <p className="text-xs text-gray flex-1 min-w-44">
            Every request returns two takes. Playable in ~40 seconds,
            downloadable in 2–3 minutes.
          </p>
        </div>

        {noCredits && (
          <p className="mt-3 text-sm text-error">
            You’re out of credits. Top up at sunoapi.org to keep generating.
          </p>
        )}
        {!noCredits && problems.length > 0 && form.prompt.length + form.lyrics.length > 0 && (
          <p className="mt-3 text-sm text-warning">{problems[0]}</p>
        )}
      </form>
    </Card>
  );
}
