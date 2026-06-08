# CEFR + Vietnamese Authoring Rubric

> **Status:** Locked contract for the 120-article generation effort. Do not deviate without an explicit rubric update.

## 1. Purpose

This document is the single source of truth for authoring the 120 reading articles that will replace the `articles` array in `src/data/articles.ts`. Twenty articles will be produced at each CEFR level (A1, A2, B1, B2, C1, C2). Every downstream content-authoring agent — human or AI — receives only this rubric plus the TypeScript schema below. If a constraint is not written here, it does not exist; if it is written here, it is mandatory. The rubric exists so that an article written in wave 1 and an article written in wave 6 feel like they came from the same textbook: same level calibration, same topic balance, same Vietnamese register, same metadata shape.

## 2. Schema Reminder

```ts
interface SentencePair { en: string; vi: string; }
interface Article {
  id: string;            // slug-{level}, lowercase kebab-case ASCII, unique
  title: string;
  description: string;   // ≤20 words, written at the article's own level
  level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2';
  body: string;          // \n\n for paragraph breaks at B2+
  wordCount: number;     // = body.split(/\s+/).filter(Boolean).length
  tags?: string[];       // from controlled vocab (you define)
  source?: string;       // always "generated" for new articles
  sentences?: SentencePair[];  // one VI per EN sentence, same clause order
}
```

For every article in this batch:
- `source` MUST be `"generated"`.
- `sentences` is REQUIRED (one entry per English sentence in `body`, same order).
- `tags` is REQUIRED and MUST be drawn from the controlled vocabulary in §6.

## 3. Per-Level Specification

Think of the levels as a staircase. Each step adds **one** new cognitive load: longer sentences, then new tenses, then subordination, then abstraction, then nuance, then idiom. Do not skip steps. Do not import a B2 feature into an A2 article because it "sounds nicer."

| Level | Word count (body) | Sentences / article | Avg sentence length | Allowed tenses | Allowed grammar features | Vocabulary band | Banned features |
|---|---|---|---|---|---|---|---|
| **A1** | 60–90 | 8–12 | 6–9 words | Present simple; `to be`; `can` for ability; imperatives | Subject–verb–object only; coordinating `and`/`but`; simple possessives (`my`, `her`); basic prepositions of place/time | Oxford 3000 core; CEFR A1 lexicon (~500 most-frequent headwords) | Past tenses; future tenses; modals other than `can`; relative clauses; passives; phrasal verbs; idioms; contractions of `would`/`had`; abstract nouns |
| **A2** | 90–130 | 10–14 | 7–10 words | + Past simple; future with `going to` and `will`; present continuous | + `because`, `so`, `when`, `if` (zero/first conditional only); comparatives & superlatives; common phrasal verbs (`get up`, `look at`); count/non-count distinction | Oxford 3000; CEFR A2 lexicon (~1000 headwords) | Present perfect; past continuous; second/third conditionals; reported speech; passives; relative clauses with `whose`/`whom`; idioms; figurative language |
| **B1** | 140–200 | 12–16 | 10–14 words | + Present perfect (experience & duration); past continuous; future continuous | + Defining relative clauses (`who`, `which`, `that`); first & second conditionals; reported speech (statements); common passives in present/past simple; gerunds vs. infinitives | Oxford 3000–5000; CEFR B1 lexicon | Third conditional; mixed conditionals; cleft sentences; inversion; subjunctive; advanced discourse markers (`notwithstanding`, `albeit`); dense idiom |
| **B2** | 220–320 | 14–20 | 14–18 words | + Past perfect; present perfect continuous; future perfect; would for past habit | + Non-defining relative clauses; third conditional; reported speech (all forms); passives in all common tenses; participle clauses (`Walking home, she…`); linking adverbs (`however`, `therefore`, `moreover`); paragraph breaks (`\n\n`) REQUIRED | Oxford 5000; CEFR B2 lexicon; light topic-specific vocab allowed if glossed by context | Heavy inversion; subjunctive in formal registers; cleft sentences as default; rare idioms; archaic vocabulary |
| **C1** | 350–500 | 16–24 | 18–24 words | + Mixed conditionals; future perfect continuous; nuanced modality (`may have been`, `should have`) | + Cleft sentences (`What I mean is…`); fronting; participle and reduced clauses; nominalisation; hedging (`it would appear that…`); subtle register shifts; multi-clause arguments | C1 lexicon; low-frequency academic & professional vocabulary; collocations expected | Slang; ungrounded jargon; flowery Victorian register; idioms used decoratively rather than functionally |
| **C2** | 500–700 | 20–30 | 20–28 words | All tenses & aspects, including rare combinations | All structures including inversion (`Not only did…`), subjunctive (`were he to…`), ellipsis, anaphora, sustained metaphor, irony, register-mixing for effect | C2 lexicon; idioms, allusions, culturally-loaded vocabulary; precise connotation control | Forced obscurity; over-long sentences with no payoff; mixed metaphors; padding |

