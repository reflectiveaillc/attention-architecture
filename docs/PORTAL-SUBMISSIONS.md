# Portal syndication runbook (CrazyGames / Poki)

Goal: free distribution to 35-60M MAU audiences + rev share + brand searches
that lead back to viralfreegames.com. B-tier games only — crown jewels stay
home-exclusive so the brand keeps a reason to be visited directly.

## Keep home-exclusive (do NOT submit)
- All FACE games (the differentiator: flappy-face, look-away, brow-lift, …)
- lab-rat (the press angle)
- drop-dodge (⛔ tester-validated + locked)
- stack-rush (reference implementation, daily-pool anchor)
- The calm engine catalog (brand story, AdSense-friendly retention inventory)

## Submit (10 B-tier, viral engine, self-contained, challenge-ready)
| game | pitch line |
|---|---|
| aim-snap | flick-shot precision, ms-graded |
| apex-tap | tap the apex of the arc |
| autoplay-chicken | stop the autoplay before it spends you |
| beat-dodge | dodge on the beat |
| blink-cut | cut at the exact blink |
| boost-button | hold the boost, don't melt |
| badge-collect | clear the badge storm |
| align-center | pixel-perfect centering |
| anchor-hold | hold through the storm |
| beat-the-seed | same seed, beat the ghost |

(Swap freely — criteria: viral engine + concrete challenge + no audio
dependency + plays fine in an iframe.)

## CrazyGames steps (developer.crazygames.com)
1. Create developer account (Manuel — needs email; use reflectiveaillc@gmail.com).
2. Games are plain HTML5 — upload as zip per game or "link" submission.
3. Integrate their SDK ONLY on submitted builds (ad breaks + happytime events);
   keep our own builds SDK-free. Make a `portal/` build variant per game:
   strip PostHog (their ToS), keep gameplay identical, add `?src=crazygames`
   to the "more games" link → our site (check current linkback policy allows it).
4. Consider their 2-month exclusivity boost (+50% rev share) ONLY for games
   we don't care about strategically.

## Poki steps (developers.poki.com)
Same shape: account → Poki SDK integration → QA review. Poki is pickier;
submit after 2-3 games have CrazyGames performance data to show.

## What I can automate once the account exists
- Generating the `portal/` build variants (SDK wrapper, linkback, zip) for
  all 10 games in one engine pass.
- Tracking portal-referred visits (src param → PostHog).

⬜ Manuel: create the CrazyGames developer account (~3 min) → then say
"build the portal variants" and the rest is automated.
