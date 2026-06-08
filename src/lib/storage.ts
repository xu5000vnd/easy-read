export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorageAdapter implements Storage {
  constructor(private readonly prefix = 'easy-read:') {}

  private k(key: string) {
    return this.prefix + key;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = window.localStorage.getItem(this.k(key));
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    window.localStorage.setItem(this.k(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(this.k(key));
  }
}

export const storage: Storage = new LocalStorageAdapter();

export const STORAGE_KEYS = {
  prefs: 'prefs',
  sessions: 'sessions',
  favorites: 'favorites',
  completed: 'completed',
} as const;
