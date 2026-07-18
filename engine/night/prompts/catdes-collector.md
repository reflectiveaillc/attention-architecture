You are a game-design worker for the Tilt factory (attention-architecture). Your ONLY deliverable is ONE file:

`engine/state/designs/cat-collector.json` — a PURE JSON array (no markdown, no comments, no trailing commas) of exactly 20 game designs, ALL for the single category below.

READ FIRST:
1. `engine/state/categories.json` — find the category with `id: "collector"`. Internalize its trait, algo_hook, wean, and mechanics.
2. `engine/state/design-backlog.json` — the existing designs; do NOT duplicate any `id` or reuse a mechanic that's already there.
3. `docs/circuits.md` — the 8 attention circuits.

## The category you are designing for

id: collector · label: Completionist · engine_lean: calm
trait: set-completion drive; gotta-collect-them-all, fill the shelf
algo_hook: fed hauls, unboxings, and gacha bait that dangle incomplete sets to keep them buying/scrolling
wean: a finite, free, completable collection — the satisfaction of a full set with no money and no infinite dangle
mechanics: collect the set, fill the grid, no-cash gacha, completion meter, shelf/garden that finishes

## The thesis (every design must honor it)

The social-media algorithm ALREADY farms this exact cognitive trait (see algo_hook). Your 20 games meet that same circuit but deliver the payoff in a bounded, self-contained session that ENDS — the wean (see wean). The player's nervous system already knows this craving; the game satisfies it honestly instead of trapping it.

Constraints: one-mechanic, one-thumb, 405x720 canvas, zero external assets, sessions under 3 min, single-HTML-file buildable, no servers/accounts (dare-links only).

## Schema (every design, exactly these fields)

```json
{
  "id": "kebab-case-unique",
  "name": "SHORT PUNCHY NAME",
  "category": "collector",
  "engine": "viral" | "calm",
  "conditioned_path": "the specific IG/TikTok habit or feed-pattern this hijacks",
  "mechanic": "1-2 sentences: what the thumb does + why it satisfies THIS trait",
  "circuits": ["01-rpe", "..."],
  "video_trick": "the ONE psych trick the hook clip uses",
  "dare_unit": "shareable score unit (e.g. 'ms','%','streak','pieces') or null for calm",
  "build_cost": "S" | "M"
}
```

Rules:
- 20 designs, all meaningfully different from each other and from the existing backlog.
- Every mechanic must genuinely serve THIS category's trait — a Reflexes game must test reaction; an Order & Symmetry game must scratch the completion/alignment itch; a Wind-Down game must actually dim/slow toward sleep.
- Lean the category's `engine_lean` but a few off-lean designs are welcome where they fit.
- Concrete beats clever. IDs unique and descriptive.

Write the JSON file now. Do not modify ANY other file. Output only "CATEGORY DONE: collector x20" when finished.
