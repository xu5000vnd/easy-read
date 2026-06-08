export interface Token {
  text: string;
  isWord: boolean;
  start: number;
  end: number;
  wordIndex: number;
}

const WORD_RE = /[A-Za-z0-9À-ɏḀ-ỿ']+/g;

export function tokenize(body: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let wordIndex = 0;
  let m: RegExpExecArray | null;

  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(body)) !== null) {
    if (m.index > cursor) {
      const gap = body.slice(cursor, m.index);
      tokens.push({ text: gap, isWord: false, start: cursor, end: m.index, wordIndex: -1 });
    }
    tokens.push({
      text: m[0],
      isWord: true,
      start: m.index,
      end: m.index + m[0].length,
      wordIndex: wordIndex++,
    });
    cursor = m.index + m[0].length;
  }
  if (cursor < body.length) {
    tokens.push({ text: body.slice(cursor), isWord: false, start: cursor, end: body.length, wordIndex: -1 });
  }
  return tokens;
}

export function findWordIndexByCharOffset(tokens: Token[], charOffset: number): number {
  let last = -1;
  for (const t of tokens) {
    if (!t.isWord) continue;
    if (t.start <= charOffset) last = t.wordIndex;
    else break;
  }
  return last;
}

export interface SentenceBlock {
  index: number;
  vi: string;
  enTokens: Token[];
}

export interface TokenizedArticle {
  ttsText: string;
  tokens: Token[];
  sentences: SentenceBlock[];
}

export function tokenizeSentences(pairs: { en: string; vi: string }[]): TokenizedArticle {
  const ranges: { start: number; end: number; vi: string }[] = [];
  let ttsText = '';
  pairs.forEach((p, i) => {
    if (i > 0) ttsText += ' ';
    const start = ttsText.length;
    ttsText += p.en;
    ranges.push({ start, end: ttsText.length, vi: p.vi });
  });
  const tokens = tokenize(ttsText);
  const sentences: SentenceBlock[] = ranges.map((r, idx) => ({
    index: idx,
    vi: r.vi,
    enTokens: tokens.filter((t) => t.start >= r.start && t.end <= r.end),
  }));
  return { ttsText, tokens, sentences };
}
