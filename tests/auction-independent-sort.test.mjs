import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS,COLUMN_SORTS,SORT_DEFAULT_DIR,nextColumnSort} from '../docs/auction-house/filters.mjs';

test('header sorting is independent for favourites and main results',()=>{
 const source=readFileSync(new URL('../docs/auction-house/auction.js',import.meta.url),'utf8');
 const functions=source.slice(source.indexOf('function sortForTable'),source.indexOf('function measureNames'));
 const state={filters:{...DEFAULTS},favSort:{sort:DEFAULTS.sort,dir:DEFAULTS.dir},page:3,sortTouched:false};
 const calls={items:0,favourites:0};
 function el(tag,content,cls){return {tag,textContent:content,dataset:{},className:cls,children:[],setAttribute(){},append(...v){this.children.push(...v)},addEventListener(_,fn){this.click=fn}}}
 function table(){const headers=Array.from({length:COLUMN_SORTS.length+1},()=>({dataset:{},setAttribute(k,v){this[k]=v},classList:{toggle(){}},replaceChildren(button){this.button=button},querySelector(q){return q==='button'?this.button:this.button?.children[1]}}));return {dataset:{},headers,querySelectorAll(q){return q==='thead th'?headers:headers.filter(h=>h.dataset.sortKey)}}}
 const api=Function('state','COLUMN_SORTS','SORT_DEFAULT_DIR','nextColumnSort','el','refreshItems','refreshFavourites',functions+';return {prepareSortHeaders,updateSortHeaders}')(state,COLUMN_SORTS,SORT_DEFAULT_DIR,nextColumnSort,el,()=>{calls.items++},()=>{calls.favourites++});
 const main=table(),fav=table();
 api.prepareSortHeaders(main);api.prepareSortHeaders(fav,'favourites');
 const col=1+COLUMN_SORTS.findIndex(([,key])=>key==='unit_buyout');
 const key=COLUMN_SORTS[col-1][1],initial={...state.filters};
 fav.headers[col].button.click();
 assert.deepEqual(state.filters,initial);assert.equal(state.page,3);assert.equal(state.sortTouched,false);assert.equal(calls.items,0);assert.equal(calls.favourites,1);
 assert.equal(state.favSort.sort,key);assert.equal(main.headers[col]['aria-sort'],'none');
 fav.headers[col].button.click();const favOrder={...state.favSort};
 main.headers[col].button.click();
 assert.deepEqual(state.favSort,favOrder);assert.equal(state.page,0);assert.equal(calls.items,1);assert.equal(calls.favourites,2);
 assert.notEqual(main.headers[col]['aria-sort'],fav.headers[col]['aria-sort']);
 assert.ok(source.includes('{...DEFAULTS,...state.favSort}'));
});
