# Easy Read

An offline-first English reading-practice app for learners. Pick a CEFR level, open a short article, and read along with a synchronized text-to-speech narrator — karaoke-style word highlighting, smooth lyric-video-style scrolling, and a Vietnamese translation under every sentence. Free for learners who don't have access to paid resources.

Built as a single React + TypeScript + Vite codebase that runs in the browser and is ready to package as a Capacitor native app (Android/iOS) later.

---

## Features

- **CEFR levels A1 → C2.** Default WPM per level, tunable scroll-speed factor per level.
- **Two play modes**:
  - **🔊 Bot reads** — `SpeechSynthesis` reads the article aloud with `onboundary`-driven karaoke word highlighting; a WPM-based timer is the fallback when the engine's word events are unreliable.
  - **📖 Just scroll** — silent auto-scroll like a lyric video, paced by the WPM slider × level factor.
- **Bilingual paper view.** Each sentence is rendered in serif English with its Vietnamese translation in red italic below — on a textured paper background framed by a rounded card. Toggle the translation off with **Hide VN** to practice English-only.
- **Teleprompter scroll.** First sentence starts at the middle of the frame; the script glides up smoothly through a dashed reading line until it ends at the bottom of the article. A single `requestAnimationFrame` loop advances `scrollTop` at `pxPerSec = span / (wordCount / wpm × 60) × scrollSpeedFactor`.
- **Interactive scrubber.** Click or drag the progress thumb to seek anywhere. Previous / Next sentence buttons (⟨ / ⟩) jump one sentence at a time. Restart icon goes back to the start. Arrow keys on the focused scrubber also seek by sentence.
- **★ Favorites + 🕒 Continue reading.** Star any article from the header, the article card, or the favorites screen. Recent articles (last 5) appear at the top of the side menu so you can resume.
- **✓ Mark complete.** Auto-marked when the article finishes; manual toggle button next to Restart. Completed articles get a green "Done" badge in the list, in the header, and in the menu.
- **Burger side menu.** Quick access to Favorites screen, last-read articles, and the level switcher.
- **Hash routing.** F5 keeps you on the screen you were on. Browser back / forward navigate between screens. URLs like `#/level/B1`, `#/read/mai-tree-b2`, `#/favorites`.
- **Offline-first.** Articles ship bundled in `src/data/articles.ts`. localStorage persists level, favorites, completion, and session history through a `Storage` interface that can be swapped for Capacitor Preferences or SQLite later without touching feature code.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 4 |
| TTS | Browser `SpeechSynthesis` API (with Capacitor TTS plugin as a future fallback) |
| Storage (v1) | `localStorage` behind a `Storage` interface |
| Native packaging (future) | Capacitor (Android + iOS from the same web build) |

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build to dist/
npm run preview      # serve the production build locally
```

Node 18+ recommended.

---

## Project structure

```
easy-read/
├── src/
│   ├── data/
│   │   ├── articles.ts        # bundled sentence-paired articles (EN + VN)
│   │   └── levels.ts          # WPM + scrollSpeedFactor per CEFR level
│   ├── lib/
│   │   ├── storage.ts         # Storage interface + LocalStorageAdapter
│   │   ├── speech.ts          # SpeechSynthesis wrapper, voice picker, error codes
│   │   ├── tokenize.ts        # word tokenizer + sentence-aware tokenizer
│   │   └── progress.ts        # favorites, completion, recent sessions + React hooks
│   ├── features/
│   │   ├── level-select/      # initial level picker
│   │   ├── article-list/      # articles per level (with star + completed badge)
│   │   ├── reading-session/   # the core karaoke + scroll view
│   │   ├── favorites/         # full Favorites screen
│   │   └── side-menu/         # left drawer (favorites entry, recent, levels)
│   ├── types.ts               # Level, Article, SessionRecord, UserPrefs
│   ├── App.tsx                # screen state + hash routing
│   ├── main.tsx
│   └── index.css              # Tailwind + paper texture + hidden scrollbar
├── index.html
├── tailwind / vite / tsconfig
└── README.md
```

---

## How the reading session works

The reading session is the heart of the app. It coordinates four things:

1. **Tokenization.** `tokenizeSentences()` joins all English sentences into a single TTS string with single-space separators, then tokenizes the joined string so each token has a global char offset. Each token also knows which sentence it belongs to. This means `SpeechSynthesis.onboundary.charIndex` can map cleanly back to a word index even when we resume TTS from a mid-article sentence (we just slice `ttsText` from the sentence's char offset and add that offset back to the boundary's charIndex).

2. **Continuous scroll engine.** A single `requestAnimationFrame` loop advances `container.scrollTop` by `pxPerSec × dt` per frame, where `pxPerSec` is recomputed each frame so the WPM slider applies live. The loop runs while `stateRef.current === 'playing'`. It stops when scroll reaches the natural max (`scrollHeight − clientHeight`), calls `handleEnd`, and the session is marked complete.

3. **First-and-last framing.** Top and bottom padding inside the scroll container equals `readerHeight / 2`, measured live via `ResizeObserver`. That lets the first sentence start at the middle of the frame and the last sentence sit in the upper half at the end (like end credits) — the user-requested "scroll up until finish" behavior.

4. **Mode-aware playback.**
   - **Bot reads** — calls `startTtsFromCurrentScroll()`. It looks at the scroll position, finds the nearest sentence, slices the TTS text from that sentence's char offset, picks a local voice (`pickPreferredVoice()` strongly prefers `localService: true` so Chrome's network voices aren't accidentally used), and starts speaking. Boundary events update the karaoke highlight. Errors are filtered: `interrupted` / `canceled` are benign and don't trigger a banner — only real failures show a "using timer-based highlight" message.
   - **Just scroll** — same scroll engine, no TTS.

Switching mode mid-playback **does not** restart — the scroll loop is mode-agnostic, so the page keeps gliding. Entering TTS mode while playing immediately starts the bot from the current sentence; leaving it just cancels the voice.

---

## Persistent data

All persistence flows through `src/lib/storage.ts` (one interface, swap implementations later).

| Key (localStorage `easy-read:*`) | Shape |
|---|---|
| `prefs` | `{ level, musicEnabled, musicVolume, favorites }` |
| `favorites` | `string[]` (article IDs) |
| `completed` | `string[]` (article IDs) |
| `sessions` | `SessionRecord[]` (last 50 reads, both opens and completions) |

`src/lib/progress.ts` holds in-memory `Set`s mirroring those keys plus a small pub/sub so React hooks (`useFavorite`, `useCompleted`, `useFavoriteIds`, `useRecentArticleIds`) re-render any subscribing component when the data changes.

---

## Customizing levels and scroll speed

Edit `src/data/levels.ts`:

```ts
A1: { level: 'A1', defaultWpm: 90,  minWpm: 60,  maxWpm: 130, scrollSpeedFactor: 0.8 },
A2: { level: 'A2', defaultWpm: 110, minWpm: 70,  maxWpm: 150, scrollSpeedFactor: 0.9 },
B1: { level: 'B1', defaultWpm: 140, minWpm: 90,  maxWpm: 190, scrollSpeedFactor: 1.0 },
B2: { level: 'B2', defaultWpm: 165, minWpm: 110, maxWpm: 220, scrollSpeedFactor: 1.05 },
C1: { level: 'C1', defaultWpm: 190, minWpm: 130, maxWpm: 260, scrollSpeedFactor: 1.1  },
C2: { level: 'C2', defaultWpm: 210, minWpm: 140, maxWpm: 300, scrollSpeedFactor: 1.15 },
```

- `defaultWpm` / `minWpm` / `maxWpm` — bounds of the in-session WPM slider.
- `scrollSpeedFactor` — multiplier on the wpm-derived scroll rate. `1.0` matches WPM; `<1` is slower; `>1` is faster. Clamped at `0.1`.

---

## Adding articles

Append to `src/data/articles.ts`:

```ts
{
  id: 'unique-slug',
  title: 'Title',
  description: 'One-line description.',
  level: 'B1',
  body: 'Full English text…',
  wordCount: 185,
  tags: ['nature', 'patience'],
  source: 'original',
  sentences: [
    { en: 'First English sentence.', vi: 'Câu tiếng Việt đầu tiên.' },
    { en: 'Second English sentence.', vi: 'Câu thứ hai.' },
    // …
  ],
}
```

Only `sentences` is consumed by the reading view (it joins them for TTS and renders each pair on its own line). `body` and `wordCount` are used by the article list (for estimated minutes) and as a fallback when `sentences` is missing.

For new topics at A1 → B2, use the generation prompt template in `english-reading-app-spec.md` §7.3 — it produces level-appropriate parallel passages with consistent facts, ready to paste in.

---

## Routes

| Route | Screen |
|---|---|
| `#/` | Level select |
| `#/level/A1` (…through `C2`) | Article list for that level |
| `#/read/<articleId>` | Reading session |
| `#/favorites` | Favorites list |

Refresh (F5) restores the screen. Browser back/forward walks the navigation history.

---

## Not in v1 (deferred)

Tracked in `english-reading-app-spec.md`:

- Background ambient music with ducking during narration / recording.
- Mic recording + self-vs-bot playback.
- Capacitor native build (Android / iOS).
- A NestJS + PostgreSQL backend as a future sync layer, replacing the local storage adapter with a syncing one.
- Automated pronunciation feedback (general STT for reading-accuracy is feasible on-device; per-phoneme scoring would require a cloud API).

---

## Content licensing

All bundled articles in this repo are `source: "original"` and were written from scratch. Per the spec, the project deliberately avoids copying text from commercial graded-reader sites. If you add content from VOA Learning English, Simple English Wikipedia, Wikinews, or Project Gutenberg, set the article's `source` field to the proper attribution string and surface it in the UI as required by the source's license.