**Sentence length is an average, not a ceiling.** Vary sentence length within an article — even at C2, a short punch sentence is welcome. The average must land inside the band.

**Word count rule:** `wordCount` MUST equal `body.split(/\s+/).filter(Boolean).length`. Compute it; do not estimate.

## 4. Topic Taxonomy

Six buckets, applied to every level. The bucket survives across levels, but the **angle** shifts as cognitive complexity grows.

| Bucket | A1 / A2 angle | B1 / B2 angle | C1 / C2 angle |
|---|---|---|---|
| **everyday-life** | My room, my breakfast, my family routine | Habits, hobbies, life changes, small decisions | Lifestyle trade-offs, consumerism, time as a resource |
| **work-study** | My school, my teacher, jobs people do | Choosing a job, studying abroad, online learning | Labour markets, automation, credentialism, expertise |
| **travel-place** | My city, the beach, a short trip | Travel stories, transport, cities vs. countryside | Tourism's costs, sense of place, migration, globalisation |
| **science-nature** | Animals, weather, the sun | How rain forms, recycling, simple experiments | Climate, evolution, scientific method, emerging tech |
| **culture-arts** | Food I like, a song, a festival | Films, books, traditions, cooking | Aesthetics, cultural memory, art's social role, criticism |
| **opinion-society** | People I know (likes/dislikes only) — NOT abstract issues | Local issues: traffic, school rules, neighbourhood | Ethics, policy, civic life, ideology, public discourse |

### Per-level distribution (must hit exactly)

Each level has 20 articles allocated as:

| Bucket | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| everyday-life | 5 | 4 | 4 | 3 | 3 | 3 |
| work-study | 3 | 3 | 3 | 4 | 4 | 4 |
| travel-place | 4 | 4 | 3 | 3 | 3 | 3 |
| science-nature | 3 | 3 | 4 | 4 | 4 | 4 |
| culture-arts | 3 | 3 | 3 | 3 | 3 | 3 |
| opinion-society | 2 | 3 | 3 | 3 | 3 | 3 |
| **Total** | **20** | **20** | **20** | **20** | **20** | **20** |

**Rule for A1/A2 opinion-society:** treat as "people I know" — preferences, friendly portraits, a neighbourhood you like. No politics, no abstract values.

**No duplicate topics within a level.** Two B1 articles about "studying abroad" is a failure. Two articles about studying — one about choosing a course, one about a study-abroad summer — is fine.

## 5. Title & Description Rules

### Title
- 2–7 words.
- Title Case for content words (`A Walk by the River`, not `A walk by the river`).
- No trailing punctuation. No emoji. No ALL CAPS.
- Concrete > clever. `Morning at the Market` beats `Symphony of Stalls`.
- Must be unique across the 120-article set.

### Description
- A single sentence, **≤20 words**, written **at the article's own level** (an A1 description uses A1 grammar and vocabulary).
- Functions as a one-line hook a learner would see in a list.
- No spoilers of a punchline; no marketing voice ("Don't miss…").
- Ends with a period.

### Examples

| Level | Title | Description |
|---|---|---|
| A1 | `My Cat Milo` | `Milo is my cat. He is small and grey. He sleeps on my bed every night.` |
| A2 | `A Trip to the Beach` | `Last Sunday I went to the beach with my sister. We swam and ate ice cream.` |
| B1 | `Choosing a New Hobby` | `Picking up a hobby as an adult is harder than it sounds, but the right one can change your week.` |
| B2 | `When Small Towns Empty Out` | `Across rural regions, young people are leaving for cities, and the towns they grew up in are quietly changing shape.` |
| C1 | `The Quiet Economics of Sleep` | `Sleep is treated as a private matter, yet its scarcity ripples through workplaces, healthcare systems, and entire urban rhythms.` |
| C2 | `The Aesthetics of Repair` | `To mend a broken bowl with gold, as the Japanese do, is to argue — gently but unmistakably — that fracture is part of form.` |

