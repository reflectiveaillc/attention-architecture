# viralfreegames.com — Distribution strategy (2026-07-22)

## Part 1 — What actually worked for products like ours (researched)

### 1. The share artifact — Wordle
90 daily players → ~10M daily in 4 months, $0 marketing. The entire engine
was a **spoiler-free emoji grid** players pasted into group chats and
Twitter. Key detail: the emoji format was invented by PLAYERS (a New
Zealand group chat); Wardle noticed and built it into the game as a button.
Lesson: the share must (a) brag without spoiling, (b) be text — pastes
anywhere, (c) carry the game's name implicitly.

### 2. Creator seeding — agar.io / slither.io
Agar.io hit millions of dailies; when PewDiePie picked it up it was
"rocket fuel". Slither.io's dev had NO budget: he **emailed game links to
YouTubers directly** and gave free skins for sharing a link. Result: 68M
downloads in 3 months, 67M daily browser players. Lesson: creators want
CONTENT, not sponsorships — games that generate funny moments distribute
themselves through them. You pitch the moment, not the game.

### 3. Owned audience + accumulation — neal.fun
4M visits/month. Infinite Craft launched with ONE tweet → 21M views.
The Password Game: 10M+ plays largely from press writing about its
absurdity. Lesson: (a) every hit lifts the whole shelf — a site of many
small games compounds in a way single games can't; (b) press covers
*absurd angles*, not games ("a game that mocks password rules", "a
crafting game where AI invents the elements"). We already have Lab Rat —
"the game that narrates how it manipulates you" is a press angle sitting
in inventory.

### 4. Benchmark SEO — humanbenchmark.com
**3.19M visits/month, 46% from organic search**, top keywords: "reaction
time test", "reaction test". One-page tests, shareable percentile scores.
Lesson: tests outrank games because intent is searchable. Directly
validates our planned `/test/` vertical (reflex-duel, perfect-circle,
ten-seconds, scroll-sprint already ARE these products).

### 5. Portal syndication — Poki / CrazyGames
Poki ~60M MAU, CrazyGames 20-35M MAU. Both take HTML5 submissions,
rev-share ads, and offer boosts for time-limited exclusivity. Lesson:
portals are distribution + revenue + backlinks for $0. Submit B-tier
games (keep crown jewels + face games home-exclusive so the brand has a
reason to be visited directly).

### 6. The school/Chromebook ecosystem — Slope, Retro Bowl
"Unblocked games" is a massive, durable, self-organizing distribution
network: kids on managed Chromebooks playing lightweight no-download
browser games, mirrored across hundreds of sites for years. Lesson: we
don't market to it (never advertise filter-bypassing) — we just need to BE
what it selects for: instant load, no download, keyboard/tap controls,
tiny pages. Our games already qualify. If a few get famous, the ecosystem
copies them in and sends traffic for years.

### 7. The invite-link loop — skribbl.io private rooms
The private-lobby URL is the growth loop: one friend creates, five join.
Our `?dare=` challenge links are the single-player version — score battles
that travel as plain URLs through chat apps. Already built; barely used
(shares = 0 so far). This is the highest-leverage dormant asset.

## Part 2 — The playbook mix (proven plays, our order)

| Priority | Play | Stolen from | Our implementation |
|---|---|---|---|
| P0 | Emoji result grid + daily ritual | Wordle | share.js: spoiler-free emoji bar per game + "Daily Tilt" (same game+seed for everyone, streak counter) |
| P0 | /test/ benchmark pages | humanbenchmark | reframe reflex-duel, perfect-circle, ten-seconds, scroll-sprint as tests w/ percentiles |
| P0 | Portal submissions | slither/Poki | submit 10 B-tier games to CrazyGames + Poki w/ backlink to full catalog |
| P1 | Creator seeding | slither.io | DM small/mid streamers the FACE games ("play with your face" = perfect react content); offer custom skins/названий |
| P1 | Press absurd-angle pitches | neal.fun | Lab Rat ("the game that confesses its manipulation"), the calm engine story |
| P2 | School-durable builds | Slope | keyboard fallbacks, <100KB pages, offline-capable — then let the ecosystem find us |

## Part 3 — THE NEW STRATEGY: "The Wish Factory"

**Nobody else on earth can do this: we can ship a finished, validated,
clipped browser game in under 24 hours.** Every competitor's distribution
strategy assumes games are expensive to make. Ours aren't. So we invert
distribution: instead of making games and finding players, **we find one
person who publicly wished a game existed — and make their wish real.**

The loop:
1. **MINE** (extends `latent-game-mining`): scan Reddit/X/TikTok comments
   for "someone should make a game where…", "why is there no game that…",
   "petition for a game where…". These posts already have an audience
   primed to care.
2. **BUILD**: factory produces the game overnight (validation gate + clip
   QA as usual). The game credits the wisher IN-GAME: "wished by u/xyza
   on r/gaming, built in 19h 42m".
3. **DELIVER publicly**: reply to the original post: "you wished it — we
   built it: [link]". Post the build-timelapse clip to our channels.
4. **THE WISHER DISTRIBUTES**: a person who got a game made from their
   throwaway comment shares it everywhere. Their comment thread becomes
   our landing page. Zero ad spend, warm audience, built-in story.
5. **COMPOUND**: after ~10 deliveries, the FACTORY becomes the story —
   "the site that builds any game the internet wishes for, in a day" is a
   press/creator angle no single game can match (same dynamic that made
   Infinite Craft's AI-angle cover-worthy). Standing `/wish` page turns it
   into a permanent inbound channel; every delivered wish is a new SEO
   page ("the game where you ___" — queries with zero competition because
   the game didn't exist yesterday).

Why it wins: it converts our ONLY unfair advantage (production speed) into
distribution; every delivery manufactures an evangelist + a content moment
+ a zero-competition keyword; and it feeds the LOOP engine real demand
signals instead of guesses. Risk control: pick wishes that are buildable
in the one-tap grammar, publicly wholesome, and IP-clean; never build from
deleted/private posts; credit only with permission.

KPI per delivered wish: thread upvotes on delivery reply, referral
visitors from the thread (PostHog `src`), D1 return of that cohort, and
whether the wisher reposts. Target cadence once tooling is warm: 2-3
wishes/week.

## Sources
- https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy
- https://theygotacquired.com/gaming/wordle-acquired-by-the-new-york-times/
- https://gamesbeat.com/the-surprising-momentum-behind-io-games-like-agar-io/
- https://root-nation.com/en/games-en/games-articles-en/en-slither-io-and-agar-io-behind-the-game-scene/
- https://en.wikipedia.org/wiki/Slither.io
- https://en.wikipedia.org/wiki/Neal_Agarwal
- https://en.wikipedia.org/wiki/Infinite_Craft
- https://en.wikipedia.org/wiki/The_Password_Game
- https://www.semrush.com/website/humanbenchmark.com/overview/
- https://developer.crazygames.com/
- https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-
- https://vicky.dev/classroom-6x-unblocked-games/
