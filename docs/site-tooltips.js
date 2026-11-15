// One tooltip style for the whole site: instant, dark and slightly transparent with a gold border (the Gear Planner talent look).
// Native `title` tooltips are slow and unstyled, so every title is taken over by this script as soon as it is hovered or focused.
// The small (i) information circles keep their own hover and are left alone (they use data-tip / aria-label, never title).
(() => {
  'use strict';
  if (window.__siteTooltips) return;
  window.__siteTooltips = true;

  const tip = document.createElement('div');
  tip.className = 'site-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  let current = null;

  // Moves a title into data-site-tip so the browser never shows its own tooltip. The accessible name is kept.
  function adopt(element) {
    if (!element || element.nodeType !== 1 || element.closest('.info-i, [data-native-title]')) return;
    const text = element.getAttribute('title');
    if (text === null) return;
    element.removeAttribute('title');
    if (!text.trim()) return;
    element.setAttribute('data-site-tip', text);
    if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby') && !element.textContent.trim()) element.setAttribute('aria-label', text);
    if (current === element) show(element);
  }

  function place(element) {
    const box = element.getBoundingClientRect(), width = tip.offsetWidth, height = tip.offsetHeight, margin = 8;
    const left = Math.max(margin, Math.min(innerWidth - width - margin, box.left + box.width / 2 - width / 2));
    const above = box.top - height - margin;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(above >= margin ? above : Math.min(innerHeight - height - margin, box.bottom + margin))}px`;
  }

  function show(element) {
    const text = element.getAttribute('data-site-tip');
    if (!text) { hide(); return; }
    if (!tip.isConnected) document.body.append(tip);
    current = element;
    tip.textContent = text;
    tip.hidden = false;
    place(element);
  }

  function hide() { current = null; tip.hidden = true; }

  const target = event => {
    const node = event.target instanceof Element ? event.target : null;
    if (!node) return null;
    const holder = node.closest('[title], [data-site-tip]');
    if (!holder || holder.closest('.info-i, [data-native-title]')) return null;
    adopt(holder);
    return holder.hasAttribute('data-site-tip') ? holder : null;
  };

  document.addEventListener('pointerover', event => { const holder = target(event); if (holder) show(holder); else if (current && !current.contains(event.target)) hide(); }, true);
  document.addEventListener('pointerout', event => { if (current && !current.contains(event.relatedTarget)) hide(); }, true);
  document.addEventListener('focusin', event => { const holder = target(event); if (holder) show(holder); }, true);
  document.addEventListener('focusout', hide, true);
  document.addEventListener('pointerdown', hide, true);
  addEventListener('scroll', hide, true);
  addEventListener('resize', hide);
  addEventListener('keydown', event => { if (event.key === 'Escape') hide(); }, true);

  // Titles set later by scripts (for example Play / Pause) are adopted too, and a visible tooltip updates in place.
  new MutationObserver(records => { for (const record of records) adopt(record.target); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['title'], subtree: true });

  if (document.body) document.body.append(tip); else document.addEventListener('DOMContentLoaded', () => document.body.append(tip));
})();
