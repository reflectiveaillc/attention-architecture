# Creator seeding runbook (the slither.io play)

Principle (from slither.io → PewDiePie): you don't pitch the game, you pitch
**the funny moment the creator gets to have on camera**. Face games are the
weapon: the reaction shot and the gameplay are the same shot.

## Target archetypes (in priority order)
1. **Small/mid react & variety streamers (1k–50k followers, Twitch/YouTube).**
   They reply to DMs, they need cheap content, one clip can carry a week.
   Discovery: Twitch directory "Just Chatting"/"Games + Demos" small rooms;
   YouTube search "browser games" sorted by upload date, channels 5k-100k.
2. **TikTok gaming/react creators (10k–200k).** Format fit: 15-60s rounds.
   Discovery: search "face filter game", "browser game", "games to play when
   bored" — creators already posting adjacent content convert best.
3. **Couple/friend-group channels.** The duel format (same dare link, loser
   forfeit) is made for them.
4. **Spanish / German / Japanese micro-creators** — we now have localized
   landing pages; non-EN creator inventory is far less saturated.

## The pitch (short, moment-first — adapt per channel)
Subject / DM opener: **"a game you play with your eyebrows (free, browser, 30s)"**

> Saw your [specific video]. We build tiny browser games where the camera is
> the controller — smile to flap, look away to dodge. Losing makes a better
> clip than winning. Three that fit your format: [flappy-face] [look-away]
> [brow-lift]. Free, no keys, no sponsorship ask — if you want, we'll build
> a custom version with your name/colors in 24h. One link, plays in the
> browser: viralfreegames.com/creators

Rules: reference ONE specific piece of their content (no template stink);
never ask for a post; offer the custom variant only in the first message if
the channel is >20k. Track every creator with their own link:
`viralfreegames.com/best/face-control-games?src=cr-<handle>` (shows up in
PostHog `src`).

## The escalation gift
For any creator who posts organically: build them a named variant within
48h ("<Handle>'s Gauntlet") and DM it. That's the slither.io skins move —
the reward is distribution-shaped: their name in a game = they share again.

## Cadence + KPI
- 10 personalized DMs/emails per week max (quality over spray).
- KPI per creator: `src=cr-<handle>` visitors, D1 return of that cohort,
  and whether a second post happens without being asked.
- Log every contact + outcome in this repo: `engine/state/creator-log.json`
  (create on first send: [{handle, platform, date, link, result}]).

⬜ Manuel decisions before first send: (1) which identity sends (the
reflectiveaillc email vs a "Tilt" persona — brand-persona-governance call);
(2) green-light the first 10 targets when presented.
