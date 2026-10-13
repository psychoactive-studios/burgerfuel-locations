/* ------------------------------------------------------------------
   BurgerFuel Store Locations — loader

   The only script a host page (Webflow) needs. It never changes, so the
   Webflow code never has to either:

     <div id="bf-locator"></div>
     <script src="https://psychoactive-studios.github.io/burgerfuel-locations/loader.js"></script>

   On every page load it asks for version.json (bypassing all caches),
   then loads the stylesheet and the scripts stamped with that version,
   so a new release reaches the live site as soon as GitHub Pages has
   published it. The stylesheet is loaded first so the locator never
   flashes unstyled.
   ------------------------------------------------------------------ */
(function (d) {
  'use strict';

  var me = d.currentScript;
  var base = me ? me.src.replace(/loader\.js(\?.*)?$/, '') : '';

  // execution order matters: markup.js builds the DOM that app.js wires up
  var SCRIPTS = [
    'js/config.js',
    'js/stores-data.js',
    'js/hours.js',
    'js/map.js',
    'js/lightbox.js',
    'js/markup.js',
    'js/app.js'
  ];

  /* Until the stylesheet and markup arrive, hold the space on tablet and
     desktop with the map's water colour, so the page doesn't flash white
     under the site nav. app.js removes this once the locator is up. */
  var ph = d.createElement('style');
  ph.id = 'bf-placeholder';
  ph.textContent = '@media (min-width:48rem){#bf-locator{position:fixed;inset:0;z-index:0;background:#6f7176}}';
  d.head.appendChild(ph);

  /* A store's own page (the Webflow CMS template, /nz/locations/albany)
     keeps that store's details as ordinary page content, tagged
     data-bf-fallback, so search engines and anything that can't run the
     locator still read them. Hide it while the locator loads; if the
     locator never comes up, show it again. */
  var host = d.getElementById('bf-locator');
  var path = location.pathname.replace(/\/+$/, '');
  var parent = path.slice(0, path.lastIndexOf('/'));
  var storePage = !!host && (host.hasAttribute('data-store') || /\/locations[^\/]*$/i.test(parent));
  if (d.querySelector('[data-bf-fallback]')) {
    var hide = d.createElement('style');
    hide.textContent = '[data-bf-fallback]{display:none!important}';
    d.head.appendChild(hide);
    setTimeout(function () {
      if (!d.documentElement.classList.contains('bf-app')) hide.remove();
    }, 10000);
  }

  /* The store list lives on the list page, as a hidden CMS Collection
     List. A store page borrows it from there rather than carrying a
     second copy that would have to be kept in step. If it can't be
     fetched, the locator falls back to its bundled stores-data.js. */
  var storeList = Promise.resolve();
  if (storePage && !d.querySelector('[data-bf-stores]')) {
    storeList = fetch(host.getAttribute('data-list-url') || parent, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var list = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-bf-stores]');
        if (list) d.body.appendChild(d.importNode(list, true));
      })
      .catch(function () { /* bundled data instead */ });
  }

  function load(version) {
    var q = '?v=' + encodeURIComponent(version);

    /* Fetch the brand fonts now, not when something first uses them —
       otherwise the first store panel opened draws in a fallback font
       and then snaps to Vanguard. */
    [['fonts/VanguardCF-Bold.woff2', 'font/woff2'], ['fonts/VanguardCF-Medium.woff2', 'font/woff2'],
     ['fonts/Salted-Regular.woff2', 'font/woff2'], ['fonts/InstrumentSans-500.woff2', 'font/woff2'],
     ['fonts/InstrumentSans-600.woff2', 'font/woff2']].forEach(function (f) {
      var l = d.createElement('link');
      l.rel = 'preload'; l.as = 'font'; l.type = f[1]; l.crossOrigin = 'anonymous';
      l.href = base + f[0];
      d.head.appendChild(l);
    });

    var css = d.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'css/style.css' + q;

    var started = false;
    function scripts() {
      if (started) return;
      started = true;
      // async=false: all download in parallel but run in this order.
      // app.js reads the store list as it starts, so wait for it.
      storeList.then(function () { SCRIPTS.forEach(function (src) {
        var s = d.createElement('script');
        s.src = base + src + q;
        s.async = false;
        d.body.appendChild(s);
      }); });
    }
    css.onload = css.onerror = scripts;
    setTimeout(scripts, 3000);   // never let a slow stylesheet hold the page hostage
    d.head.appendChild(css);
  }

  fetch(base + 'version.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) { load(j.version); })
    // no version file reachable: load uncached rather than not at all
    .catch(function () { load(String(Date.now())); });
})(document);
