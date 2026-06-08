import { useEffect, useState } from 'react';
import { storage, STORAGE_KEYS } from './storage';
import type { Level, SessionRecord } from '../types';

let favoritesCache: Set<string> | null = null;
let completedCache: Set<string> | null = null;
let sessionsCache: SessionRecord[] | null = null;
let loadPromise: Promise<void> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function loadAll() {
  const [favs, completed, sessions] = await Promise.all([
    storage.get<string[]>(STORAGE_KEYS.favorites),
    storage.get<string[]>(STORAGE_KEYS.completed),
    storage.get<SessionRecord[]>(STORAGE_KEYS.sessions),
  ]);
  favoritesCache = new Set(favs ?? []);
  completedCache = new Set(completed ?? []);
  sessionsCache = sessions ?? [];
}

export function ensureProgressLoaded(): Promise<void> {
  if (favoritesCache && completedCache && sessionsCache) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = loadAll().finally(() => {
      notify();
    });
  }
  return loadPromise;
}

export function isFavorite(articleId: string): boolean {
  return favoritesCache?.has(articleId) ?? false;
}

export function isCompleted(articleId: string): boolean {
  return completedCache?.has(articleId) ?? false;
}

export function getFavoriteIds(): string[] {
  return Array.from(favoritesCache ?? []);
}

export function recentArticleIds(n: number): string[] {
  if (!sessionsCache) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = sessionsCache.length - 1; i >= 0; i--) {
    const id = sessionsCache[i].articleId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= n) break;
  }
  return out;
}

export async function toggleFavorite(articleId: string): Promise<boolean> {
  await ensureProgressLoaded();
  const set = favoritesCache!;
  if (set.has(articleId)) set.delete(articleId);
  else set.add(articleId);
  await storage.set(STORAGE_KEYS.favorites, Array.from(set));
  notify();
  return set.has(articleId);
}

export async function setCompleted(articleId: string, completed: boolean): Promise<void> {
  await ensureProgressLoaded();
  if (completed) completedCache!.add(articleId);
  else completedCache!.delete(articleId);
  await storage.set(STORAGE_KEYS.completed, Array.from(completedCache!));
  notify();
}

export async function recordSession(record: Omit<SessionRecord, 'id'>): Promise<void> {
  await ensureProgressLoaded();
  const id = `${record.articleId}-${new Date(record.startedAt).getTime()}`;
  const next: SessionRecord = { id, ...record };
  sessionsCache!.push(next);
  if (sessionsCache!.length > 50) {
    sessionsCache = sessionsCache!.slice(-50);
  }
  await storage.set(STORAGE_KEYS.sessions, sessionsCache);
  notify();
}

export async function recordOpen(articleId: string, level: Level, wpm: number): Promise<void> {
  await recordSession({
    articleId,
    level,
    wpm,
    startedAt: new Date().toISOString(),
    completed: false,
  });
}

export async function recordCompletion(
  articleId: string,
  level: Level,
  wpm: number,
  startedAtIso: string
): Promise<void> {
  await ensureProgressLoaded();
  completedCache!.add(articleId);
  await storage.set(STORAGE_KEYS.completed, Array.from(completedCache!));
  await recordSession({
    articleId,
    level,
    wpm,
    startedAt: startedAtIso,
    completedAt: new Date().toISOString(),
    completed: true,
  });
}

function useProgressTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void ensureProgressLoaded();
    return subscribe(() => setTick((t) => t + 1));
  }, []);
  return tick;
}

export function useFavorite(articleId: string): boolean {
  useProgressTick();
  return isFavorite(articleId);
}

export function useCompleted(articleId: string): boolean {
  useProgressTick();
  return isCompleted(articleId);
}

export function useFavoriteIds(): string[] {
  useProgressTick();
  return getFavoriteIds();
}

export function useRecentArticleIds(n: number): string[] {
  useProgressTick();
  return recentArticleIds(n);
}
