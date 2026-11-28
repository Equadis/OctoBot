import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const theme=readFileSync(new URL('../docs/site-theme.css',import.meta.url),'utf8');

test('the shared navigation carries a divider matching the header divider, with compact spacing',()=>{
 assert.match(theme,/\.page-nav,\.planner-view \.page-nav\{[^}]*margin:18px 0 18px;padding-bottom:18px;border-bottom:1px solid var\(--line\)\}/);
 assert.match(theme,/\.site-header,\.planner-view \.site-header\{[^}]*padding:0 0 18px;border-bottom:1px solid var\(--line\)\}/,'the divider above the tabs uses the same colour and weight');
});
test('both toolbars share one set of dimensions and the status line cannot make them taller',()=>{
 assert.match(theme,/\.app-toolbar\{[^}]*margin:0 0 18px;min-height:34px\}/);
 assert.match(theme,/\.app-toolbar #feedback\{margin:0;min-height:0;padding:0;font-size:11px;line-height:1\.35\}/);
 assert.match(theme,/\.app-toolbar button,\.app-toolbar a\.app-btn\{[^}]*min-height:34px;padding:0 14px;[^}]*border-radius:4px/);
 for(const page of ['sim/combat-layout.css','sim/planner.css','outfitter/outfitter.css'])assert.doesNotMatch(readFileSync(new URL('../docs/'+page,import.meta.url),'utf8'),/\.app-toolbar/,page+' adds no page-specific toolbar styling');
});
