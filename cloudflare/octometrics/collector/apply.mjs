#!/usr/bin/env node
/**
 * Copies the world-buff drop fix into YOUR existing OctoMetrics collector project. It never deploys anything.
 *
 *   node apply.mjs "C:\path\to\OctoBot-Metrics-Tracker-v0.2.1-Whisper-Replies" [--dry-run]
 *
 * Collector (Railway service octobot-metrics-tracker): replaces dist-metrics/metrics/{buffs,events,index}.js and adds drop-pipeline.js and
 * listener-health.js. Worker: replaces cloudflare/worker.mjs and adds raid-intel.mjs, raid-sessions.mjs and listener-status.mjs.
 * Every file it replaces is first copied to <name>.bak-<timestamp> next to it, so the change can be undone by copying those back.
 * It refuses to run if the target does not look like the v0.2.1 collector project.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const worker = resolve(here, '..');
const [target, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry-run');
if (!target) { console.error('Usage: node apply.mjs <collector project folder> [--dry-run]'); process.exit(2); }
const root = resolve(target);

const metrics = join(root, 'dist-metrics', 'metrics');
const required = [join(metrics, 'index.js'), join(metrics, 'events.js'), join(metrics, 'buffs.js'), join(root, 'cloudflare', 'worker.mjs')];
const missing = required.filter(p => !existsSync(p));
if (missing.length) { console.error('This does not look like the collector project; missing:\n  ' + missing.join('\n  ')); process.exit(1); }
const original = readFileSync(join(metrics, 'index.js'), 'utf8');
if (original.includes('createDropPipeline')) { console.error('The fix is already applied to this folder (index.js already uses createDropPipeline). Nothing to do.'); process.exit(0); }
if (!original.includes('emitBuff')) { console.error('index.js does not contain emitBuff; this is not the v0.2.1 collector. Stopping so nothing is overwritten.'); process.exit(1); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const plan = [
  ...['buffs.js', 'events.js', 'index.js', 'drop-pipeline.js', 'listener-health.js'].map(f => [join(here, 'dist-metrics', 'metrics', f), join(metrics, f)]),
  ...['worker.mjs', 'raid-intel.mjs', 'raid-sessions.mjs', 'listener-status.mjs'].map(f => [join(worker, f), join(root, 'cloudflare', f)]),
];
for (const [from, to] of plan) {
  const exists = existsSync(to);
  console.log(`${dry ? 'would ' : ''}${exists ? 'replace' : 'add    '} ${to}${exists ? `  (backup .bak-${stamp})` : ''}`);
  if (dry) continue;
  mkdirSync(dirname(to), { recursive: true });
  if (exists) copyFileSync(to, `${to}.bak-${stamp}`);
  copyFileSync(from, to);
}
console.log(dry ? '\nDry run only: nothing was changed.' : '\nDone. Nothing was deployed. Next: run the collector tests, then follow cloudflare/octometrics/collector/README.md.');
