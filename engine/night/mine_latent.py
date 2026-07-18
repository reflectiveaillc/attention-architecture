"""Latent-game demand mining — the 'how to write ads' pain-diving strategy
(DESKTOP_ARCHIVE_2025_PRE_SSOT/how to write ads) adapted from products to games.

Buckets (playbook mapping):
  pain            — emotional pain of the UNDERLYING problem (doomscroll misery),
                    not any solution. Rock-bottom moments, verbatim language.
  failed_fixes    — mass TECHNOLOGICAL desire: people who tried blockers/
                    meditation apps/detoxes and got burned. Their complaints
                    are our angles.
  latent_games    — the thin layer: games people describe/wish for that don't
                    exist yet ("I wish there was...", imagined mechanics).

Run (needs the reddit-direct authed session):
  cd ~/Dev/influencer-op/ops/reddit-direct && \
  uv run --with patchright python /Users/manuel/coo/attention-architecture/engine/night/mine_latent.py
"""
import asyncio, json, re, sys, time, pathlib

RD_DIR = pathlib.Path.home() / "Dev/influencer-op/ops/reddit-direct"
sys.path.insert(0, str(RD_DIR))
import reddit_direct as rd  # noqa: E402

OUT = pathlib.Path("/Users/manuel/coo/attention-architecture/engine/state/mined")
OUT.mkdir(parents=True, exist_ok=True)

BUCKETS = {
    "pain": {
        "subs": ["nosurf", "digitalminimalism"],
        "queries": ["can't stop scrolling", "doomscrolling night", "brain rot", "hours of my life"],
    },
    "failed_fixes": {
        "subs": ["nosurf", "getdisciplined"],
        "queries": ["app blocker", "screen time limit doesn't", "reinstalled"],
    },
    "latent_games": {
        "subs": ["gameideas", "CozyGamers", "WebGames", "incremental_games"],
        "queries": ["wish there was", "relaxing", "instead of scrolling"],
    },
}
PAIN_WORDS = re.compile(
    r"can'?t stop|hate myself|wasted|3 ?am|2 ?am|ashamed|zombie|numb|brain ?rot|"
    r"doom ?scroll|delete|relapse|withdraw|anxious|anxiety|exhausted|trapped|"
    r"wish there|doesn'?t exist|someone should make|why is there no", re.I)

def pain_score(p):
    text = (p.get("title") or "") + " " + (p.get("selftext") or "")
    hits = len(PAIN_WORDS.findall(text))
    return hits * 10 + min(p.get("num_comments") or 0, 60)

async def run():
    p, browser, ctx, page = await rd._open("", headless=True)
    results, errors = {}, []
    try:
        for bucket, cfg in BUCKETS.items():
            results[bucket] = []
            for sub in cfg["subs"]:
                for q in cfg["queries"]:
                    try:
                        r = await rd.op_search(page, q, sub, 8, "top")
                        for post in r.get("posts", []):
                            post["bucket"] = bucket
                            post["pain_score"] = pain_score(post)
                            results[bucket].append(post)
                        await asyncio.sleep(2.5)
                    except Exception as e:
                        errors.append(f"{bucket}/{sub}/{q}: {e}")
        # dedupe by permalink, rank, fetch comments for the top posts overall
        seen, ranked = set(), []
        for bucket, posts in results.items():
            for post in posts:
                if post["permalink"] in seen:
                    continue
                seen.add(post["permalink"])
                ranked.append(post)
        ranked.sort(key=lambda x: -x["pain_score"])
        top = [x for x in ranked if x["pain_score"] >= 15][:8]
        for post in top:
            try:
                detail = await rd.op_post(page, post["permalink"], cap=40)
                post["comments"] = detail.get("comments", [])[:25]
                await asyncio.sleep(2.5)
            except Exception as e:
                errors.append(f"comments {post['permalink']}: {e}")
    finally:
        await rd._close(p, browser, ctx)

    out = {
        "mined_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "strategy": "how-to-write-ads pain-diving adapted to latent game demand",
        "totals": {b: len(v) for b, v in results.items()},
        "top_with_comments": len([x for x in ranked if x.get("comments")]),
        "errors": errors,
        "ranked": ranked[:60],
    }
    f = OUT / f"latent-{time.strftime('%Y%m%d-%H%M')}.json"
    f.write_text(json.dumps(out, indent=2))
    print(json.dumps({"file": str(f), "totals": out["totals"],
                      "with_comments": out["top_with_comments"], "errors": errors[:5]}, indent=2))

asyncio.run(run())
