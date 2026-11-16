import {test} from "node:test";
import assert from "node:assert/strict";
import {unitBuyout,marketPercent,trendPercent,trendArrow,historicalAverage,estimatedRemaining} from "../auction-pricing.mjs";
test("buyouts are integer copper totals, not multiplied again",()=>{
 assert.equal(unitBuyout(25000,5),5000);
 assert.equal(unitBuyout(1000,1),1000);
 assert.equal(unitBuyout(0,2),null);assert.equal(unitBuyout(null,5),null);
});
test("market 100%, 250%, 50%, 2.5% examples",()=>{
 assert.equal(marketPercent(1000,1000),100);
 assert.equal(marketPercent(2500,1000),250);
 assert.equal(marketPercent(500,1000),50);
 assert.equal(marketPercent(25,1000),2.5);
 assert.equal(marketPercent(10,0),null);
});
test("short-term trends have distinct single/double thresholds",()=>{
 assert.equal(trendArrow(trendPercent(109,100)),'→');
 assert.equal(trendArrow(trendPercent(110,100)),'↑');
 assert.equal(trendArrow(trendPercent(125,100)),'↑↑');
 assert.equal(trendArrow(trendPercent(90,100)),'↓');
 assert.equal(trendArrow(trendPercent(75,100)),'↓↓');
 assert.equal(trendArrow(null),'—');
});
test("rolling daily representative values do not over-weight repeated intraday scans",()=>{
 assert.equal(historicalAverage([100,200,300]),null);
 assert.equal(historicalAverage([100,100,200,200]),150);
 assert.equal(historicalAverage([0,100,100,200,200]),150);
});
test("time left never implies expiry after a lower-bound estimate reaches zero",()=>{
 assert.equal(estimatedRemaining(7200000,3600000),3600000);
 assert.equal(estimatedRemaining(7200000,9000000),0);
 assert.equal(estimatedRemaining(null,1000),null);
});
