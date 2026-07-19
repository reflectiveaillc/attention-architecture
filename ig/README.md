# IG distribution pipeline — @viral_free_online_games

Site: https://tilt-games.vercel.app (Vercel project `tilt-games`, team reflectiveaillc).
Deploy: `cd web/site && vercel deploy --prod --yes` (project linked via web/site/.vercel/).

Pipeline (all idempotent):
1. `node ig/gen-beds.mjs` — synthesizes music beds (ig/beds/): arcade / focus /
   rhythm (pure PCM chiptune, $0) + calm.mp3 copied from yip-asmr. Re-run only
   if beds need a redesign.
2. `node ig/bake-audio.mjs` — bakes category-matched bed onto every silent site
   clip → ig/clips/<id>.mp4 (site clips untouched — standing rule: never ship
   silent reels). Skips existing outputs.
3. `node ig/build-queue.mjs [--start YYYY-MM-DD]` — writes the social-autopilot
   queue (content-studio/social-autopilot/clients/tilt/queue.json): one reel per
   game, 4/day (engine cap), face games first, captions from each game's
   copy.md (Reels caption + hashtags) + link-in-bio CTA.
4. Posting engine: social-autopilot post-ig.mjs (fail-closed, identity-locked,
   ledger, captcha→Telegram). launchd: com.manuel.tilt-post (10:05/13:35/17:05/20:35).

MANUEL GATES (one-time):
- Log the account in: `cd ~/coo/content-studio/social-autopilot && node post-ig.mjs tilt --check`
  → browser opens on the tilt profile → log into IG as viral_free_online_games → rerun --check until identity confirms.
- Set the IG bio link to https://tilt-games.vercel.app
- Arm the drip: `launchctl load ~/Library/LaunchAgents/com.manuel.tilt-post.plist`

Runway: 383 reels / 4 per day ≈ 96 days of daily content.
