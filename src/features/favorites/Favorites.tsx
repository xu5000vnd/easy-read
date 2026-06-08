import { articleById } from '../../data/articles';
import type { Article } from '../../types';
import {
  toggleFavorite,
  useCompleted,
  useFavoriteIds,
} from '../../lib/progress';

interface Props {
  onOpen: (articleId: string) => void;
  onOpenMenu: () => void;
}

interface RowProps {
  article: Article;
  onOpen: () => void;
}

function FavoriteRow({ article, onOpen }: RowProps) {
  const completed = useCompleted(article.id);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-slate-900">{article.title}</h2>
            <span className="shrink-0 rounded-full bg-red-700 px-2 py-0.5 font-serif text-xs italic text-amber-50">
              {article.level}
            </span>
            {completed && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Done
              </span>
            )}
          </div>
          <span
            role="button"
            tabIndex={0}
            aria-label="Remove from favorites"
            onClick={(e) => {
              e.stopPropagation();
              void toggleFavorite(article.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                void toggleFavorite(article.id);
              }
            }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
          >
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              fill="#d97706"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">{article.description}</p>
        <p className="mt-2 text-xs text-slate-400">{article.wordCount} words</p>
      </button>
    </li>
  );
}

export function Favorites({ onOpen, onOpenMenu }: Props) {
  const ids = useFavoriteIds();
  const articles = ids.map((id) => articleById(id)).filter((a): a is Article => !!a);

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
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" stroke="#d97706" strokeWidth={2} fill="#d97706" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
          </div>
          <p className="text-sm text-slate-500">
            {articles.length === 0
              ? 'No favorites yet — star any article to save it here.'
              : `${articles.length} saved article${articles.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Browse an article and tap the ★ icon to save it.
        </p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <FavoriteRow key={a.id} article={a} onOpen={() => onOpen(a.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
