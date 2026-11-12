import { describe, expect, it } from "vitest";
import { LifeSigns } from "./life-signs.js";

function setup() {
  const changes: boolean[] = [];
  const signs = new LifeSigns((alive) => changes.push(alive));
  return { signs, changes };
}

describe("LifeSigns", () => {
  it("reads health above a ghost's as alive, and reports it once", () => {
    const { signs, changes } = setup();
    signs.health(120);
    signs.health(94);
    expect(changes).toEqual([true]);
  });

  it("reads a corpse (0) and a released ghost (1) as dead", () => {
    const corpse = setup();
    corpse.signs.health(0);
    expect(corpse.changes).toEqual([false]);
    const ghost = setup();
    ghost.signs.health(1);
    expect(ghost.changes).toEqual([false]);
  });

  it("reports a death, and a return to life", () => {
    const { signs, changes } = setup();
    signs.health(120);
    signs.health(0);
    signs.health(1); // released: still dead, nothing new to say
    signs.health(60); // resurrected
    expect(changes).toEqual([true, false, true]);
  });

  it("takes a Spirit Healer beside it for dead, and an accepted resurrection for alive", () => {
    const { signs, changes } = setup();
    signs.health(120); // a ghost that kept its health still reads alive...
    signs.released(); // ...until the Spirit Healer says otherwise
    signs.resurrected();
    expect(changes).toEqual([true, false, true]);
  });
});
