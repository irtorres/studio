# Studio

Describe a song, hear it in seconds. A frontend-only React app for generating
music with the [Suno API](https://docs.sunoapi.org), built to deploy on Netlify
as a static site.

## Why there's no backend

The Suno API reflects the calling origin in `access-control-allow-origin`, so
the browser can talk to it directly:

```
access-control-allow-origin: https://your-app.netlify.app
access-control-allow-methods: POST
access-control-allow-headers: authorization, content-type
```

Every generation endpoint marks `callBackUrl` as required, which would normally
force a server to receive the webhook. The docs sanction the alternative:
poll `GET /api/v1/generate/record-info` instead. We send a placeholder callback
URL and never rely on it.

## Getting started

```bash
npm install && npm run dev
```

Open the app, click **Settings**, and paste a key from
[sunoapi.org/api-key](https://sunoapi.org/api-key). It's stored in
`localStorage` and sent straight to Suno.

## API key handling — read this before deploying

The key must reach the browser to be usable, so there are two options:

1. **User-supplied (default, recommended).** Each visitor enters their own key
   in Settings. Nothing is baked into the bundle. This is the only safe way to
   deploy publicly.
2. **Build-time key** via `VITE_SUNO_API_KEY`. Vite inlines this into the
   JavaScript bundle, where **anyone can read it and drain your credits**. Use
   it for local development only.

If you want a public demo that "just works" with no setup, the key has to move
server-side — a small Netlify Edge Function that injects the `Authorization`
header is the minimal change. That's the one piece of server code worth adding.

## Features

**Creating**
- Two modes: describe it in plain language, or supply exact lyrics, style and title
- All six models, with character limits enforced live per model
- Instrumental toggle, negative tags, vocal gender, style adherence and
  experimentation sliders, and exact duration on v5.5
- **Boost style** — expands a terse style into a rich prompt via `/style/generate`
- **Write lyrics for me** — generates drafts to pick from before composing
- Genre, mood and idea presets

**Listening**
- Persistent bottom player that survives navigation
- Queue with auto-advance, seek, volume, and OS media-key support
- Keyboard shortcuts: space, arrows, shift+arrows, `M`
- Karaoke lyrics with per-word highlighting from the timestamped-lyrics
  endpoint; click any line to seek to it

**Keeping**
- Library with search across titles, tags and lyrics; filters and sorting
- Favourites, remix (reload a track's exact settings), delete, cover download
- **Offline caching in IndexedDB** — the important one, see below

## The 15-day problem

Suno deletes generated audio 15 days after creation. The library shows an
"Expires in N days" badge that turns amber at three days out.

Downloading a track also stores its blob in IndexedDB, so it stays playable
after Suno's copy is gone. That's what makes the library permanent rather than
a list of URLs that quietly rot.

## Downloads and CORS

Browsers ignore the `download` attribute on cross-origin URLs, so the app
fetches the audio and saves it as a blob. `src/lib/download.js` tries, in order:

1. An already-cached blob
2. A direct `fetch()` of the CDN URL
3. The same-origin proxy path `/cdn-audio/*` (Vite proxy in dev,
   `public/_redirects` on Netlify)
4. Opening the file in a new tab, with a toast telling the user to Save As

**The proxy host in `public/_redirects` and `vite.config.js` is a best guess
(`apiboxfiles.erweima.ai`) and is unverified** — no track has been generated on
this account yet. Once you generate one, check a track's `audioUrl` host and
update both files if it differs.

## Deploying to Netlify

Point Netlify at this repository. `netlify.toml` sets the build command,
publish directory, cache headers and security headers; `public/_redirects`
handles the SPA fallback and the audio proxy. No environment variables are
required — and you should not set `VITE_SUNO_API_KEY` on a public deploy.

## Project layout

```
src/
  lib/
    suno.js       API client, polling, error mapping, model metadata
    storage.js    localStorage library + IndexedDB blob cache
    download.js   the cross-origin download strategy
    format.js     time, expiry and slug helpers
    presets.js    genres, moods, starter ideas
  hooks/
    useLibrary.js   track collection, merge-on-refresh, user-field preservation
    usePlayer.js    the single shared <audio> element
    useGeneration.js concurrent jobs, staged progress, resume-after-refresh
  components/     UI
```

## Known limitations

- **Untested against a successful generation.** The account this was built
  against has 6.4 credits, which is below the cost of one generation
  (`code: 429`). Everything up to and including the API error path is verified;
  playback, download and karaoke sync are built to the documented response
  shapes but have not run against real audio.
- Extend, WAV export, stem separation, music video, personas and mashups are
  all available in the API but not yet surfaced in the UI.
- The library is per-browser. There's no account or sync.
- Browser storage keys are still prefixed `avanzo.*` internally (and the
  IndexedDB database is named `avanzo-studio`). These are deliberately left
  alone — renaming them would orphan any library, settings and API key already
  saved in a visitor's browser. They are never visible in the UI.