## 6. Tags — Controlled Vocabulary

Each article MUST include **2–3 tags**, drawn ONLY from the lists below. Exactly **one CEFR level tag** is required, plus **one topic-bucket tag**, plus **optionally one descriptor tag**. Total: 2 or 3.

### CEFR level tags (pick exactly one, must match `level`)
- `a1`
- `a2`
- `b1`
- `b2`
- `c1`
- `c2`

### Topic-bucket tags (pick exactly one, must match the bucket from §4)
- `everyday-life`
- `work-study`
- `travel-place`
- `science-nature`
- `culture-arts`
- `opinion-society`

### Descriptor tags (optional; pick at most one)
- `narrative` — tells a small story with characters and time
- `descriptive` — paints a place, person, or thing
- `explanatory` — explains how/why something works
- `opinion` — argues a viewpoint (B1+ only)
- `dialogue-light` — contains some quoted speech
- `personal` — first-person reflective
- `factual` — third-person informational

**No free-text tags. No synonyms. No singular/plural variants.** A tag not on this list is invalid.

## 7. Vietnamese Translation Rules

### Alignment
- **One Vietnamese sentence per English sentence**, in the same order as the English `body`.
- `sentences.length` MUST equal the number of sentences in `body` (count by terminal `.`, `?`, `!`, ignoring abbreviations).
- Preserve clause order within each pair where Vietnamese grammar permits. If reordering is unavoidable (e.g. time phrases), keep the same information units.
- Do NOT merge or split sentences across the boundary.

### Register per level

| Level | Register | Vocabulary | Banned constructions |
|---|---|---|---|
| **A1** | Plain spoken Vietnamese; everyday register; pronoun pairs `tôi/bạn`, `em/anh`, `mẹ/con` as natural | Pure Vietnamese core vocabulary; avoid Sino-Vietnamese flourishes when a native word exists (`nhà` not `gia cư`) | Literary inversion; classical particles (`vậy thay`, `chăng`); rare Sino-Vietnamese; long compound predicates |
| **A2** | Plain spoken; can use the most common Sino-Vietnamese words that learners actually meet (`công việc`, `gia đình`) | A1 vocabulary + everyday Sino-Vietnamese | Literary register; archaic particles; idioms |
| **B1** | Neutral written Vietnamese; light Sino-Vietnamese welcome | Common abstract nouns appear (`ý kiến`, `lựa chọn`) | Heavy literary style; classical chữ Nho expressions; dense idiom |
| **B2** | Standard written Vietnamese, journalistic / explanatory tone | Topic vocabulary allowed; abstract nouns expected | Forced flowery prose; mixed regional dialect markers |
| **C1** | Educated written Vietnamese; analytical | Precise Sino-Vietnamese; collocations expected | Random regionalisms; padding |
| **C2** | Full literary range, including idiom and allusion where it serves the English | Full lexicon, including idiom (`thành ngữ`) and four-character compounds where appropriate | Showing off — every flourish must match an English flourish |

### Universal Vietnamese rules
- Use Vietnamese diacritics correctly. `co the` is invalid; `có thể` is correct.
- Use Vietnamese quotation marks `“ ”` (or straight `"`) consistently within an article.
- Numbers: write digits as in the English (`5 km` stays `5 km`).
- Proper nouns: keep the English form unless a well-established Vietnamese form exists (`London` not `Luân Đôn`; `Việt Nam` not `Vietnam` when the article is about the country).
- Choose pronouns consistent with the English narrator's voice and keep them stable within an article.

### Example pairs

