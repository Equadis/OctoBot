/*
 * OctoBot Dressing Room model audit
 *
 * 1. Open https://equadis.github.io/OctoBot/outfitter/
 * 2. Open this file in a text editor and paste its contents into that tab's
 *    developer console. In Chrome or Edge, Ctrl+Shift+J opens the console.
 * 3. Run: await window.auditOutfitterModels()
 * 4. Give Claude the downloaded outfitter-model-audit.json. Start with
 *    missing and estimated, then review unverified before treating those
 *    entries as missing models.
 *
 * Optional small check: await window.auditOutfitterModels({itemIds: [8, 60007]})
 * Latest report: window.outfitterModelAudit
 * Download again: window.downloadOutfitterModelAudit()
 */
(() => {
  'use strict';

  const fileName = 'outfitter-model-audit.json';
  const itemApi = '/api/outfitter/';
  const notes = {
    name: 'Estimated preview: shown with the Classic model of the same-named original item. It may differ from the in-game look.',
    icon: 'Estimated preview: shown with a Classic model that uses the same icon. It may differ from the in-game look.',
    none: 'No preview: this is a custom OctoWoW appearance with no Classic 3D model. The item stays in your outfit and in saved and shared outfits.',
    legacy: 'No preview: the appearance service has not been updated to find Classic models yet. The item stays in your outfit.',
    error: 'The appearance service did not answer for this item, so it has no preview right now. It stays in your outfit. Selecting it again will retry.',
  };

  async function getJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} for ${new URL(url).pathname}`);
      if (response.status === 404) {
        const detail = await response.json().catch(() => null);
        error.expectedMissingAsset = detail?.error ===
          'This appearance is not available in the Classic model library.';
      }
      throw error;
    }
    return response.json();
  }

  function cached(cache, key, load) {
    if (!cache.has(key)) {
      cache.set(key, load().catch(error => {
        cache.delete(key);
        throw error;
      }));
    }
    return cache.get(key);
  }

  function downloadReport() {
    const report = window.outfitterModelAudit;
    if (!report) throw new Error('Run auditOutfitterModels() first.');
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  window.downloadOutfitterModelAudit = downloadReport;

  window.auditOutfitterModels = async function ({
    concurrency = 2, retryErrors = 1, itemIds, download = true,
  } = {}) {
    if (window.outfitterAuditRunning) throw new Error('An audit is already running.');
    const moduleScript = [...document.querySelectorAll('script[type="module"][src]')]
      .find(script => new URL(script.src).pathname.endsWith('/outfitter.mjs'));
    if (!moduleScript) throw new Error('Open the OctoBot Dressing Room before running the audit.');
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
      throw new Error('concurrency must be an integer from 1 to 4.');
    }
    if (!Number.isInteger(retryErrors) || retryErrors < 0 || retryErrors > 3) {
      throw new Error('retryErrors must be an integer from 0 to 3.');
    }
    if (itemIds !== undefined && (!Array.isArray(itemIds) || !itemIds.length ||
        itemIds.some(id => !Number.isSafeInteger(id) || id < 1))) {
      throw new Error('itemIds must be a non-empty array of positive numeric item IDs.');
    }

    window.outfitterAuditRunning = true;
    try {
      const moduleUrl = new URL('state.mjs', moduleScript.src);
      const catalogueUrl = new URL('../sim/data/items/catalogue.json', moduleScript.src);
      const configUrl = new URL('../telemetry.json', moduleScript.src);
      const [state, catalogue, config] = await Promise.all([
        import(moduleUrl.href), getJson(catalogueUrl), getJson(configUrl),
      ]);
      if (!Array.isArray(catalogue) || !catalogue.length) {
        throw new Error('The Dressing Room equipment catalogue is empty.');
      }
      if (typeof config.endpoint !== 'string' || !config.endpoint) {
        throw new Error('The Dressing Room configuration is missing its appearance service URL.');
      }

      const service = new URL(config.endpoint, location.href);
      if (service.protocol !== 'https:' && service.origin !== location.origin) {
        throw new Error('The appearance service URL must use HTTPS or match the page origin.');
      }
      const api = new URL(itemApi, service);
      let version = null;
      try {
        const data = await getJson(new URL('models-version', api));
        if (typeof data.version === 'string' && /^[0-9a-f]{8,32}$/.test(data.version)) {
          version = data.version;
        }
      } catch (error) {
        console.warn('Model version unavailable. Trying the Dressing Room’s unversioned asset URLs.', error);
      }
      const assetBase = new URL(version ? `assets/v${version}/` : 'assets/', api);

      const wanted = itemIds ? new Set(itemIds) : null;
      const jobs = [];
      const seen = new Set();
      for (const { id, name } of state.SLOTS) {
        for (const item of state.filterItems(catalogue, { slot: id })) {
          if (wanted && !wanted.has(item.id)) continue;
          const viewerSlot = state.viewerSlot(id, item);
          const key = `${item.id}:${viewerSlot}`;
          if (seen.has(key)) continue;
          seen.add(key);
          jobs.push({ item, slotId: id, slotName: name, viewerSlot });
        }
      }
      if (!jobs.length) throw new Error('No requested items match a Dressing Room slot.');

      const nameIndex = state.buildNameIndex(catalogue);
      const iconIndex = state.buildIconIndex(catalogue);
      const metadata = new Map();
      const assets = new Map();
      const displayFor = id => cached(metadata, id, async () => {
        const data = await getJson(new URL(`item/${id}`, api));
        if (!data || typeof data !== 'object' ||
            (!Object.hasOwn(data, 'displayId') && !Array.isArray(data.candidates))) {
          throw new Error(`Unexpected appearance response for item ${id}`);
        }
        return data;
      });

      async function resolvePreview(item, slot) {
        const diagnostics = new Set();
        let sourceDisplayId = null;
        let sourceCandidates = [];
        let legacy = false;

        async function usableDisplay(data) {
          const candidates = Array.isArray(data.candidates) && data.candidates.length
            ? data.candidates : [data.displayId];
          for (const displayId of candidates) {
            if (!Number.isSafeInteger(displayId) || displayId <= 0) continue;
            const path = [21, 22, 26].includes(slot)
              ? `meta/item/${displayId}.json`
              : `meta/armor/${slot}/${displayId}.json`;
            try {
              const exists = await cached(assets, path, async () => {
                try {
                  await getJson(new URL(path, assetBase));
                  return true;
                } catch (error) {
                  if (error.expectedMissingAsset) return false;
                  throw error;
                }
              });
              if (exists) return displayId;
            } catch (error) {
              diagnostics.add(String(error));
            }
          }
          return null;
        }

        function result(kind, displayId = null, modelFromItemId = null) {
          return {
            kind, displayId, modelFromItemId, sourceDisplayId, sourceCandidates, legacy,
            note: kind === 'none' && legacy ? notes.legacy : (notes[kind] || ''),
            lookupErrors: [...diagnostics],
          };
        }

        try {
          const own = await displayFor(item.id);
          legacy = !Array.isArray(own.candidates);
          sourceDisplayId = own.displayId ?? null;
          sourceCandidates = Array.isArray(own.candidates) ? own.candidates : [];
          const displayId = await usableDisplay(own);
          if (displayId !== null) return result('own', displayId, item.id);
        } catch (error) {
          diagnostics.add(String(error));
          return result('error');
        }

        // Same name first, then the first eight same-icon items in catalogue
        // helper order. Sequential checks keep the request count bounded.
        const fallbackGroups = [
          ['name', state.sameNameItems(nameIndex, item)],
          ['icon', state.sameIconItems(iconIndex, item).slice(0, 8)],
        ];
        for (const [kind, siblings] of fallbackGroups) {
          for (const sibling of siblings) {
            try {
              const displayId = await usableDisplay(await displayFor(sibling.id));
              if (displayId !== null) return result(kind, displayId, sibling.id);
            } catch (error) {
              diagnostics.add(String(error));
            }
          }
        }
        return result('none');
      }

      console.info(`OctoBot model audit: checking ${jobs.length.toLocaleString()} item/slot pairs.`);
      const results = [];
      let cursor = 0;
      const worker = async () => {
        while (cursor < jobs.length) {
          const { item, slotId, slotName, viewerSlot } = jobs[cursor++];
          let preview = await resolvePreview(item, viewerSlot);
          for (let retry = 0; retry < retryErrors && preview.lookupErrors.length; retry++) {
            await new Promise(resolve => setTimeout(resolve, 500 * (retry + 1)));
            preview = await resolvePreview(item, viewerSlot);
          }
          results.push({
            itemId: item.id,
            name: item.name,
            inventorySlot: item.slot,
            dressingRoomSlotId: slotId,
            dressingRoomSlot: slotName,
            viewerSlot,
            classId: item.classs,
            subclass: item.subclass,
            icon: item.icon ?? null,
            dbUrl: `https://octowow.st/db/?item=${item.id}`,
            ...preview,
            error: preview.lookupErrors[0] ?? null,
          });
          if (results.length % 100 === 0 || results.length === jobs.length) {
            console.info(`OctoBot model audit: ${results.length}/${jobs.length}`);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
      results.sort((a, b) => a.itemId - b.itemId || a.viewerSlot - b.viewerSlot);

      const flagged = results.filter(row => row.note);
      const uncertain = row => row.kind === 'error' || row.legacy || row.lookupErrors.length > 0;
      const checkedItemIds = new Set(results.map(row => row.itemId));
      const report = {
        createdAt: new Date().toISOString(),
        scope: wanted ? 'selected-items' : 'full-dressing-room',
        catalogueUrl: catalogueUrl.href,
        catalogueItems: catalogue.length,
        modelVersion: version,
        checked: results.length,
        checkedItems: checkedItemIds.size,
        unmatchedRequestedItemIds: wanted ? [...wanted].filter(id => !checkedItemIds.has(id)) : [],
        flaggedItems: new Set(flagged.map(row => row.itemId)).size,
        flagged,
        missing: flagged.filter(row => row.kind === 'none' && !uncertain(row)),
        estimated: flagged.filter(row => row.kind === 'name' || row.kind === 'icon'),
        unverified: results.filter(uncertain),
      };

      window.outfitterModelAudit = report;
      console.table({
        checkedItems: report.checkedItems,
        checkedSlots: report.checked,
        flaggedItems: report.flaggedItems,
        flaggedSlots: report.flagged.length,
        missing: report.missing.length,
        estimated: report.estimated.length,
        unverified: report.unverified.length,
      });
      if (download) downloadReport();
      return report;
    } finally {
      window.outfitterAuditRunning = false;
    }
  };

  console.info('OctoBot model audit ready. Run: await window.auditOutfitterModels()');
})();
