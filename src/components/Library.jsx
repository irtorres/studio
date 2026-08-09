import { useMemo, useState } from 'react';
import TrackCard from './TrackCard';
import { Chip, Input, Select } from './ui';
import { Music, Search } from './Icons';
import { tagList } from '../lib/format';

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => b.createdAt - a.createdAt },
  oldest: { label: 'Oldest first', fn: (a, b) => a.createdAt - b.createdAt },
  longest: { label: 'Longest', fn: (a, b) => b.duration - a.duration },
  title: { label: 'Title A–Z', fn: (a, b) => a.title.localeCompare(b.title) },
};

export default function Library({
  tracks,
  player,
  onFavorite,
  onDelete,
  onRemix,
  onLyrics,
  onCached,
  onNotify,
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks
      .filter((t) => {
        if (filter === 'favorites' && !t.favorite) return false;
        if (filter === 'offline' && !t.cached) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.tags?.toLowerCase().includes(q) ||
          t.lyrics?.toLowerCase().includes(q)
        );
      })
      .sort(SORTS[sort].fn);
  }, [tracks, query, filter, sort]);

  if (tracks.length === 0) {
    return (
      <div className="text-center py-16 px-6 border border-dashed border-hair rounded-2xl">
        <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-navy-700 text-navy-500 mb-4">
          <Music className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-xl text-bone mb-1.5">Nothing here yet</h3>
        <p className="text-sm text-gray max-w-sm mx-auto">
          Describe a song above and it’ll show up here. Everything you make is
          saved to this browser — download the ones you love to keep them
          permanently.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls -------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate pointer-events-none" />
          <Input
            type="search"
            placeholder="Search titles, tags, lyrics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 py-2.5"
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'favorites', label: 'Favourites' },
            { id: 'offline', label: 'Offline' },
          ].map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <Select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-auto py-2.5 text-xs"
        >
          {Object.entries(SORTS).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Quick tag filters */}
      <TagRail tracks={tracks} query={query} onPick={setQuery} />

      {/* Results --------------------------------------------------------- */}
      {visible.length === 0 ? (
        <p className="text-sm text-gray py-10 text-center">
          Nothing matches that. Try a different search or filter.
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              isCurrent={player.current?.id === track.id}
              isPlaying={player.playing}
              onPlay={(t) => player.play(t, visible)}
              onToggle={player.toggle}
              onFavorite={onFavorite}
              onDelete={onDelete}
              onRemix={onRemix}
              onLyrics={onLyrics}
              onCached={onCached}
              onNotify={onNotify}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** The most common tags across the library, as one-click filters. */
function TagRail({ tracks, query, onPick }) {
  const top = useMemo(() => {
    const counts = new Map();
    for (const t of tracks) {
      for (const tag of tagList(t.tags)) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [tracks]);

  if (top.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {top.map((tag) => (
        <Chip
          key={tag}
          active={query === tag}
          onClick={() => onPick(query === tag ? '' : tag)}
        >
          {tag}
        </Chip>
      ))}
    </div>
  );
}