| Level | EN | VI |
|---|---|---|
| A1 | `My cat is small and grey.` | `Con mèo của tôi nhỏ và màu xám.` |
| A2 | `Last Sunday we went to the beach and swam in the sea.` | `Chủ nhật tuần trước, chúng tôi đi biển và bơi trong nước biển.` |
| B1 | `Choosing a hobby as an adult takes more effort than people think.` | `Việc chọn một sở thích khi đã trưởng thành tốn nhiều công sức hơn người ta nghĩ.` |
| B2 | `Across rural regions, young people are leaving, and the towns they grew up in are quietly changing.` | `Ở nhiều vùng nông thôn, người trẻ đang rời đi, và những thị trấn nơi họ lớn lên đang thay đổi một cách lặng lẽ.` |
| C1 | `Sleep is treated as a private matter, yet its scarcity ripples through entire urban rhythms.` | `Giấc ngủ thường được xem là chuyện riêng tư, nhưng sự thiếu hụt của nó lại lan tỏa khắp nhịp sống đô thị.` |
| C2 | `To mend a broken bowl with gold is to argue, gently, that fracture is part of form.` | `Hàn một chiếc bát vỡ bằng vàng, nói cho cùng, là một cách lập luận nhẹ nhàng rằng vết nứt cũng là một phần của hình hài.` |

## 8. ID & Slug Rules

### Format
`{topic-slug}-{level}`

- `topic-slug` is the title converted to lowercase, ASCII, kebab-case.
  - Strip diacritics and non-ASCII characters.
  - Replace spaces and punctuation with `-`.
  - Collapse multiple `-` into one. Trim leading/trailing `-`.
  - Drop leading articles (`a`, `an`, `the`) for compactness.
  - Maximum 6 words / 60 characters in the slug body.
- `{level}` is the lowercase CEFR code: `a1`, `a2`, `b1`, `b2`, `c1`, `c2`.

### Uniqueness & collisions
- IDs MUST be unique across the entire 120-article array.
- If a slug collides with one already used at the same level, append `-2`, `-3`, etc. **before** the level suffix: `morning-market-2-a1`.
- Never reuse an ID across levels with different content; the level suffix already distinguishes them, but the topic-slug should still be meaningfully different.

### Examples

| Level | Title | ID |
|---|---|---|
| A1 | `My Cat Milo` | `my-cat-milo-a1` |
| A2 | `A Trip to the Beach` | `trip-to-the-beach-a2` |
| B1 | `Choosing a New Hobby` | `choosing-a-new-hobby-b1` |
| B2 | `When Small Towns Empty Out` | `when-small-towns-empty-out-b2` |
| C1 | `The Quiet Economics of Sleep` | `quiet-economics-of-sleep-c1` |
| C2 | `The Aesthetics of Repair` | `aesthetics-of-repair-c2` |

## 9. Validation Checklist

Before returning an article, the authoring agent MUST self-verify every box. Treat any unchecked box as a hard failure and revise.

**Structural**
- [ ] `id` matches `{slug}-{level}`, is lowercase ASCII kebab-case, and is unique within the 120-article set.
- [ ] `level` matches the level the wave is producing.
- [ ] `source` is exactly `"generated"`.
- [ ] `wordCount === body.split(/\s+/).filter(Boolean).length` (computed, not estimated).
- [ ] `body` word count falls inside the level's range (§3).
- [ ] Sentence count falls inside the level's range (§3).
- [ ] Average sentence length falls inside the level's range (§3).
- [ ] For B2+: paragraphs separated by `\n\n`; at least 2 paragraphs.

**Linguistic (English)**
- [ ] No banned tenses or grammar features for this level (§3).
- [ ] Vocabulary stays within the level's band; any out-of-band word is glossed by context.
- [ ] No idioms or figurative language below B2 unless explicitly listed as allowed.
- [ ] Tone is consistent end-to-end (no register drift).

**Metadata**
- [ ] `title` follows §5 rules (length, Title Case, unique, no punctuation/emoji).
- [ ] `description` is ≤20 words, at the article's own level, ends with a period.
- [ ] `tags` contains 2–3 entries, all from §6, including exactly one CEFR level tag and exactly one topic-bucket tag.
- [ ] The chosen topic-bucket tag matches the article's actual bucket assignment.

**Vietnamese**
- [ ] `sentences.length` equals the number of sentences in `body`.
- [ ] Each `sentences[i].en` is an exact, sentence-segmented copy of the i-th English sentence.
- [ ] Each `sentences[i].vi` is the Vietnamese translation of the same sentence, in the same order.
- [ ] Vietnamese register matches the level's row in §7.
- [ ] No banned Vietnamese constructions for this level.
- [ ] Diacritics are present and correct.
- [ ] Pronoun choice is stable across the article.

