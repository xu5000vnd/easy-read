export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface SentencePair {
  en: string;
  vi: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  level: Level;
  body: string;
  wordCount: number;
  tags?: string[];
  source?: string;
  sentences?: SentencePair[];
}

export interface LevelConfig {
  level: Level;
  defaultWpm: number;
  minWpm: number;
  maxWpm: number;
  scrollSpeedFactor: number;
}

export interface SessionRecord {
  id: string;
  articleId: string;
  level: Level;
  wpm: number;
  startedAt: string;
  completedAt?: string;
  completed: boolean;
}

export interface UserPrefs {
  level: Level;
  musicEnabled: boolean;
  musicVolume: number;
  favorites: string[];
}
