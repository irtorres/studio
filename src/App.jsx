import { useCallback, useEffect, useRef, useState } from 'react';
import Composer from './components/Composer';
import JobCard from './components/JobCard';
import Library from './components/Library';
import LyricsModal from './components/LyricsModal';
import PlayerBar from './components/PlayerBar';
import SettingsModal from './components/SettingsModal';
import Toasts from './components/Toasts';
import { Button, Card, IconButton } from './components/ui';
import { Music, Settings as SettingsIcon, Sparkle } from './components/Icons';
import { useGeneration } from './hooks/useGeneration';
import { useLibrary } from './hooks/useLibrary';
import { usePlayer } from './hooks/usePlayer';
import { getCredits, hasApiKey } from './lib/suno';

export default function App() {
  const { tracks, addTracks, updateTrack, removeTrack, toggleFavorite, stats } =
    useLibrary();
  const player = usePlayer();

  const [credits, setCredits] = useState(null);
  const [keySet, setKeySet] = useState(() => hasApiKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [seed, setSeed] = useState(null);
  const [toasts, setToasts] = useState([]);
  const libraryRef = useRef(null);

  /* ----------------------------------------------------------------- */
  /* Toasts                                                             */
  /* ----------------------------------------------------------------- */
  const notify = useCallback((message, tone = 'info') => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, tone === 'error' ? 8000 : 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ----------------------------------------------------------------- */
  /* Credits                                                            */
  /* ----------------------------------------------------------------- */
  const refreshCredits = useCallback(() => {
    if (!hasApiKey()) {
      setCredits(null);
      return;
    }
    getCredits()
      .then(setCredits)
      .catch(() => setCredits(null));
  }, []);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits, keySet]);

  /* ----------------------------------------------------------------- */
  /* Generation                                                         */
  /* ----------------------------------------------------------------- */
  const handleTracks = useCallback(
    (incoming) => {
      addTracks(incoming);
    },
    [addTracks],
  );

  const { jobs, active, start, dismiss } = useGeneration({ onTracks: handleTracks });

  const handleGenerate = useCallback(
    async (options) => {
      try {
        await start(options);
        notify('Generation started — two versions on the way.', 'success');
        // Credits are spent at submit time; reflect that promptly.
        setTimeout(refreshCredits, 3000);
      } catch (err) {
        notify(err.message, 'error');
      }
    },
    [start, notify, refreshCredits],
  );

  // Refresh credits when the last job finishes.
  const activeCount = active.length;
  const prevActive = useRef(activeCount);
  useEffect(() => {
    if (prevActive.current > 0 && activeCount === 0) refreshCredits();
    prevActive.current = activeCount;
  }, [activeCount, refreshCredits]);

  /* ----------------------------------------------------------------- */
  /* Track actions                                                      */
  /* ----------------------------------------------------------------- */
  const handleRemix = useCallback(
    (track) => {
      const p = track.params;
      setSeed(
        p
          ? {
              mode: p.customMode ? 'custom' : 'simple',
              prompt: p.customMode ? '' : p.prompt || '',
              lyrics: p.customMode ? p.prompt || '' : '',
              style: p.style || '',
              title: p.title ? `${p.title} (v2)` : '',
              instrumental: Boolean(p.instrumental),
              model: p.model || 'V5',
              negativeTags: p.negativeTags || '',
              vocalGender: p.vocalGender || '',
              styleWeight: p.styleWeight ?? 0.65,
              weirdnessConstraint: p.weirdnessConstraint ?? 0.5,
              duration: p.duration ?? 120,
              _t: Date.now(),
            }
          : {
              // Older tracks predate stored params — rebuild what we can.
              mode: 'custom',
              lyrics: track.lyrics || '',
              style: track.tags || '',
              title: `${track.title} (v2)`,
              _t: Date.now(),
            },
      );
      notify('Settings loaded into the composer.', 'success');
    },
    [notify],
  );

  const markCached = useCallback(
    (id) => updateTrack(id, { cached: true }),
    [updateTrack],
  );

  const handleDelete = useCallback(
    (id) => {
      if (player.current?.id === id) player.stop();
      removeTrack(id);
      notify('Track deleted.', 'info');
    },
    [player, removeTrack, notify],
  );

  const lowCredits = typeof credits === 'number' && credits > 0 && credits < 2;

  return (
    <div className="min-h-screen bg-studio">
      {/* Header ---------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-hair bg-ink/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-lime text-navy shrink-0">
              <Music className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-lg leading-tight text-bone truncate">
                Studio
              </h1>
              <p className="text-[11px] text-gray leading-tight hidden sm:block">
                Describe a song. Hear it in seconds.
              </p>
            </div>
          </div>

          {credits !== null && (
            <div
              className={`hidden sm:flex flex-col items-end leading-tight px-3 py-1.5 rounded-lg border ${
                lowCredits
                  ? 'border-warning/40 bg-warning/10'
                  : 'border-hair bg-white/4'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider text-gray">
                Credits
              </span>
              <span
                className={`text-sm font-semibold nums-tabular ${
                  lowCredits ? 'text-warning' : 'text-lime'
                }`}
              >
                {typeof credits === 'number' ? credits.toFixed(1) : '—'}
              </span>
            </div>
          )}

          <IconButton
            label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 shrink-0"
          >
            <SettingsIcon />
          </IconButton>
        </div>
      </header>

      <main
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8"
        style={{ paddingBottom: player.current ? '9rem' : '3rem' }}
      >
        {/* Onboarding when there's no key yet */}
        {!keySet ? (
          <Card className="p-8 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-lime/15 text-lime mb-4">
              <Sparkle className="w-7 h-7" />
            </span>
            <h2 className="font-serif text-2xl text-bone mb-2">
              Add your Suno API key to begin
            </h2>
            <p className="text-sm text-gray max-w-md mx-auto mb-6 leading-relaxed">
              Studio runs entirely in your browser and talks to Suno
              directly. Your key stays in this browser and never touches a
              server of ours.
            </p>
            <Button size="lg" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon /> Add API key
            </Button>
          </Card>
        ) : (
          <>
            <Composer
              onGenerate={handleGenerate}
              busy={active.some((j) => j.submitting)}
              credits={credits}
              onNotify={notify}
              seed={seed}
            />

            {/* In-flight generations */}
            {jobs.length > 0 && (
              <section className="mt-6 space-y-3">
                {jobs.map((job) => (
                  <JobCard
                    key={job.taskId}
                    job={job}
                    onDismiss={dismiss}
                    onPlay={(t, queue) => player.play(t, queue)}
                  />
                ))}
              </section>
            )}

            {/* Library */}
            <section ref={libraryRef} className="mt-10">
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="font-serif text-2xl text-bone">Your library</h2>
                {stats.total > 0 && (
                  <p className="text-xs text-gray nums-tabular">
                    {stats.total} track{stats.total === 1 ? '' : 's'}
                    {stats.cached > 0 && ` · ${stats.cached} offline`}
                  </p>
                )}
              </div>

              <Library
                tracks={tracks}
                player={player}
                onFavorite={toggleFavorite}
                onDelete={handleDelete}
                onRemix={handleRemix}
                onLyrics={setLyricsTrack}
                onCached={markCached}
                onNotify={notify}
              />
            </section>
          </>
        )}
      </main>

      <PlayerBar
        player={player}
        onFavorite={toggleFavorite}
        onLyrics={setLyricsTrack}
        onCached={markCached}
        onNotify={notify}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onKeyChange={() => {
          setKeySet(hasApiKey());
          refreshCredits();
        }}
        onNotify={notify}
        stats={stats}
      />

      <LyricsModal
        open={Boolean(lyricsTrack)}
        track={lyricsTrack}
        player={player}
        onClose={() => setLyricsTrack(null)}
        onNotify={notify}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
