import { useEffect, useRef, useState } from 'react';
import type { Level, UserPrefs } from './types';
import { LEVELS } from './data/levels';
import { ARTICLES, articleById } from './data/articles';
import { storage, STORAGE_KEYS } from './lib/storage';
import { LevelSelect } from './features/level-select/LevelSelect';
import { ArticleList } from './features/article-list/ArticleList';
import { ReadingSession } from './features/reading-session/ReadingSession';
import { SideMenu } from './features/side-menu/SideMenu';
import { Favorites } from './features/favorites/Favorites';
import {
  setMusicEnabled,
  setMusicVolume,
  subscribeMusic,
  isMusicEnabled,
  getMusicVolume,
} from './lib/audio';

type Screen =
  | { kind: 'level' }
  | { kind: 'list'; level: Level }
  | { kind: 'read'; articleId: string }
  | { kind: 'favorites' };

const DEFAULT_PREFS: UserPrefs = {
  level: 'A1',
  musicEnabled: false,
  musicVolume: 0.3,
  favorites: [],
};

function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value);
}

function screenToHash(screen: Screen): string {
  switch (screen.kind) {
    case 'level':
      return '#/';
    case 'list':
      return `#/level/${screen.level}`;
    case 'read':
      return `#/read/${screen.articleId}`;
    case 'favorites':
      return '#/favorites';
  }
}

function hashToScreen(hash: string): Screen | null {
  const stripped = hash.replace(/^#\/?/, '').trim();
  if (stripped === '' || stripped === 'level' || stripped === 'levels') {
    return { kind: 'level' };
  }
  if (stripped === 'favorites') {
    return { kind: 'favorites' };
  }
  const levelMatch = stripped.match(/^level\/([A-Z0-9]+)$/i);
  if (levelMatch && isLevel(levelMatch[1].toUpperCase())) {
    return { kind: 'list', level: levelMatch[1].toUpperCase() as Level };
  }
  const readMatch = stripped.match(/^read\/(.+)$/);
  if (readMatch && ARTICLES.some((a) => a.id === readMatch[1])) {
    return { kind: 'read', articleId: readMatch[1] };
  }
  return null;
}

export default function App() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: 'level' });
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const hydratedRef = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.get<UserPrefs>(STORAGE_KEYS.prefs);
      const merged: UserPrefs = {
        ...DEFAULT_PREFS,
        ...(saved ?? {}),
        level: isLevel(saved?.level) ? saved!.level : DEFAULT_PREFS.level,
        favorites: Array.isArray(saved?.favorites) ? saved!.favorites : [],
      };
      setPrefs(merged);

      setMusicVolume(merged.musicVolume);
      if (merged.musicEnabled) {
        void setMusicEnabled(true);
      }

      const fromHash = hashToScreen(window.location.hash);
      if (fromHash) {
        setScreen(fromHash);
      } else if (saved?.level) {
        setScreen({ kind: 'list', level: merged.level });
      } else {
        setScreen({ kind: 'level' });
      }
      hydratedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    return subscribeMusic(() => {
      if (!hydratedRef.current) return;
      void storage.get<UserPrefs>(STORAGE_KEYS.prefs).then((saved) => {
        const next: UserPrefs = {
          ...DEFAULT_PREFS,
          ...(saved ?? {}),
          musicEnabled: isMusicEnabled(),
          musicVolume: getMusicVolume(),
        };
        void storage.set(STORAGE_KEYS.prefs, next);
      });
    });
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const target = screenToHash(screen);
    const current = window.location.hash || '#/';
    if (current !== target) {
      window.history.pushState({ screen }, '', target);
    }
  }, [screen]);

  useEffect(() => {
    function onPopState() {
      const next = hashToScreen(window.location.hash);
      if (next) setScreen(next);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function persistLevel(level: Level) {
    const next: UserPrefs = { ...(prefs ?? DEFAULT_PREFS), level };
    setPrefs(next);
    void storage.set(STORAGE_KEYS.prefs, next);
  }

  function openMenu() {
    setMenuOpen(true);
  }
  function closeMenu() {
    setMenuOpen(false);
  }
  function selectLevelFromMenu(level: Level) {
    persistLevel(level);
    setScreen({ kind: 'list', level });
    setMenuOpen(false);
  }

  function selectArticleFromMenu(articleId: string) {
    const a = articleById(articleId);
    if (!a) return;
    persistLevel(a.level);
    setScreen({ kind: 'read', articleId });
    setMenuOpen(false);
  }

  function openFavoritesScreen() {
    setScreen({ kind: 'favorites' });
    setMenuOpen(false);
  }

  if (!prefs) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">Loading…</div>
    );
  }

  const currentLevel: Level =
    screen.kind === 'list'
      ? screen.level
      : screen.kind === 'read'
      ? articleById(screen.articleId)?.level ?? prefs.level
      : prefs.level;

  let body: JSX.Element;
  if (screen.kind === 'level') {
    body = (
      <LevelSelect
        current={prefs.level}
        onSelect={(level) => {
          persistLevel(level);
          setScreen({ kind: 'list', level });
        }}
      />
    );
  } else if (screen.kind === 'list') {
    body = (
      <ArticleList
        level={screen.level}
        onOpen={(articleId) => setScreen({ kind: 'read', articleId })}
        onChangeLevel={() => setScreen({ kind: 'level' })}
        onOpenMenu={openMenu}
      />
    );
  } else if (screen.kind === 'favorites') {
    body = (
      <Favorites
        onOpen={(articleId) => {
          const a = articleById(articleId);
          if (a) persistLevel(a.level);
          setScreen({ kind: 'read', articleId });
        }}
        onOpenMenu={openMenu}
      />
    );
  } else {
    const article = articleById(screen.articleId);
    if (!article) {
      body = (
        <div className="mx-auto max-w-md p-8 text-center text-slate-500">
          <p>Article not found.</p>
          <button
            type="button"
            onClick={() => setScreen({ kind: 'list', level: prefs.level })}
            className="mt-3 text-indigo-600 hover:text-indigo-700"
          >
            ← Back
          </button>
        </div>
      );
    } else {
      body = (
        <ReadingSession
          article={article}
          onBack={() => setScreen({ kind: 'list', level: article.level })}
          onOpenMenu={openMenu}
        />
      );
    }
  }

  return (
    <>
      {body}
      <SideMenu
        open={menuOpen}
        currentLevel={currentLevel}
        onSelectLevel={selectLevelFromMenu}
        onSelectArticle={selectArticleFromMenu}
        onOpenFavorites={openFavoritesScreen}
        onClose={closeMenu}
      />
    </>
  );
}
