/* Shared OctoBot page navigation: one definition for every tab.
 * Usage: <nav class="page-nav" aria-label="Dashboard pages" data-current="auction-house"></nav>
 *        <script src="../site-nav.js"></script>   (placed straight after the nav, so it renders before first paint)
 * Links are resolved against this script's own location, so the same file works from every directory. */
(function (root) {
  'use strict';
  var GROUPS = [
    { label: 'Server monitoring', links: [
      { id: 'population', href: 'population/#server=all', text: 'Population' },
      { id: 'status', href: 'status/', text: 'Server Status' } ] },
    { label: 'Character tools', links: [
      { id: 'sim', beta: true, href: 'sim/', text: 'Gear Planner' },
      { id: 'outfitter', beta: true, href: 'outfitter/', text: 'Dressing Room' } ] },
    { label: 'World and economy', links: [
      { id: 'world-info', beta: true, href: 'world-info/', text: 'World Info' },
      { id: 'auction-house', beta: true, href: 'auction-house/', text: 'Auction House' },
      { id: 'world-chat', alpha: true, href: 'world-chat/', text: 'World Chat' } ] }
  ];
  function siteRoot() {
    var script = root.document && root.document.currentScript;
    var src = script && script.getAttribute('src');
    return src ? src.replace(/site-nav\.js.*$/, '') : '';
  }
  function render(nav, base) {
    var doc = nav.ownerDocument, current = nav.getAttribute('data-current');
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    GROUPS.forEach(function (group) {
      var box = doc.createElement('div');
      box.className = 'nav-group';
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', group.label);
      group.links.forEach(function (link) {
        var a = doc.createElement('a');
        // The current page links to itself without repeating the hash (matches the previous markup).
        a.setAttribute('href', base + link.href);
        a.textContent = link.text;
        if (link.beta || link.alpha) {
          var beta = doc.createElement('span');
          beta.className = 'nav-beta';
          beta.textContent = link.alpha ? 'ALPHA' : 'BETA';
          beta.setAttribute('data-site-tip', link.alpha ? 'Alpha: live coverage and classification may be incomplete.' : 'This section is currently in beta, results may not be 100% accurate.');
          beta.setAttribute('aria-label', link.alpha ? 'ALPHA: coverage may be incomplete.' : 'BETA: This section is currently in beta, results may not be 100% accurate.');
          a.appendChild(beta);
          // Show the same explanation when the tab is reached by keyboard.
          a.setAttribute('data-site-tip', link.alpha ? 'Alpha: live coverage and classification may be incomplete.' : 'This section is currently in beta, results may not be 100% accurate.');
        }
        if (link.id === current) a.setAttribute('aria-current', 'page');
        box.appendChild(a);
      });
      nav.appendChild(box);
    });
  }
  var api = { GROUPS: GROUPS, render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    var base = siteRoot();
    var navs = root.document.querySelectorAll('nav.page-nav[data-current]');
    for (var i = 0; i < navs.length; i++) render(navs[i], base);
  }
})(typeof window !== 'undefined' ? window : this);
