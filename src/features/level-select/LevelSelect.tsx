import { LEVELS, LEVEL_BLURBS, LEVEL_CONFIGS } from '../../data/levels';
import type { Level } from '../../types';
import { ARTICLES } from '../../data/articles';

interface Props {
  current: Level;
  onSelect: (level: Level) => void;
}

export function LevelSelect({ current, onSelect }: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Easy Read</h1>
        <p className="mt-2 text-slate-600">
          Read along to leveled articles. Pick the level that feels right — you can change it any time.
        </p>
      </header>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Choose your level
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map((level) => {
          const cfg = LEVEL_CONFIGS[level];
          const count = ARTICLES.filter((a) => a.level === level).length;
          const isActive = level === current;
          return (
            <li key={level}>
              <button
                type="button"
                onClick={() => onSelect(level)}
                className={[
                  'flex w-full flex-col items-start rounded-xl border p-4 text-left transition',
                  'hover:border-indigo-400 hover:bg-indigo-50/50',
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white',
                ].join(' ')}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xl font-bold text-slate-900">{level}</span>
                  <span className="text-xs text-slate-500">{count} article{count === 1 ? '' : 's'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{LEVEL_BLURBS[level]}</p>
                <p className="mt-2 text-xs text-slate-400">~{cfg.defaultWpm} wpm</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
