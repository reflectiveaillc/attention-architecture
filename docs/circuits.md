# The 8 Attention Circuits

> Source: `/Users/manuel/coo/attention-architecture/docs/circuits.md`
> Companion site: `web/attention-dossier.html`

The framework LOOP is built on. Eight known neurological circuits an interface can fire on demand. Each was built by evolution for survival; a screen can trigger it for engagement. Ordered by leverage.

## Operating models (scaffolding)

- **Eyal's Hooked loop:** Trigger → Action → Variable Reward → Investment. The investment phase personalizes the next trigger and raises the cost of leaving.
- **Fogg:** B = M · A · P (Motivation × Ability × Prompt). A behavior fires only when all three clear a threshold at once.
- **Kahneman:** System 1 (fast, automatic, impulsive) acts; System 2 (slow, deliberate) vetoes. Social media is almost entirely a System-1 attack surface. The craft is preventing System 2 from waking up.

> The whole craft reduces to one sentence: **get System 1 to act before System 2 can intervene.**

## The circuits

### 01 — Dopamine / Reward Prediction Error  ·  CRITICAL
- **Circuit:** Dopamine encodes the *gap* between predicted and actual reward (Schultz). Unpredicted reward spikes; predicted reward that fails to arrive crashes the signal. It's anticipation, not pleasure.
- **Exploit:** **Variable reward.** Predictable rewards habituate; unpredictable ones fire indefinitely. Variable-ratio reinforcement is the most extinction-resistant schedule known — it's how slot machines work, and how feeds work.
- **Deployed in:** infinite scroll, pull-to-refresh, deliberately mixed-quality feeds, vague notifications ("someone reacted to your post").

### 02 — Novelty / Orienting Response  ·  HIGH
- **Circuit:** Novel stimuli trigger the orienting response — a brief spike of attention before the brain decides whether something matters. VTA dopamine flags *new* as opportunity-or-threat by default. At the 200ms decision point the brain can't tell novel from meaningful.
- **Exploit:** **Novelty without depth.** Refresh the surface without refreshing the substance. Re-novely: periodically churning format re-novelties the whole population at once.
- **Deployed in:** red dots & unread badges, trending rotation, thumbnail churn, format shifts (text→photo→video).

### 03 — Social reward & threat  ·  CRITICAL
- **Circuit:** The brain treats social approval and rejection as survival signals, not preferences. Rejection lights the amygdala like physical pain (Eisenberger). Social comparison runs by default in idle state.
- **Exploit:** **Threat travels faster than reward.** Anger outpaces joy in diffusion rate; each moral-emotional word grows a cascade ~20% (Brady et al.). Optimizing for engagement *selects for* outrage whether anyone intended it.
- **Deployed in:** visible like/view counts, tags & mentions, read receipts, outrage-boosting ranking.

### 04 — Loss aversion / FOMO  ·  HIGH
- **Circuit:** Prospect theory (Kahneman & Tversky) — a loss is felt ~2× as intensely as an equivalent gain. Under risk the downside dominates the decision, not the expected value.
- **Exploit:** **Reframe gain as loss.** Convert "you could see content" into "you will lose access to content." Pair with a deadline → FOMO. The streak is a loss you own.
- **Deployed in:** streaks, ephemeral stories, countdowns, "you missed something" pushes.

### 05 — Cognitive ease / friction  ·  CRITICAL
- **Circuit:** System 2 has a small energy budget; the brain defaults to the path of least resistance. Every micro-decision is a tax; enough taxes and the user leaves. A stopping point is where System 2 might wake up and decide to go.
- **Exploit:** **Drop the cost of "next" to zero.** Autoplay, infinite scroll, one-tap, smart defaults, sub-second first content. The user decides to stay in the first ~50ms.
- **Deployed in:** autoplay, infinite scroll, one-tap actions, personalized "For You".

### 06 — Zeigarnik / incompleteness  ·  HIGH
- **Circuit:** Unfinished or interrupted tasks hold memory and attention longer than completed ones. The brain refuses to close the file.
- **Exploit:** **Deliberately withhold.** Truncate. Cliffhang. Make the badge un-clearable in one visit. Strip the notification preview so the user must open to resolve it.
- **Deployed in:** "See more" truncation, unclearable badges, vague push previews, half-loaded feeds.

### 07 — Ego depletion / timing  ·  MODERATE
- **Circuit:** Self-control is a finite resource across the day. People make worse resistance decisions when tired, hungry, or late at night. The resistance threshold rises and falls predictably per person, per hour.
- **Exploit:** **Time the attack.** Learn each user's resistance profile from behavior and fire re-engagement at their lowest hour. Personalization is what separates modern attention engineering from old advertising.
- **Deployed in:** 11pm re-engagement pushes, per-user dropout curves, Sunday-evening anxiety windows.

### 08 — Investment / sunk cost  ·  HIGH
- **Circuit:** The user's own invested effort becomes a sunk cost the brain refuses to abandon — loss aversion applied to identity and reputation. Accumulated capital *is* the retention.
- **Exploit:** **Make them build it themselves.** Profile, followers, streak, trained personalization — each investment raises switching cost and improves the next loop's targeting. Creators are the most locked-in users because they hold the most capital.
- **Deployed in:** onboarding investment, visible follower/reputation counts, creation tools, long-cold-start personalization.

## The line (defensive layer)

The same map that exploits can defend. Three principles:

1. **Aligned or opposed.** For every feature, name whether the user's long-term interest and your metric point the same direction. A streak that helps someone learn: aligned. Outrage that keeps them angry and scrolling: opposed. No feature is neutral.
2. **Optimization is never neutral.** Maximizing engagement selects for anger, anxiety, compulsion. Choosing to optimize for time-well-spent is itself the design decision.
3. **The defense is the same knowledge.** The best inoculation against manipulation is understanding the circuits being used on you. Turn this map on yourself.

> Build for the human holding the screen — or admit you're mining them.