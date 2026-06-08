import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Article } from '../../types';
import { LEVEL_CONFIGS } from '../../data/levels';
import {
  findWordIndexByCharOffset,
  tokenize,
  tokenizeSentences,
  type SentenceBlock,
} from '../../lib/tokenize';
import {
  BENIGN_SPEECH_ERRORS,
  hasLocalEnglishVoice,
  isSpeechSupported,
  onVoicesReady,
  pickPreferredVoice,
  rateForWpm,
  speak,
  type SpeechController,
} from '../../lib/speech';
import {
  recordCompletion,
  recordOpen,
  setCompleted,
  toggleFavorite,
  useCompleted,
  useFavorite,
} from '../../lib/progress';

interface Props {
  article: Article;
  onBack: () => void;
  onOpenMenu: () => void;
}

type PlayState = 'idle' | 'playing' | 'paused' | 'done';
type Mode = 'tts' | 'scroll';

export function ReadingSession({ article, onBack, onOpenMenu }: Props) {
  const cfg = LEVEL_CONFIGS[article.level];

  const tokenized = useMemo(() => {
    if (article.sentences && article.sentences.length > 0) {
      return tokenizeSentences(article.sentences);
    }
    const tokens = tokenize(article.body);
    const sentences: SentenceBlock[] = [{ index: 0, vi: '', enTokens: tokens }];
    return { ttsText: article.body, tokens, sentences };
  }, [article]);

  const wordCount = useMemo(
    () => tokenized.tokens.filter((t) => t.isWord).length,
    [tokenized]
  );

  const [mode, setMode] = useState<Mode>('tts');
  const [wpm, setWpm] = useState<number>(cfg.defaultWpm);
  const [state, setState] = useState<PlayState>('idle');
  const [currentWord, setCurrentWord] = useState<number>(-1);
  const [voiceReady, setVoiceReady] = useState<boolean>(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [readerHeight, setReaderHeight] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  const speechRef = useRef<SpeechController | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const boundaryFiredRef = useRef<boolean>(false);
  const currentWordRef = useRef<number>(-1);
  const wpmRef = useRef<number>(wpm);
  const stateRef = useRef<PlayState>(state);
  const modeRef = useRef<Mode>(mode);
  const wordContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollRafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const wasPlayingBeforeSeekRef = useRef<boolean>(false);
  const needsTtsRestartRef = useRef<boolean>(false);
  const sessionStartRef = useRef<string>(new Date().toISOString());

  const favorited = useFavorite(article.id);
  const completed = useCompleted(article.id);

  useEffect(() => {
    sessionStartRef.current = new Date().toISOString();
    void recordOpen(article.id, article.level, wpmRef.current);
  }, [article.id, article.level]);

  useEffect(() => {
    wpmRef.current = wpm;
  }, [wpm]);
  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!isSpeechSupported()) {
      setWarn('Your browser does not support speech synthesis. Try Chrome, Edge, or Safari.');
      return;
    }
    const off = onVoicesReady(() => setVoiceReady(true));
    return off;
  }, []);

  useEffect(() => {
    const el = wordContainerRef.current;
    if (!el) return;
    const update = () => setReaderHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      stopScrollLoop();
      stopFallbackTimer();
      speechRef.current?.cancel();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopFallbackTimer() {
    if (fallbackTimerRef.current != null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  function startFallbackTimer(fromWord: number) {
    stopFallbackTimer();
    let idx = fromWord;
    const tick = () => {
      idx += 1;
      if (idx >= wordCount) return;
      setCurrentWord(idx);
      const interval = 60000 / Math.max(40, wpmRef.current);
      fallbackTimerRef.current = window.setTimeout(tick, interval) as unknown as number;
    };
    const interval = 60000 / Math.max(40, wpmRef.current);
    fallbackTimerRef.current = window.setTimeout(tick, interval) as unknown as number;
  }

  function scrollAnchorFor(sentenceIndex: number): number {
    const container = wordContainerRef.current;
    if (!container) return 0;
    const el = container.querySelector<HTMLElement>(`[data-sentence="${sentenceIndex}"]`);
    if (!el) return 0;
    return Math.max(0, el.offsetTop + el.offsetHeight / 2 - container.clientHeight / 2);
  }

  function sentenceAtScroll(scrollTop: number): number {
    if (tokenized.sentences.length === 0) return 0;
    let best = 0;
    let bestDist = Infinity;
    for (const s of tokenized.sentences) {
      const dist = Math.abs(scrollAnchorFor(s.index) - scrollTop);
      if (dist < bestDist) {
        bestDist = dist;
        best = s.index;
      }
    }
    return best;
  }

  function firstWordOfSentence(sentenceIdx: number): number {
    const s = tokenized.sentences[sentenceIdx];
    if (!s) return 0;
    const first = s.enTokens.find((t) => t.isWord);
    return first?.wordIndex ?? 0;
  }

  function charOffsetOfSentence(sentenceIdx: number): number {
    const s = tokenized.sentences[sentenceIdx];
    if (!s) return 0;
    const first = s.enTokens.find((t) => t.isWord);
    return first?.start ?? 0;
  }

  function scrollSpan(): { start: number; end: number } {
    const container = wordContainerRef.current;
    if (!container) return { start: 0, end: 0 };
    const start = scrollAnchorFor(0);
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    return { start, end: Math.max(start, maxScroll) };
  }

  function pxPerSecond(): number {
    const { start, end } = scrollSpan();
    const span = end - start;
    if (span <= 0 || wordCount <= 0) return 0;
    const factor = Math.max(0.1, cfg.scrollSpeedFactor);
    const durationSec = (wordCount / Math.max(40, wpmRef.current)) * 60;
    return durationSec > 0 ? (span / durationSec) * factor : 0;
  }

  function stopScrollLoop() {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = 0;
  }

  function startScrollLoop() {
    const container = wordContainerRef.current;
    if (!container) return;
    stopScrollLoop();
    lastFrameRef.current = performance.now();

    const step = (now: number) => {
      const c = wordContainerRef.current;
      if (!c) return;
      if (stateRef.current !== 'playing') {
        scrollRafRef.current = 0;
        return;
      }
      const dt = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      const rate = pxPerSecond();
      const next = c.scrollTop + rate * dt;
      const { start, end: liveEnd } = scrollSpan();
      const span = liveEnd - start;
      if (next >= liveEnd) {
        c.scrollTop = liveEnd;
        setProgress(1);
        scrollRafRef.current = 0;
        handleEnd();
        return;
      }
      c.scrollTop = next;
      setProgress(span > 0 ? Math.min(1, (next - start) / span) : 0);
      scrollRafRef.current = requestAnimationFrame(step);
    };
    scrollRafRef.current = requestAnimationFrame(step);
  }

  function startTtsFromCurrentScroll() {
    if (!isSpeechSupported()) return;
    const container = wordContainerRef.current;
    if (!container) return;

    const sentenceIdx = sentenceAtScroll(container.scrollTop);
    const startOffset = charOffsetOfSentence(sentenceIdx);
    const text = tokenized.ttsText.slice(startOffset);
    const voice = pickPreferredVoice();
    const rate = rateForWpm(wpmRef.current);

    if (voice && !voice.localService && !hasLocalEnglishVoice()) {
      setWarn('No offline English voice found — using a network voice (needs internet).');
    }

    boundaryFiredRef.current = false;

    speechRef.current = speak({
      text,
      rate,
      voice,
      lang: voice?.lang ?? 'en-US',
      onStart: () => {
        window.setTimeout(() => {
          if (!boundaryFiredRef.current && stateRef.current === 'playing') {
            startFallbackTimer(currentWordRef.current);
          }
        }, 800);
      },
      onBoundary: (charIndex) => {
        boundaryFiredRef.current = true;
        stopFallbackTimer();
        const idx = findWordIndexByCharOffset(tokenized.tokens, charIndex + startOffset);
        if (idx >= 0) setCurrentWord(idx);
      },
      onEnd: () => {
        if (stateRef.current === 'playing') stopFallbackTimer();
      },
      onError: (code) => {
        if (BENIGN_SPEECH_ERRORS.has(code)) return;
        setWarn(`Speech engine error (${code}) — using timer-based highlight.`);
        startFallbackTimer(currentWordRef.current);
      },
    });
  }

  function handleStart() {
    if (state === 'playing') return;

    const cleanResume = state === 'paused' && !needsTtsRestartRef.current;

    if (cleanResume) {
      setState('playing');
      lastFrameRef.current = performance.now();
      startScrollLoop();
      if (mode === 'tts') {
        if (isSpeechSupported()) window.speechSynthesis.resume();
        if (!boundaryFiredRef.current) startFallbackTimer(currentWordRef.current);
      }
      return;
    }

    if (state === 'done') {
      const container = wordContainerRef.current;
      if (container) container.scrollTop = scrollAnchorFor(0);
      setCurrentWord(-1);
      setProgress(0);
    }

    setWarn(null);
    needsTtsRestartRef.current = false;
    setState('playing');

    lastFrameRef.current = performance.now();
    startScrollLoop();

    if (mode === 'tts') {
      startTtsFromCurrentScroll();
    }
  }

  function handlePause() {
    if (state !== 'playing') return;
    if (mode === 'tts' && isSpeechSupported()) window.speechSynthesis.pause();
    stopFallbackTimer();
    stopScrollLoop();
    setState('paused');
  }

  function handleRestart() {
    speechRef.current?.cancel();
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    stopFallbackTimer();
    stopScrollLoop();
    setCurrentWord(-1);
    setProgress(0);
    boundaryFiredRef.current = false;
    needsTtsRestartRef.current = false;
    setState('idle');
    const container = wordContainerRef.current;
    if (container) container.scrollTop = scrollAnchorFor(0);
  }

  function handleEnd() {
    speechRef.current?.cancel();
    stopFallbackTimer();
    stopScrollLoop();
    if (mode === 'tts') setCurrentWord(wordCount - 1);
    setState('done');
    void recordCompletion(article.id, article.level, wpmRef.current, sessionStartRef.current);
  }

  function handleToggleFavorite() {
    void toggleFavorite(article.id);
  }

  function handleToggleCompleted() {
    void setCompleted(article.id, !completed);
  }

  function seekToScrollTop(target: number) {
    const container = wordContainerRef.current;
    if (!container) return;
    const { start, end } = scrollSpan();
    const clamped = Math.max(start, Math.min(end, target));
    container.scrollTop = clamped;
    const sentenceIdx = sentenceAtScroll(clamped);
    setCurrentWord(firstWordOfSentence(sentenceIdx));
    setProgress(end > start ? Math.min(1, Math.max(0, (clamped - start) / (end - start))) : 0);
  }

  function seekToSentence(sentenceIdx: number) {
    const max = tokenized.sentences.length - 1;
    const idx = Math.max(0, Math.min(max, sentenceIdx));
    const wasPlaying = stateRef.current === 'playing';
    if (mode === 'tts' && isSpeechSupported()) window.speechSynthesis.cancel();
    stopFallbackTimer();
    stopScrollLoop();
    seekToScrollTop(scrollAnchorFor(idx));
    if (wasPlaying) {
      lastFrameRef.current = performance.now();
      startScrollLoop();
      if (mode === 'tts') startTtsFromCurrentScroll();
    } else {
      needsTtsRestartRef.current = true;
    }
  }

  function handlePrev() {
    const container = wordContainerRef.current;
    if (!container) return;
    const current = sentenceAtScroll(container.scrollTop);
    seekToSentence(current - 1);
  }

  function handleNext() {
    const container = wordContainerRef.current;
    if (!container) return;
    const current = sentenceAtScroll(container.scrollTop);
    seekToSentence(current + 1);
  }

  function progressFromPointer(e: React.PointerEvent<HTMLDivElement>): number {
    const rail = scrubberRef.current;
    if (!rail) return 0;
    const rect = rail.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  function applyProgress(p: number) {
    const { start, end } = scrollSpan();
    seekToScrollTop(start + p * (end - start));
  }

  function handleScrubStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    isSeekingRef.current = true;
    wasPlayingBeforeSeekRef.current = stateRef.current === 'playing';
    if (mode === 'tts' && isSpeechSupported()) window.speechSynthesis.cancel();
    stopFallbackTimer();
    stopScrollLoop();
    if (stateRef.current === 'playing' || stateRef.current === 'done') {
      setState('paused');
    }
    needsTtsRestartRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyProgress(progressFromPointer(e));
  }

  function handleScrubMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isSeekingRef.current) return;
    applyProgress(progressFromPointer(e));
  }

  function handleScrubEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!isSeekingRef.current) return;
    isSeekingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (wasPlayingBeforeSeekRef.current) {
      setState('playing');
      lastFrameRef.current = performance.now();
      startScrollLoop();
      if (mode === 'tts') {
        startTtsFromCurrentScroll();
        needsTtsRestartRef.current = false;
      }
    }
  }

  function handleModeChange(next: Mode) {
    if (next === mode) return;

    const wasPlaying = stateRef.current === 'playing';

    if (mode === 'tts' && isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    speechRef.current?.cancel();
    stopFallbackTimer();

    setMode(next);
    if (next === 'scroll') setCurrentWord(-1);

    if (wasPlaying && next === 'tts') {
      lastFrameRef.current = performance.now();
      startTtsFromCurrentScroll();
      needsTtsRestartRef.current = false;
    } else if (next === 'tts') {
      needsTtsRestartRef.current = true;
    } else {
      needsTtsRestartRef.current = false;
    }
  }

  useLayoutEffect(() => {
    if (readerHeight === 0) return;
    const container = wordContainerRef.current;
    if (container) container.scrollTop = scrollAnchorFor(0);
  }, [article.id, readerHeight, tokenized]);

  const padY = Math.max(0, Math.floor(readerHeight / 2));
  const progressPct = Math.round(progress * 100);

  return (
    <div className="flex h-full flex-col bg-amber-50">
      <header className="mx-auto flex w-full max-w-3xl items-start gap-3 px-4 pt-5 pb-3">
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
            onClick={onBack}
            className="text-sm text-amber-800 hover:text-amber-900"
          >
            ← Back
          </button>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="truncate font-serif text-2xl font-semibold text-stone-900">
              {article.title}
            </h1>
            <span className="shrink-0 rounded-full bg-red-700 px-2 py-0.5 font-serif text-xs italic text-amber-50">
              Cấp độ {article.level}
            </span>
            {completed && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Done
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-amber-900 hover:bg-amber-100"
        >
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            fill={favorited ? '#d97706' : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            style={{ color: favorited ? '#d97706' : undefined }}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setShowTranslation((v) => !v)}
          className="shrink-0 rounded-full border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-white"
        >
          {showTranslation ? 'Hide VN' : 'Show VN'}
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <div className="inline-flex rounded-full border border-amber-300 bg-white/70 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => handleModeChange('tts')}
            className={[
              'rounded-full px-3 py-1.5 transition',
              mode === 'tts' ? 'bg-amber-700 text-white shadow' : 'text-amber-900 hover:bg-amber-100',
            ].join(' ')}
          >
            🔊 Bot reads
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('scroll')}
            className={[
              'rounded-full px-3 py-1.5 transition',
              mode === 'scroll' ? 'bg-amber-700 text-white shadow' : 'text-amber-900 hover:bg-amber-100',
            ].join(' ')}
          >
            📖 Just scroll
          </button>
        </div>
      </div>

      {warn && (
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="mb-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {warn}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 px-3 pb-3 sm:px-6">
        <div className="relative h-full overflow-hidden rounded-3xl border-2 border-amber-800/30 shadow-[0_10px_40px_-12px_rgba(120,75,30,0.35),inset_0_2px_10px_rgba(120,75,30,0.18)]">
          <div ref={wordContainerRef} className="reading-paper h-full overflow-y-auto">
            <div
              className="mx-auto w-full max-w-3xl px-5 text-center"
              style={{ paddingTop: padY, paddingBottom: padY }}
            >
              <div className="space-y-6">
                {tokenized.sentences.map((s) => (
                  <div
                    key={s.index}
                    data-sentence={s.index}
                    className="rounded-lg px-2 py-1 leading-snug"
                  >
                    <p className="font-serif text-2xl text-stone-900 sm:text-[1.65rem]">
                      {s.enTokens.map((t, i) =>
                        t.isWord ? (
                          <span
                            key={i}
                            data-word={t.wordIndex}
                            className={
                              mode === 'tts' && t.wordIndex === currentWord
                                ? 'rounded bg-yellow-300/80 px-0.5 ring-2 ring-amber-500'
                                : mode === 'tts' && t.wordIndex >= 0 && t.wordIndex < currentWord
                                ? 'text-stone-400'
                                : ''
                            }
                          >
                            {t.text}
                          </span>
                        ) : (
                          <span key={i}>{t.text}</span>
                        )
                      )}
                    </p>
                    {showTranslation && s.vi && (
                      <p className="mt-1 font-serif text-lg italic text-red-700 sm:text-xl">
                        {s.vi}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 rounded-t-3xl bg-gradient-to-b from-amber-50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-3xl bg-gradient-to-t from-amber-50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-dashed border-amber-700/20" />
        </div>
      </div>

      <div className="border-t border-amber-200 bg-amber-50/95 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div
            ref={scrubberRef}
            role="slider"
            aria-label="Seek through script"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            tabIndex={0}
            onPointerDown={handleScrubStart}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
              }
            }}
            className="group mb-3 -mx-1 cursor-pointer touch-none px-1 py-2"
          >
            <div className="relative h-1.5 w-full rounded-full bg-amber-200/70">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-amber-600"
                style={{ width: `${progressPct}%` }}
                aria-hidden
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-700 shadow-md transition-transform group-hover:scale-110 group-active:scale-125"
                style={{ left: `${progressPct}%` }}
                aria-hidden
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous sentence"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {state === 'playing' ? (
              <button
                type="button"
                onClick={handlePause}
                className="rounded-full bg-amber-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-amber-800"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={mode === 'tts' && (!isSpeechSupported() || !voiceReady)}
                className="rounded-full bg-amber-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {state === 'paused' ? 'Resume' : state === 'done' ? 'Play again' : 'Play'}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next sentence"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart from beginning"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToggleCompleted}
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition',
                completed
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border border-amber-300 bg-white text-amber-900 hover:bg-amber-100',
              ].join(' ')}
              aria-pressed={completed}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {completed ? 'Completed' : 'Mark complete'}
            </button>

            <div className="ml-auto flex items-center gap-2 text-sm text-stone-700">
              <label htmlFor="wpm" className="whitespace-nowrap">
                Speed: <span className="font-semibold text-stone-900">{wpm} wpm</span>
              </label>
              <input
                id="wpm"
                type="range"
                min={cfg.minWpm}
                max={cfg.maxWpm}
                step={5}
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="w-40 accent-amber-700"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
