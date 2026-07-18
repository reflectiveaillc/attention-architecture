/* LOOP share layer — challenge links + social sharing (docs/game-contract-v2.md §9).
 *
 * Challenge links: any game URL + ?dare=<score>[&by=<name>] renders as a dare.
 *   Games read SHARE.dare / SHARE.by and show "BEAT <dare>" during play;
 *   call SHARE.beaten(score) when the player passes it.
 * Sharing: SHARE.send({score, unit, text}) → native share sheet (Web Share API,
 *   the same sheet TikTok/IG use) with a challenge URL; clipboard fallback + toast.
 * Analytics (auto via LOOP.emit): challenge_landed, challenge_beaten, share
 *   {channel: native|clipboard} — the K-factor inputs.
 */
(function () {
  var qs = new URLSearchParams(location.search);
  var dare = qs.get('dare') ? parseFloat(qs.get('dare')) : null;
  var by = qs.get('by') || null;

  function emit(ev, props) { if (window.LOOP) LOOP.emit(ev, props || {}); }
  if (dare !== null && !isNaN(dare)) emit('challenge_landed', { dare: dare, by: by });

  function challengeUrl(score) {
    var u = new URL(location.href);
    ['sink', 'demo', 'bot', 'runs', 'seed', 'clip', 'src', 'dare', 'by'].forEach(function (k) { u.searchParams.delete(k); });
    u.searchParams.set('dare', String(score));
    return u.toString();
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);background:#fff;color:#0b0d12;font:800 14px -apple-system,Helvetica,Arial;padding:10px 18px;border-radius:99px;z-index:99;opacity:0;transition:opacity .25s';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 1800);
  }

  window.SHARE = {
    dare: (dare !== null && !isNaN(dare)) ? dare : null,
    by: by,
    challengeUrl: challengeUrl,
    beaten: function (score) { emit('challenge_beaten', { dare: dare, score: score }); },
    send: function (opts) {
      opts = opts || {};
      var game = (window.LOOP_GAME || 'tilt').replace(/-/g, ' ');
      var scoreTxt = opts.score !== undefined ? opts.score + (opts.unit ? ' ' + opts.unit : '') : '';
      var text = opts.text || ('I hit ' + scoreTxt + ' in ' + game + ' — beat it:');
      var url = challengeUrl(opts.score !== undefined ? opts.score : '');
      if (navigator.share) {
        navigator.share({ title: 'tilt — ' + game, text: text, url: url })
          .then(function () { emit('share', { channel: 'native', score: opts.score }); })
          .catch(function () {});
      } else {
        var full = text + ' ' + url;
        (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject())
          .then(function () { toast('challenge link copied'); emit('share', { channel: 'clipboard', score: opts.score }); })
          .catch(function () { toast(full.slice(0, 60)); });
      }
    }
  };
})();
