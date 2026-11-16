/* Item icons come from Wowhead's CDN, which does not have OctoWoW's custom icons (for example inv_tenhead_v3, the Crown of Ten Storms).
 * When one of those images fails, retry once from the OctoWoW database, which serves every icon the catalogue names.
 * Works for every <img> on the page, including ones created later, so no page needs its own fallback code. */
(function (root) {
  'use strict';
  var CDN = /^https:\/\/wow\.zamimg\.com\/images\/wow\/icons\/(large|medium|small|tiny)\/([a-z0-9_]+)\.jpg$/i;
  /** The OctoWoW database URL for a Wowhead CDN icon URL, or null when the URL is not one of those. */
  function fallbackFor(url) {
    var m = CDN.exec(String(url || ''));
    if (!m) return null;
    return 'https://octowow.st/db/images/icons/' + (m[1].toLowerCase() === 'tiny' ? 'small' : m[1].toLowerCase()) + '/' + m[2].toLowerCase() + '.png';
  }
  function onError(event) {
    var img = event && event.target;
    if (!img || img.tagName !== 'IMG' || (img.dataset && img.dataset.iconFallback)) return; // already retried: let the page's own handling run
    var next = fallbackFor(img.currentSrc || img.src);
    if (!next) return;
    img.dataset.iconFallback = '1';
    // Stop here so a page handler that clears the image on error does not run for the first, recoverable failure.
    event.stopImmediatePropagation();
    img.src = next;
  }
  var api = { fallbackFor: fallbackFor, onError: onError };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) root.document.addEventListener('error', onError, true); // error events do not bubble, so listen while capturing
})(typeof window !== 'undefined' ? window : this);
