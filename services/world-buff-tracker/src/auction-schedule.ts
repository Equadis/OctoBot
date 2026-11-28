export const AUCTION_SCAN_DURATION_MS=59*60_000;
const HOUR_MS=60*60_000;
const GRACE_MS=15_000;

export function utcScanSlot(now:number):number|null{
 const boundary=Math.floor(now/HOUR_MS)*HOUR_MS;
 return now-boundary<GRACE_MS?boundary:null;
}
