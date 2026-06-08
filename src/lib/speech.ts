export type SpeechErrorCode = SpeechSynthesisErrorEvent['error'] | 'unknown';

export interface SpeakOptions {
  text: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  lang?: string;
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onStart?: () => void;
  onError?: (code: SpeechErrorCode) => void;
}

export const BENIGN_SPEECH_ERRORS: ReadonlySet<SpeechErrorCode> = new Set([
  'interrupted',
  'canceled',
]);

export interface SpeechController {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(opts: SpeakOptions): SpeechController {
  if (!isSpeechSupported()) {
    opts.onError?.('synthesis-unavailable' as SpeechErrorCode);
    return { pause() {}, resume() {}, cancel() {} };
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const u = new SpeechSynthesisUtterance(opts.text);
  if (opts.rate != null) u.rate = clampRate(opts.rate);
  if (opts.pitch != null) u.pitch = opts.pitch;
  if (opts.volume != null) u.volume = opts.volume;
  if (opts.voice) u.voice = opts.voice;
  u.lang = opts.lang ?? opts.voice?.lang ?? 'en-US';

  u.onstart = () => opts.onStart?.();
  u.onend = () => opts.onEnd?.();
  u.onerror = (e) => {
    const code = ((e as SpeechSynthesisErrorEvent).error ?? 'unknown') as SpeechErrorCode;
    opts.onError?.(code);
  };
  u.onboundary = (e) => {
    if (e.name === 'word' || e.name === undefined) {
      opts.onBoundary?.(e.charIndex);
    }
  };

  synth.speak(u);

  return {
    pause: () => synth.pause(),
    resume: () => synth.resume(),
    cancel: () => synth.cancel(),
  };
}

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.max(0.1, Math.min(10, rate));
}

export function wpmToRate(wpm: number, baselineWpm: number): number {
  if (baselineWpm <= 0) return 1;
  return clampRate(wpm / baselineWpm);
}

const BROWSER_BASELINE_WPM = 180;

export function rateForWpm(wpm: number): number {
  return wpmToRate(wpm, BROWSER_BASELINE_WPM);
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const all = window.speechSynthesis.getVoices();
  return all.filter((v) => v.lang.toLowerCase().startsWith('en'));
}

export function pickPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = getEnglishVoices();
  if (voices.length === 0) return null;
  const local = voices.filter((v) => v.localService);
  const candidates = local.length > 0 ? local : voices;
  return (
    candidates.find((v) => v.lang.toLowerCase().startsWith('en-us')) ??
    candidates.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ??
    candidates[0] ??
    null
  );
}

export function hasLocalEnglishVoice(): boolean {
  return getEnglishVoices().some((v) => v.localService);
}

export function onVoicesReady(cb: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  synth.addEventListener('voiceschanged', handler);
  return () => synth.removeEventListener('voiceschanged', handler);
}
