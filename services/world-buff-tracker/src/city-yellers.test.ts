import { describe, expect, it, vi } from "vitest";
import { CityYellers } from "./city-yellers.js";

const yell = () => vi.fn<(message: string) => void>();

describe("CityYellers", () => {
  it("has no yell for a side with no yeller in world", () => {
    const yellers = new CityYellers(["Onyxiabuffog", "Onybuffogb"]);
    expect(yellers.yellFor("horde")).toBeUndefined();
    expect(yellers.holder("horde")).toBeNull();
  });

  it("gives the yell to the first-listed yeller, even when the backup signed up first", () => {
    const yellers = new CityYellers(["Onyxiabuffog", "Onybuffogb"]);
    const backup = yell();
    const primary = yell();
    expect(yellers.signUp("horde", "Onybuffogb", backup)).toBe("Onybuffogb");
    expect(yellers.signUp("horde", "Onyxiabuffog", primary)).toBe("Onyxiabuffog");
    yellers.yellFor("horde")?.("A raid is forming!");
    expect(primary).toHaveBeenCalledWith("A raid is forming!");
    expect(backup).not.toHaveBeenCalled();
  });

  it("keeps the yell with the primary when the backup signs up after it", () => {
    const yellers = new CityYellers(["Onyxiabuffog", "Onybuffogb"]);
    yellers.signUp("horde", "Onyxiabuffog", yell());
    expect(yellers.signUp("horde", "Onybuffogb", yell())).toBe("Onyxiabuffog");
  });

  it("lets the backup yell while the primary is away, and hands it back when the primary returns", () => {
    const yellers = new CityYellers(["Onyxiabuffog", "Onybuffogb"]);
    const primary = yell();
    const backup = yell();
    yellers.signUp("horde", "Onyxiabuffog", primary);
    yellers.signUp("horde", "Onybuffogb", backup);
    expect(yellers.leave("horde", "Onyxiabuffog", primary)).toBe("Onybuffogb");
    yellers.yellFor("horde")?.("first");
    expect(backup).toHaveBeenCalledWith("first");
    const back = yell();
    expect(yellers.signUp("horde", "Onyxiabuffog", back)).toBe("Onyxiabuffog");
    yellers.yellFor("horde")?.("second");
    expect(back).toHaveBeenCalledWith("second");
    expect(backup).toHaveBeenCalledTimes(1);
  });

  it("leaves a side with no yell once its last yeller is gone", () => {
    const yellers = new CityYellers(["Onyxiabuffog"]);
    const primary = yell();
    yellers.signUp("horde", "Onyxiabuffog", primary);
    expect(yellers.leave("horde", "Onyxiabuffog", primary)).toBeNull();
    expect(yellers.yellFor("horde")).toBeUndefined();
  });

  it("ignores a stale leave from a connection a reconnect has already replaced", () => {
    const yellers = new CityYellers(["Onyxiabuffog"]);
    const old = yell();
    const reconnected = yell();
    yellers.signUp("horde", "Onyxiabuffog", old);
    yellers.signUp("horde", "Onyxiabuffog", reconnected);
    expect(yellers.leave("horde", "Onyxiabuffog", old)).toBe("Onyxiabuffog");
    yellers.yellFor("horde")?.("still here");
    expect(reconnected).toHaveBeenCalledWith("still here");
  });

  it("keeps each side's yell to itself", () => {
    const yellers = new CityYellers(["Onyxiabuffog", "Onyxiabuffsw"]);
    yellers.signUp("horde", "Onyxiabuffog", yell());
    expect(yellers.holder("alliance")).toBeNull();
  });

  it("matches names whatever their case, and ranks an unlisted yeller last", () => {
    const yellers = new CityYellers(["ONYXIABUFFOG"]);
    yellers.signUp("horde", "Stranger", yell());
    expect(yellers.signUp("horde", "Onyxiabuffog", yell())).toBe("Onyxiabuffog");
  });
});
