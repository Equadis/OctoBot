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
    { label: 'World and economy', links: [
      { id: 'auction-house', disabled: true, text: 'Auction House' } ] }
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
        a.textContent = link.text;
        if (link.disabled) {
          a.setAttribute('role', 'link');
          a.setAttribute('aria-disabled', 'true');
        } else {
          a.setAttribute('href', base + link.href);
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