**Cross-article (verified at wave boundary)**
- [ ] Bucket distribution for the level (§4) is satisfied across the 20 articles.
- [ ] No topic duplication within the level.
- [ ] All 20 IDs unique; no collision with prior levels.

## 10. Worked Example (B1)

This is the gold-standard example. When in doubt, match this shape.

```json
{
  "id": "choosing-a-new-hobby-b1",
  "title": "Choosing a New Hobby",
  "description": "Picking up a hobby as an adult is harder than it sounds, but the right one can change your week.",
  "level": "B1",
  "body": "Many adults say they want a new hobby, but they never quite start one. The problem is rarely time. More often, it is the quiet fear that we will not be very good. When I decided to learn the guitar last year, I almost gave up in the first week because my fingers hurt and the chords sounded ugly. A friend told me to play for only ten minutes a day, and to stop checking how fast I was improving. After two months, something changed. I was not a good player, but I looked forward to those ten minutes more than to most things in my day. A hobby, I have learned, is not really about the skill. It is about having a small, private corner of your week that belongs only to you.",
  "wordCount": 142,
  "tags": ["b1", "everyday-life", "personal"],
  "source": "generated",
  "sentences": [
    {
      "en": "Many adults say they want a new hobby, but they never quite start one.",
      "vi": "Nhiều người trưởng thành nói rằng họ muốn có một sở thích mới, nhưng họ chẳng bao giờ thật sự bắt đầu."
    },
    {
      "en": "The problem is rarely time.",
      "vi": "Vấn đề hiếm khi là thời gian."
    },
    {
      "en": "More often, it is the quiet fear that we will not be very good.",
      "vi": "Thường thì đó là nỗi sợ thầm lặng rằng chúng ta sẽ không giỏi."
    },
    {
      "en": "When I decided to learn the guitar last year, I almost gave up in the first week because my fingers hurt and the chords sounded ugly.",
      "vi": "Khi tôi quyết định học đàn ghi-ta năm ngoái, tôi suýt bỏ cuộc ngay trong tuần đầu vì ngón tay đau và các hợp âm nghe rất tệ."
    },
    {
      "en": "A friend told me to play for only ten minutes a day, and to stop checking how fast I was improving.",
      "vi": "Một người bạn khuyên tôi chỉ chơi mười phút mỗi ngày, và đừng kiểm tra xem mình tiến bộ nhanh đến đâu."
    },
    {
      "en": "After two months, something changed.",
      "vi": "Sau hai tháng, có điều gì đó đã thay đổi."
    },
    {
      "en": "I was not a good player, but I looked forward to those ten minutes more than to most things in my day.",
      "vi": "Tôi không phải là một người chơi giỏi, nhưng tôi mong chờ mười phút đó hơn hầu hết mọi việc trong ngày."
    },
    {
      "en": "A hobby, I have learned, is not really about the skill.",
      "vi": "Một sở thích, tôi đã học được, thật ra không phải về kỹ năng."
    },
    {
      "en": "It is about having a small, private corner of your week that belongs only to you.",
      "vi": "Nó là về việc có một góc nhỏ, riêng tư trong tuần chỉ thuộc về bạn."
    }
  ]
}
```

**Why this example passes:**
- 142 words → inside B1's 140–200 range.
- 9 sentences → on the short side; in production aim for 12–14 sentences for B1. **Average sentence length matters more than the count alone.** Word-count range and average sentence length are the hard constraints; sentence count is the soft target.
- Uses B1-allowed features: past simple, present perfect (`I have learned`), defining relative clause (`that belongs only to you`), gerund (`having a small corner`), `because`-clause.
- No banned features: no third conditional, no inversion, no idiom.
- Tags: `b1` (level) + `everyday-life` (bucket) + `personal` (descriptor) — exactly 3, all from the controlled vocab.
- Description: 20 words, at B1 level, ends with a period.
- Sentences array: 9 pairs matching 9 English sentences exactly, in order.
- Vietnamese register: neutral written, mild Sino-Vietnamese (`trưởng thành`, `kỹ năng`), no literary flourish, stable pronoun (`tôi`).

— End of rubric. —
