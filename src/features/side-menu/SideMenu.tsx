import { useEffect } from 'react';
import type { Article, Level } from '../../types';
import { LEVELS, LEVEL_BLURBS } from '../../data/levels';
import { ARTICLES, articleById } from '../../data/articles';
import {
  useCompleted,
  useFavoriteIds,
  useRecentArticleIds,
} from '../../lib/progress';

interface Props {
  open: boolean;
  currentLevel: Level;
  onSelectLevel: (level: Level) => void;
  onSelectArticle: (articleId: string) => void;
  onOpenFavorites: () => void;
  onClose: () => void;
}

function ArticleRow({ article, onOpen }: { article: Article; onOpen: () => void }) {
  const completed = useCompleted(article.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-amber-100"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-stone-900">{article.title}</div>
        <div className="text-xs text-stone-500">
          {article.level} · {article.wordCount} words
        </div>
      </div>
      {completed && (
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Done
        </span>
      )}
    </button>
  );
}

export function SideMenu({
  open,
  currentLevel,
  onSelectLevel,
  onSelectArticle,
  onOpenFavorites,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const favoriteIds = useFavoriteIds();
  const recentIds = useRecentArticleIds(5);
  const recentArticles = recentIds
    .map((id) => articleById(id))
    .filter((a): a is Article => !!a);
  const favoritesCount = favoriteIds.length;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={[
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      <aside
        role="dialog"
        aria-label="Main menu"
        aria-hidden={!open}
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-80 max-w-[88%] transform flex-col bg-amber-50 shadow-2xl transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-amber-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">Easy Read</h2>
            <p className="text-xs text-stone-500">English reading practice</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-amber-100"
          >
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {recentArticles.length > 0 && (
            <section className="mb-4">
              <div className="flex items-center gap-1.5 px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Continue reading
              </div>
              <ul className="space-y-0.5">
                {recentArticles.map((a) => (
                  <li key={a.id}>
                    <ArticleRow article={a} onOpen={() => onSelectArticle(a.id)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-4">
            <button
              type="button"
              onClick={onOpenFavorites}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-amber-100"
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" stroke="#d97706" strokeWidth={2} fill="#d97706" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="font-medium text-stone-900">Favorites</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-stone-600">
                {favoritesCount}
              </span>
            </button>
          </section>

          <section>
            <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Browse by level
            </div>
            <ul className="space-y-1">
              {LEVELS.map((level) => {
                const count = ARTICLES.filter((a) => a.level === level).length;
                const isActive = level === currentLevel;
                return (
                  <li key={level}>
                    <button
                      type="button"
                      onClick={() => onSelectLevel(level)}
                      className={[
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition',
                        isActive
                          ? 'bg-amber-700 text-white shadow-sm'
                          : 'text-stone-800 hover:bg-amber-100',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-semibold">{level}</span>
                          {isActive && (
                            <span className="text-[10px] uppercase tracking-wide text-amber-100">
                              current
                            </span>
                          )}
                        </div>
                        <div
                          className={[
                            'truncate text-xs',
                            isActive ? 'text-amber-100' : 'text-stone-500',
                          ].join(' ')}
                        >
                          {LEVEL_BLURBS[level]}
                        </div>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full px-2 py-0.5 text-xs',
                          isActive ? 'bg-amber-900/30 text-amber-50' : 'bg-amber-100 text-stone-600',
                        ].join(' ')}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </nav>
      </aside>
    </>
  );
}
