(function () {
  'use strict';
  if (window.__loop_analytics_loaded) return;
  window.__loop_analytics_loaded = true;
  var cfg = window.LOOP_ANALYTICS || {};

  // Vercel Web Analytics — auto-loaded when project has it enabled in the dashboard.
  // The script path is provided by Vercel; including it manually lets it work on
  // custom domains immediately after the toggle is on.
  if (cfg.vercel !== false) {
    var va = document.createElement('script');
    va.defer = true;
    va.src = '/_vercel/insights/script.js';
    document.head.appendChild(va);
  }

  // Hotjar — heatmaps + funnel recordings. Set HOTJAR_SITE_ID + HOTJAR_SNIPPET_VERSION
  // via env vars at deploy time, or pass window.LOOP_ANALYTICS.hotjar = {id, sv}.
  var hj = cfg.hotjar;
  if (hj && hj.id) {
    window.hj = window.hj || function () { (window.hj.q = window.hj.q || []).push(arguments); };
    window._hjSettings = { hjid: hj.id, hjsv: hj.sv || 6 };
    var s = document.createElement('script');
    s.async = 1;
    s.src = 'https://static.hotjar.com/c/hotjar-' + hj.id + '.js?sv=' + window._hjSettings.hjsv;
    document.head.appendChild(s);
  }
})();
