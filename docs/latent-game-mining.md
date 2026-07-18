# Latent-Game Mining — pain-diving adapted from ads to games

> Source strategy: `~/Desktop/DESKTOP_ARCHIVE_2025_PRE_SSOT/how to write ads/`
> (Native Mini Sales Letter framework + pain-diving prompts). This doc adapts it
> to find **games on the thin layer of reality — games users already play in
> their heads that nobody has built.**
> Runner: `engine/night/mine_latent.py` (authed via reddit-direct session).
> First harvest: `engine/state/mined/latent-20260717-1041.json` + `synthesis-*.md`.

## The mapping (ads playbook → game factory)

| Ads playbook step | Game-factory equivalent |
|---|---|
| Start with pain, not products | Start with the *underlying* misery (doomscroll shame, lost hours, dissociation) — NOT with game genres |
| Find 20 forum posts about the emotional pain | `mine_latent.py` bucket `pain` (r/nosurf, r/digitalminimalism) |
| Read Amazon 1-star reviews of existing solutions | Bucket `failed_fixes`: blockers, screen-time limits, detoxes that got bypassed ("you just disable it") — each complaint = an angle |
| Mass instinct vs mass **technological** desire | Doomscrollers are PRODUCT-AWARE (they tried Headspace/blockers/cold turkey). Their desire is technological: "give me the itch-scratch WITHOUT the trap" |
| Latent demand ("nobody sells this yet") | Bucket `latent_games`: "I wish there was…", cozy-gaming slumps ("I want to play but everything asks too much"), celebrated no-ads/no-IAP launches |
| Verbatim language bank | pain_score regex + manual read of comments (the gold is in the replies — confirmed: the "no edges" line was a comment, not a post) |
| UMP (hidden reason solutions fail) | See synthesis: **the feed has no edges** — no ending signal; blockers add walls, not endings; walls get climbed |
| UMS (why ours works) | A game that meets the same neural path (thumb, soft variable reward) but **ends by design** — it doesn't block the itch, it *finishes* it |
| Avatar + 5 distinct mass desires | See synthesis doc per harvest |
| Copy lead formula ("worst part isn't X, it's Y") | Hook-video scripts + copy.md: "The worst part isn't the wasted hours. It's not remembering them." |

## Standing loop (repeatable)

1. `cd ~/Dev/influencer-op/ops/reddit-direct && uv run --with patchright python /Users/manuel/coo/attention-architecture/engine/night/mine_latent.py`
2. Manually read top posts + comments (≥30 min — AI-only reading misses the gold; the playbook is explicit and it proved true on harvest #1).
3. Write/append `engine/state/mined/synthesis-<date>.md`: verbatim bank, avatar, UMP/UMS, 5 desires, latent-game concepts.
4. Wire winners: trend in `engine/state/trends.json` (+ concept in `engine/stages/ideate.mjs`) → worker prompt in `engine/night/prompts/` **seeded with the verbatim language** → factory run.
5. The game's copy.md and hook clip must use the avatar's literal words (ICP voice-mining play, same as AIBG).

## Rate + hygiene

- reddit-direct authed session, ~2.5s between calls, ≤60 calls/hr (account-rotation memory applies).
- Searches use `t=month` — signal stays fresh; re-run the miner weekly.
- Never engage/post from the mining session. Read-only.
