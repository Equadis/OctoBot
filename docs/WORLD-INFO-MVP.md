# WIP — World Info MVP

New static page: [docs/world-info.html](world-info.html), linked from Population, Server Status and the Gear Planner. Uses the shared OctoBot theme and viewer counter.

## Current behaviour

- **Onyxia / Blackwing Lair:** loads the existing public OctoMetrics summary once per minute. A raw \`active: true\` flag only displays \`1+\` **estimated** raids, never an exact simultaneous-raid count. Real per-raid elapsed timers require explicit session IDs/start timestamps. An empty /who view does not count as a confirmed boss kill.
- **Rallying Cry:** one panel per faction. Last confirmed drops and future drop predictions are distinct. Missing events display \`NO DATA\`, not invented times.
- **DMF:** \`SW\` (Elwynn), \`TB\` (Mulgore), or \`MIA\` when no *fresh* observation exists. \`MIA\` means unconfirmed, **not proved absent**.
- **Edge of Madness:** month-by-month Classic Era Pacific calendar based on the published rotation anchor; fetches current/next from the source's public [JSON API](https://edgeofmadnesscalendar.com/api/era) where browser CORS permits, otherwise uses the published anchor. This is **reference information only** and not verified against OctoWoW's custom realm rotation.
- All elapsed times tick client-side every second from their event timestamps. API observations refresh every 60 seconds; the Edge of Madness API every 15 minutes.
- No write actions, secrets or extra Railway connections are needed for this frontend MVP.

## Future OctoMetrics JSON contract

\`GET https://octometrics.eqvoice.workers.dev/api/summary\` should eventually expose:

\`\`\`json
{
  "timestamp": "2026-11-12T22:50:00Z",
  "worldInfo": {
    "raids": {
      "onyxia": {
        "observedAt": "2026-11-12T22:50:00Z",
        "players": 68,
        "sessions": [
          { "id": "ony-100", "startedAt": "2026-11-12T22:10:00Z", "confidence": "inferred" },
          { "id": "ony-101", "startedAt": "2026-11-12T22:35:00Z", "confidence": "inferred" }
        ],
        "lastFinishedAt": "2026-11-12T21:45:00Z"
      },
      "bwl": {
        "observedAt": "2026-11-12T22:50:00Z",
        "players": 0,
        "sessions": [],
        "activeRaidCount": 0,
        "lastFinishedAt": "2026-11-12T21:10:00Z"
      }
    },
    "buffs": {
      "alliance": {
        "confirmedLastDropAt": "2026-11-12T22:00:00Z",
        "lastHead": "onyxia",
        "estimatedNextDropAt": "2026-11-12T23:05:00Z"
      },
      "horde": {
        "confirmedLastDropAt": null,
        "estimatedNextDropAt": null
      }
    },
    "dmf": {
      "location": "elwynn",
      "observedAt": "2026-11-12T22:48:00Z",
      "source": "onsite"
    }
  }
}
\`\`\`

This is a **proposed API contract**, not a claim that the production Worker supports these fields today.

## Backend follow-up

1. Integrate the GeneralA6-derived roster/clear-state logic from PR #26 with the current four-account Railway service. A /who roster does **not** expose an actual instance or group ID. Separate simultaneous groups are inferred unless another trusted source can confirm them.
2. Persist active sessions, last-finished events, per-faction confirmed buff drops, estimated next drops, and DMF observations into D1. The API should preserve timestamps across restarts.
3. Use complete class-sliced /who rosters when the 49-result cap is reached. On incomplete reads or timeouts, do not report zero raids or a finished event.
4. Detect buff drops from verified city announcement packets, not a raid leaving the instance. If our two N'Zoth characters are both parked at Faire locations, they may not hear city yells directly; document and implement a reliable confirmation source.
5. Validate Edge of Madness's actual rotation against OctoWoW. Until then keep the Classic Era disclaimer.
6. Check browser console/network for \`GET /api/summary\` and the third-party Era API, then test with fresh/stale/partial summary payloads. Never expose Railway variables or tokens to the browser.
