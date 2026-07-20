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

  // PostHog — product analytics for platform + per-game engagement.
  // Set POSTHOG_API_KEY (phc_...) and optionally POSTHOG_API_HOST at deploy time.
  var ph = cfg.posthog;
  if (ph && ph.apiKey) {
    var host = ph.apiHost || 'https://us.i.posthog.com';
    var phScript = document.createElement('script');
    phScript.defer = true;
    phScript.src = 'https://us-assets.i.posthog.com/static/array.js';
    phScript.onload = function () {
      if (window.posthog && window.posthog.init) {
        window.posthog.init(ph.apiKey, {
          api_host: host,
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: true,
          person_profiles: 'identified_only',
          loaded: function (posthog) {
            window.LOOP_POSTHOG = posthog;
            // Notify any listener that PostHog is ready
            try {
              var ev = document.createEvent('Event');
              ev.initEvent('loop_posthog_ready', true, true);
              document.dispatchEvent(ev);
            } catch (_) {}
          }
        });
      }
    };
    document.head.appendChild(phScript);
  }
})();
