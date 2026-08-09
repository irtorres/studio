import { useEffect, useState } from 'react';
import { Button, Input, Label, Modal, Spinner } from './ui';
import { Check, Warning } from './Icons';
import { getApiKey, getCredits, setApiKey } from '../lib/suno';
import { cacheSize, clearAudioCache, formatBytes } from '../lib/storage';

export default function SettingsModal({ open, onClose, onKeyChange, onNotify, stats }) {
  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!open) return;
    setKey(getApiKey());
    setResult(null);
    cacheSize().then(setSize).catch(() => {});
  }, [open]);

  const verify = async () => {
    setChecking(true);
    setResult(null);
    const previous = getApiKey();
    setApiKey(key);
    try {
      const credits = await getCredits();
      setResult({ ok: true, credits });
      onKeyChange();
      onNotify('API key saved and verified.', 'success');
    } catch (err) {
      setApiKey(previous);
      setResult({ ok: false, message: err.message });
    } finally {
      setChecking(false);
    }
  };

  const clearCache = async () => {
    await clearAudioCache();
    setSize(await cacheSize().catch(() => 0));
    onKeyChange();
    onNotify('Offline audio cache cleared.', 'success');
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-7">
        {/* API key ------------------------------------------------------ */}
        <section>
          <Label htmlFor="apikey">Suno API key</Label>
          <div className="flex gap-2">
            <Input
              id="apikey"
              type="password"
              autoComplete="off"
              spellCheck="false"
              placeholder="Paste your key from sunoapi.org"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <Button onClick={verify} disabled={checking || !key.trim()} className="shrink-0">
              {checking ? <Spinner /> : 'Verify'}
            </Button>
          </div>

          {result?.ok && (
            <p className="mt-2 text-sm text-success inline-flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Working — {result.credits} credits available.
            </p>
          )}
          {result && !result.ok && (
            <p className="mt-2 text-sm text-error inline-flex items-start gap-1.5">
              <Warning className="w-4 h-4 shrink-0 mt-0.5" />
              {result.message}
            </p>
          )}

          <p className="mt-3 text-xs text-gray leading-relaxed">
            Your key is stored in this browser’s local storage and sent straight
            to Suno — it never passes through any server of ours. Anyone with
            access to this browser can read it, so use a key you can rotate.
            Get one at{' '}
            <a
              href="https://sunoapi.org/api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime hover:underline"
            >
              sunoapi.org/api-key
            </a>
            .
          </p>
        </section>

        {/* Storage ------------------------------------------------------ */}
        <section className="pt-6 border-t border-hair">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mist mb-3">
            Offline library
          </h3>
          <dl className="grid grid-cols-3 gap-3 mb-4">
            {[
              ['Tracks', stats.total],
              ['Saved offline', stats.cached],
              ['Storage used', formatBytes(size)],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-ink/50 border border-hair rounded-xl">
                <dt className="text-[11px] text-gray">{label}</dt>
                <dd className="text-lg font-semibold text-bone nums-tabular mt-0.5">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-gray leading-relaxed mb-3">
            Suno deletes generated files 15 days after they’re made. Downloading
            a track also caches it here, which is what keeps it playable after
            that window closes.
          </p>
          <Button variant="danger" size="sm" onClick={clearCache}>
            Clear offline audio
          </Button>
        </section>

        {/* Shortcuts ---------------------------------------------------- */}
        <section className="pt-6 border-t border-hair">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mist mb-3">
            Keyboard shortcuts
          </h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Space', 'Play / pause'],
              ['← / →', 'Skip 5 seconds'],
              ['Shift + ← / →', 'Previous / next track'],
              ['↑ / ↓', 'Volume'],
              ['M', 'Mute'],
            ].map(([keys, action]) => (
              <div key={keys} className="flex items-center justify-between gap-4">
                <dt className="text-gray">{action}</dt>
                <dd>
                  <kbd className="px-2 py-1 text-[11px] font-medium bg-ink border border-hair rounded-md text-mist">
                    {keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Modal>
  );
}
