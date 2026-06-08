import { articlesByLevel } from '../../data/articles';
import { LEVEL_CONFIGS } from '../../data/levels';
import type { Level } from '../../types';
import { toggleFavorite, useCompleted, useFavorite } from '../../lib/progress';

interface Props {
  level: Level;
  onOpen: (articleId: string) => void;
  onChangeLevel: () => void;
  onOpenMenu: () => void;
}

interface CardProps {
  id: string;
  title: string;
  description: string;
  wordCount: number;
  minutes: number;
  tags?: string[];
  onOpen: () => void;
}

function ArticleCard({ id, title, description, wordCount, minutes, tags, onOpen }: CardProps) {
  const favorited = useFavorite(id);
  const completed = useCompleted(id);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
          {completed && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
              <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Done
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.stopPropagation();
              void toggleFavorite(id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                void toggleFavorite(id);
              }
            }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
          >
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              fill={favorited ? '#d97706' : 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {minutes} min
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <p className="mt-2 text-xs text-slate-400">
        {wordCount} words
        {tags?.length ? ' · ' + tags.join(', ') : ''}
      </p>
    </button>
  );
}

export function ArticleList({ level, onOpen, onChangeLevel, onOpenMenu }: Props) {
  const articles = articlesByLevel(level);
  const cfg = LEVEL_CONFIGS[level];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-start gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-700 hover:bg-amber-100"
        >
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" className="h-5 w-5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onChangeLevel}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            ← Change level
          </button>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Level {level}</h1>
          <p className="text-sm text-slate-500">Default narration speed: {cfg.defaultWpm} words/min</p>
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          No articles for {level} yet — try another level.
        </p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => {
            const minutes = Math.max(1, Math.round(a.wordCount / cfg.defaultWpm));
            return (
              <li key={a.id}>
                <ArticleCard
                  id={a.id}
                  title={a.title}
                  description={a.description}
                  wordCount={a.wordCount}
                  minutes={minutes}
                  tags={a.tags}
                  onOpen={() => onOpen(a.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
