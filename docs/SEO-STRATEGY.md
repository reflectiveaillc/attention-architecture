# viralfreegames.com — SEO strategy (2026-07-21)

## The game we can win

We cannot outrank Poki/CrazyGames/Coolmath (DR 90+) on "free online games".
We CAN win because we have three assets they don't:

1. **A registry with psychological facets.** 383 games pre-tagged by state
   (anxiety, insomnia, sensory, memory, reflexes…) and engine (viral/calm).
   Nobody else can generate honest "games for X mental state" collections
   at this depth — the big portals organize by genre (racing, puzzle), not
   by *how the player wants to feel*. Intent-based collections are the moat.
2. **Genuinely novel inventory.** Face-controlled games ("games you play
   with your face") have near-zero keyword competition and real curiosity
   demand. The calm/wean engine ("games to help you stop doomscrolling")
   is a vertical no games portal touches.
3. **A factory.** When a keyword gap is found, the LOOP engine can BUILD the
   game that answers it in hours. SEO demand → `next-concepts.json` →
   new game + page. No competitor can close content gaps with new products.

## Layer 1 — technical foundation (SHIPPED in deploy.mjs)

- `sitemap.xml` + `robots.txt`, generated from the registry every build
- Keyword titles + honest meta descriptions on all 383 `/g/` pages
  (was: "Perfect Circle — Tilt" + internal jargon leaking into desc)
- JSON-LD: `VideoGame` + `FAQPage` on every game hub, `CollectionPage` +
  `ItemList` on collections, `WebSite` on the homepage (GEO/AEO: this is
  what AI Overviews, Perplexity and ChatGPT browse read)
- Canonical from thin `/games/<id>/` play pages → their `/g/<id>` hub
- Internal linking mesh: game → its collections, collections → games,
  homepage footer → all collections

## Layer 2 — intent collections (SHIPPED, /best/<slug>)

Each collection = keyword-targeted hub: answer-shaped intro (AI-quotable),
game grid, FAQ block with schema. Registry-driven; new games auto-appear.

| slug | target keyword family | inventory |
|---|---|---|
| games-to-play-when-bored | bored button, quick games when bored | all |
| 1-minute-games | 1 minute games, quick browser games no download | viral |
| calming-games | calming games online free | calm engine |
| anxiety-relief-games | games for anxiety relief | anxiety |
| games-to-fall-asleep | games to play in bed / can't sleep | insomnia |
| fidget-games | fidget games online, dopamine games | adhd |
| oddly-satisfying-games | oddly satisfying games | ocd |
| sensory-games | sensory games online, sensory-friendly | sensory+autism |
| memory-test-games | memory test games, number memory | memory |
| reaction-time-games | reaction time test game | reflexes |
| rhythm-games | free rhythm games no download | rhythm |
| face-control-games | games you play with your face ⭐ zero comp | face |
| precision-games | perfect circle test, precision games | perfectionist |
| weird-games | weird games on the internet, strange sites | curiosity |
| challenge-a-friend-games | games to challenge friends | competitor |

Naming is deliberately non-clinical (adhd→fidget, ocd→oddly-satisfying,
autism+sensory→sensory). No medical claims anywhere — "designed to feel
calming", never "treats/helps anxiety".

## Layer 3 — verticals not yet explored (next builds)

1. **Benchmark/test aliases** ⭐ highest volume play. "Reaction time test"
   (~500k+/mo family), "draw a perfect circle" (proven viral: vole.wtf),
   "stop at 10 seconds", "scroll speed test", "number memory test".
   Play: dedicated `/test/<name>` landing pages that ARE the existing games
   reframed as tests with percentile results + share cards. reflex-duel,
   perfect-circle, ten-seconds, scroll-sprint, memory games already exist.
2. **Spanish mirror** (`/es/`). "juegos gratis sin descargar", "juegos para
   la ansiedad" — far thinner competition; Manuel is bilingual; LatAm
   mobile traffic is huge and monetizes via the same loop.
3. **Anti-doomscroll positioning.** "apps to stop doomscrolling",
   "healthy phone habits games" — the calm engine's story is press-worthy
   (the factory that builds attention traps also builds the antidote).
   This is a linkable-asset / digital-PR play, not just a keyword.
4. **Embeds.** One-line `<iframe>` embed for any game + "add this game to
   your site" page → backlinks from teachers/bloggers/newsletters.
5. **Latent-demand keyword loop** (extends latent-game-mining): mine
   "that game where you ___" queries from Reddit/autocomplete → if no game
   exists, the factory builds it → page ships same week. SEO gap → product.
6. **GSC wiring**: verify domain (DNS is on Vercel — TXT record is one CLI
   command) + submit sitemap + weekly query mining into the signal stage.

## Operating loop

Weekly: GSC queries → which collections/tests get impressions →
double down (more games in that category via feed) → new collections for
rising queries. The SEO layer regenerates on every `loop.mjs site` build,
so the sitemap/collections are always in sync with the registry.
