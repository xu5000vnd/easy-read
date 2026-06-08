import type { Level, LevelConfig } from '../types';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// scrollSpeedFactor multiplies the wpm-derived scroll rate.
// 1.0 = same pace as wpm. <1.0 = slower scroll (easier to read along).
// >1.0 = faster scroll. Tune per level here.
export const LEVEL_CONFIGS: Record<Level, LevelConfig> = {
  A1: { level: 'A1', defaultWpm: 90, minWpm: 60, maxWpm: 130, scrollSpeedFactor: 0.8 },
  A2: { level: 'A2', defaultWpm: 110, minWpm: 70, maxWpm: 150, scrollSpeedFactor: 0.9 },
  B1: { level: 'B1', defaultWpm: 140, minWpm: 90, maxWpm: 190, scrollSpeedFactor: 1.0 },
  B2: { level: 'B2', defaultWpm: 165, minWpm: 110, maxWpm: 220, scrollSpeedFactor: 1.05 },
  C1: { level: 'C1', defaultWpm: 190, minWpm: 130, maxWpm: 260, scrollSpeedFactor: 1.1 },
  C2: { level: 'C2', defaultWpm: 210, minWpm: 140, maxWpm: 300, scrollSpeedFactor: 1.15 },
};

export const LEVEL_BLURBS: Record<Level, string> = {
  A1: 'Beginner — very short sentences, common words',
  A2: 'Elementary — simple connectors, past + present',
  B1: 'Intermediate — wider tenses and connectors',
  B2: 'Upper-intermediate — natural article flow',
  C1: 'Advanced — abstraction and nuance',
  C2: 'Mastery — near-native complexity',
};
