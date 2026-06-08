# English Reading App — Implementation Spec (v1)

A cross-platform app that helps learners improve **reading fluency and pronunciation** by
reading along to leveled articles. The screen paces the reader with a synchronized
word-by-word highlight and text-to-speech narration, with optional relaxing background
music. Learners can record themselves reading and play it back against the model voice.

This document is the build spec for **v1**. Automated pronunciation scoring and account
sync are explicitly **out of scope** (see [Backlog](#backlog)).

---

## 1. Goals & non-goals

**v1 goals**
- Pick a level, browse articles for that level, open one to practice.
- A "reading session" view that paces the reader: TTS narration + synchronized
  karaoke-style word highlighting, with speed tied to the chosen level.
- Adjustable speed (slower/faster) within a level.
- Low-volume ambient background music that ducks during narration.
- Record yourself reading aloud and play it back next to the model voice (self-comparison).
- Works **fully offline** and persists progress locally.
- One codebase that runs on the web and builds to Android/iOS.

**Non-goals for v1 (backlog)**
- Automated pronunciation/phoneme scoring and feedback.
- User accounts / login.
- Server-side storage, content management, or cross-device sync.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | React + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS (mobile-first, responsive) |
| Native packaging | Capacitor (Android + iOS from the same web build) |
| TTS | Browser `SpeechSynthesis` API; `@capacitor-community/text-to-speech` on native if needed |
| Audio (music/recording) | HTML5 Audio + Web Audio API; `MediaRecorder` + `getUserMedia` for recording |
| Storage (v1) | `localStorage` behind a storage abstraction (see §4) |

Backend (NestJS + PostgreSQL) is **not** built in v1 — it arrives later as a sync layer.
Design data models so they can sync cleanly later, but do not add network calls now.

---

## 3. Core UX flow

1. **Level select** → choose CEFR-style level (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`).
   Persisted as the user's default; changeable any time.
2. **Article list** → shows articles tagged with the selected level (title, short
   description, length in words, estimated minutes at that level's WPM).
3. **Reading session** → the main screen:
   - Article text rendered as tokenized words.
   - A **play/pause** control starts TTS narration.
   - As narration progresses, the **current word is highlighted** (karaoke style);
     already-read words get a subtler "read" style.
   - A **speed control** (slower ↔ faster) adjusts pace; default comes from the level.
   - A **background-music** toggle + volume; music **ducks** (lowers) during narration.
   - A **record** button captures the user reading aloud; afterward they can
     **play back their recording** and **play the model TTS** to compare.
   - On finish, the session is saved to local progress.

---

## 4. Architecture principles

- **Offline-first.** All article content ships bundled with the app (`src/data/`).
  No feature in v1 requires the network.
- **Storage abstraction.** All persistence goes through a single interface so the
  backing store can change without touching feature code:

  ```ts
  // src/lib/storage.ts
  export interface Storage {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
  }
  ```
  v1 ships a `LocalStorageAdapter`. Later, swap in a `CapacitorPreferencesAdapter`
  or `SqliteAdapter` with no changes to callers.
- **Platform-tolerant audio/TTS.** Prefer web APIs; if browser TTS quality/behavior
  is poor on a target device, fall back to the Capacitor TTS plugin. Keep TTS behind
  a small `lib/speech.ts` wrapper so the implementation can vary by platform.

---

## 5. Data models

```ts
// src/types.ts
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Article {
  id: string;
  title: string;
  description: string;
  level: Level;
  body: string;          // plain text; tokenized at runtime
  wordCount: number;
  tags?: string[];
  source?: string;       // "original" or attribution string (see §7)
}

export interface LevelConfig {
  level: Level;
  defaultWpm: number;    // baseline narration speed for this level
  minWpm: number;
  maxWpm: number;
}

export interface SessionRecord {
  id: string;
  articleId: string;
  level: Level;
  wpm: number;
  startedAt: string;     // ISO
  completedAt?: string;  // ISO
  completed: boolean;
}

export interface UserPrefs {
  level: Level;
  musicEnabled: boolean;
  musicVolume: number;   // 0..1
}
```

**WPM anchors** (rough starting values; expose for tuning):

| Level | defaultWpm | min | max |
|---|---|---|---|
| A1 | 90 | 60 | 130 |
| A2 | 110 | 70 | 150 |
| B1 | 140 | 90 | 190 |
| B2 | 165 | 110 | 220 |
| C1 | 190 | 130 | 260 |
| C2 | 210 | 140 | 300 |

---

## 6. Feature specs & acceptance criteria

### 6.1 Level selection
- User can choose a level; choice persists via the storage layer.
- Changing level updates the article list and the default WPM.
- **Done when:** relaunching the app restores the last selected level.

### 6.2 Article list
- Lists only articles matching the selected level.
- Each item shows title, description, word count, and estimated minutes
  (`wordCount / defaultWpm`, rounded).
- Tapping an item opens the reading session.
- **Done when:** switching level visibly changes the list, and estimates are correct.

### 6.3 Reading session — paced highlighting + TTS (the core)
- Article body is tokenized into words (preserve punctuation/whitespace for display).
- Pressing **play** starts `SpeechSynthesis` narration of the article.
- Highlighting is driven by the utterance's **`onboundary` event** (fires at word
  boundaries) to sync the highlight to the actual spoken word.
  - **Fallback:** if `onboundary` is unreliable on a platform, drive the highlight
    with a timer derived from the current WPM (`60000 / wpm` ms per word). Keep both
    paths behind `lib/speech.ts`.
- The **speed control** maps to WPM within the level's min/max and sets the TTS
  `rate` (and the fallback timer interval). Changing speed mid-session takes effect
  smoothly.
- **Pause/resume** and **restart** are supported.
- Current word is clearly highlighted; previously read words use a muted style;
  upcoming words are default.
- Auto-scroll keeps the current word in view.
- **Done when:** narration audibly tracks the highlighted word, speed control
  changes the pace, and pause/resume works.

### 6.4 Background music
- Toggle + volume slider; preference persists.
- Loops a bundled royalty-free / CC-licensed ambient track at low volume.
- **Ducks** (e.g. drops to ~20%) while narration is playing, returns to set volume
  when narration stops/pauses.
- **Pauses or ducks during recording** to avoid bleeding into the mic.
- **Done when:** music loops seamlessly, ducks during narration, and is quiet/paused
  while recording.

### 6.5 Record & playback (self-comparison)
- A **record** button requests mic permission (`getUserMedia`) and captures audio
  via `MediaRecorder`. On native, this runs in the Capacitor WebView; if WebView mic
  access is unreliable on a device, fall back to a Capacitor voice-recorder plugin.
- After recording: user can **play their recording** and **play the model TTS** to
  compare. No scoring in v1.
- Recording is kept for the current session (in memory or IndexedDB); persistence
  across launches is optional in v1.
- Mute/duck background music during recording (see 6.4).
- **Done when:** user can record, play back their own audio, and play the model voice.

### 6.6 Progress persistence
- A `SessionRecord` is created on session start and marked completed at the end.
- A simple "history" view (or list) shows recent sessions per article.
- All writes go through the storage abstraction.
- **Done when:** completed sessions survive an app relaunch.

---

## 7. Content sourcing & generation

This is a **free app for learners who can't afford paid resources**, so all bundled
content must be either public domain, openly licensed, or original. Do **not** copy
text from commercial graded-reader sites — being free/charitable does not grant a
copyright exemption.

### 7.1 Legally reusable sources

- **VOA Learning English** (`learningenglish.voanews.com`) — produced by Voice of
  America (a U.S. federal agency), so its text and audio are **public domain** and may
  be reused for educational and commercial purposes **with credit to
  learningenglish.voanews.com**. Written in controlled English (~1,500-word core
  vocabulary, slower narration) ≈ B1. **Caveat:** photos/articles credited to AP,
  Reuters, AFP, etc. are *not* public domain — use only VOA-produced text/audio.
- **Project Gutenberg** — public-domain books; simplify passages yourself for lower levels.
- **Simple English Wikipedia** — already in simplified English (≈ A2/B1); licensed
  **CC BY-SA** (requires attribution + share-alike on derived text).
- **Wikinews** — current news under **CC BY** (attribution only).

The free sources cluster around B1+. For genuine **A1/A2** content, generate original
passages (§7.3) — that also sidesteps attribution/licensing entirely.

### 7.2 Bundled content target

Ship at least **2–3 articles per level** in `src/data/articles.ts` so the app is usable
offline on first launch. Bodies are plain text. For any reused (non-original) text, store
a `source`/`attribution` field on the article and surface it in the UI as required by
the license.

### 7.3 Generation prompt template

Use this to produce A1/A2/B1/B2 versions of any topic, formatted to drop straight into
`articles.ts`. Replace `{TOPIC}`. The model returns a JSON array; paste it (or convert
to a TS literal) into the content file. Each level covers the **same topic and facts** so
learners can re-read the same story as they level up.

```
You are an ESL content writer. Write FOUR versions of a short reading passage about
the topic below — one each at CEFR levels A1, A2, B1, and B2. All four describe the
SAME topic and the SAME core facts, so a learner can re-read the same story as they
improve. Content must be original (do not copy any existing text), factually safe,
neutral, and appropriate for all ages.

TOPIC: {TOPIC}

Follow these level rules strictly:
- A1: ~80–120 words. Present simple only. Very common words (~top 500). Short sentences
  (5–8 words). One idea per sentence. No idioms.
- A2: ~120–180 words. Present + past simple. ~top 1,000 words. Simple connectors
  (and, but, because, then). Sentences 8–12 words.
- B1: ~180–280 words. A range of tenses. ~top 2,000 words. Some complex sentences with
  connectors (although, however, while, so that). Mild abstraction allowed.
- B2: ~280–400 words. Full range of tenses, passive voice, opinion/nuance. ~top 4,000
  words. Compound and complex sentences. Natural, article-like flow.

For EACH version produce an object with these fields:
- id: a slug like "topic-a1" (lowercase, hyphens)
- title: a short title suited to the level
- description: one sentence (max 15 words) summarizing the passage
- level: "A1" | "A2" | "B1" | "B2"
- body: the passage as plain text (use \n for paragraph breaks)
- wordCount: the exact number of words in body
- tags: 2–4 lowercase topic tags

OUTPUT FORMAT: Return ONLY a valid JSON array of the four objects. No markdown code
fences, no commentary, no trailing text. The keys must match exactly and the JSON must
parse with JSON.parse().
```

**Notes for use:**
- After generating, spot-check difficulty with a readability metric (Flesch–Kincaid
  grade ~3–4 ≈ A1/A2, ~6–8 ≈ A2/B1, ~9–11 ≈ B2) and regenerate any version that drifts.
- The "only JSON, no fences" instruction matters so the output parses cleanly; if a model
  still wraps it in ```json fences, strip them before `JSON.parse()`.
- Keep a `source: "original"` (or the proper attribution string) on each generated
  article so the provenance is explicit in your data.

---

## 8. Suggested project structure

```
english-reading-app/
├─ src/
│  ├─ data/
│  │  ├─ articles.ts          # bundled offline content
│  │  └─ levels.ts            # LevelConfig table (WPM anchors)
│  ├─ lib/
│  │  ├─ storage.ts           # Storage interface + LocalStorageAdapter
│  │  ├─ speech.ts            # TTS wrapper (SpeechSynthesis / Capacitor TTS)
│  │  ├─ tokenize.ts          # split article body into words
│  │  └─ audio.ts             # music loop + ducking, recorder helpers
│  ├─ features/
│  │  ├─ level-select/
│  │  ├─ article-list/
│  │  ├─ reading-session/     # the core view
│  │  └─ history/
│  ├─ components/             # shared UI (buttons, sliders, layout)
│  ├─ types.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ public/audio/ambient-1.mp3  # CC-licensed background track(s)
├─ capacitor.config.ts
├─ tailwind / vite config files
├─ android/                    # generated by `cap add android`
└─ ios/                        # generated by `cap add ios`
```

---

## 9. Setup commands

```bash
# Web app
npm create vite@latest english-reading-app -- --template react-ts
cd english-reading-app
npm install

# Tailwind
npm install tailwindcss @tailwindcss/vite
# add @tailwindcss/vite to vite.config.ts and `@import "tailwindcss";` to the main CSS

# Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init english-reading-app com.yourcompany.englishreading --web-dir=dist
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios

# Dev loop: develop in browser
npm run dev

# Push to native (needs Android Studio / Xcode)
npm run build && npx cap sync
npx cap open android   # or: npx cap open ios
```

---

## 10. Build milestones (implement in this order)

1. **Scaffold** — Vite + React + TS + Tailwind running; basic responsive layout shell.
2. **Storage + types** — `types.ts`, `storage.ts` (LocalStorageAdapter), `levels.ts`.
3. **Content + level select + article list** — bundled articles, level persists,
   list filters by level with time estimates.
4. **Reading session core** — tokenization, TTS via `lib/speech.ts`, synchronized
   highlighting (`onboundary` + WPM-timer fallback), speed control, pause/resume,
   auto-scroll. *(Highest-value milestone.)*
5. **Background music** — looping ambient track, volume, ducking during narration.
6. **Record & playback** — mic capture, play-back-vs-model comparison, music mute
   during recording.
7. **Progress** — session records + simple history view.
8. **Capacitor wiring** — add platforms, `cap sync`, smoke-test on Android/iOS;
   apply native fallbacks (TTS plugin / recorder plugin) only if web APIs misbehave.

Each milestone should be independently runnable in the browser via `npm run dev`.

---

## Backlog

These are intentionally deferred from v1.

- **Automated pronunciation feedback.** Note: general speech-to-text (e.g. Whisper)
  reliably catches *reading* errors (wrong/skipped words) but is a poor proxy for
  *pronunciation* quality. Two future tracks:
  - *Reading accuracy* via on-device OS speech recognition (Capacitor speech-recognition
    plugin) — can stay mostly offline.
  - *Pronunciation scoring* (per-phoneme) via a cloud API (e.g. Azure Speech
    Pronunciation Assessment, Speechace) — online-only, routed through the future backend.
- **Accounts / login** and cross-device **progress sync**.
- **NestJS + PostgreSQL backend** as content management + sync layer; replace the
  local storage adapter with a syncing adapter.
- Streaks/gamification, downloadable article packs, adjustable highlight granularity
  (word vs phrase).
