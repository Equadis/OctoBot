import { describe, expect, it } from "vitest";
import { PacketWriter } from "../net/byte-buffer.js";
import { nearestGameObject, parseDestroyObject, parseUpdateObject, type WorldGameObject } from "./update-object.js";

function packGuid(w: PacketWriter, guid: bigint): void {
  let mask = 0;
  const bytes: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    const b = Number((guid >> BigInt(i * 8)) & 0xffn);
    if (b) {
      mask |= 1 << i;
      bytes.push(b);
    }
  }
  w.u8(mask);
  for (const b of bytes) w.u8(b);
}

/** A minimal CREATE block (HAS_POSITION, no LIVING) for a player or GameObject. */
function block(w: PacketWriter, objType: number, guid: bigint, x: number, y: number, z: number, entry?: number): void {
  w.u8(2); // UPDATETYPE_CREATE
  packGuid(w, guid);
  w.u8(objType);
  w.u8(0x40); // UPDATEFLAG_HAS_POSITION
  w.f32LE(x).f32LE(y).f32LE(z).f32LE(0); // x, y, z, orientation
  if (entry !== undefined) w.u8(1).u32LE(0x08).u32LE(entry); // values: field 3 (OBJECT_FIELD_ENTRY)
  else w.u8(1).u32LE(0); // values: one empty block
}

// A real decompressed SMSG_UPDATE_OBJECT block captured live from OctoWoW (Stormwind):
// 14 GameObjects, no player. Ground truth for the 1.12 layout.
const REAL_OBJ =
  "0e0000000102fb4a2426540220f10552ae5b9ec5f47ddb4306e1d343598622400100000054160000011ff327014a240026540220f121000000265402000000803f3306000028000000317c743f5ad4973e01000000ae5b9ec5f47ddb4306e1d343598622400b0000006400000002fbc32496380120f10552c363a1c54a1c2244ac0cb5436002bf3f0100000048360000011ff32701c3240096380120f121000000963801000000803f2803000028000000e7c52d3f98fc3b3f01000000c363a1c54a1c2244ac0cb5436002bf3f0b0000006400000002fbea2497380120f10552ec61a1c5a89622448fc2ae436002bf3f0100000048360000011ff32701ea240097380120f121000000973801000000803f2703000028000000e7c52d3f98fc3b3f01000000ec61a1c5a89622448fc2ae436002bf3f0b0000006400000002fb221b36460220f105525ca3d7c58f6aa7c4e9a66f4383dd38c001000000633b0000011ff32701221b0036460220f121000000364602000000803f96090000280000000af47d3f503a01be010000005ca3d7c58f6aa7c4e9a66f4383dd38c00b0000006400000002fb211b35460220f105527bc6d7c5f6d896c41283324336023f4001000000633b0000011ff32701211b0035460220f121000000354602000000803f9609000028000000f4357f3f1dafa03d010000007bc6d7c5f6d896c41283324336023f400b0000006400000002db5aafb05020f105529a29c244f0a77043af945d42b1fb0ebc0100000014280000011ff327015aaf00b0500020f121000000b05000000000803fce010000280000007ff78ebb58ff7f3f010000009a29c244f0a77043af945d42b1fb0ebc0b0000006400000002db5bafad5020f10552296cc744bcb44543af945d42e9f1c73f0100000014280000011ff327015baf00ad500020f121000000ad5000000000803fce01000028000000543a343fafce353f01000000296cc744bcb44543af945d42e9f1c73f0b0000006400000002db5cafa95020f10552cd84c74466e691434bea6a41b62dcabf0100000014280000011ff327015caf00a9500020f121000000a95000000000803fc701000028000000c0ce35bf433a343f01000000cd84c74466e691434bea6a41b62dcabf0b0000006400000002db5dafab5020f10552b886c7445433974373a822c2e9f1c73f0100000014280000011ff327015daf00ab500020f121000000ab5000000000803fce01000028000000543a343fafce353f01000000b886c7445433974373a822c2e9f1c73f0b0000006400000002db65afaf5020f10552ae07c144e3c570434e2223c2b1fb0ebc0100000014280000011ff3270165af00af500020f121000000af5000000000803fc7010000280000007ff78ebb58ff7f3f01000000ae07c144e3c570434e2223c2b1fb0ebc0b0000006400000002db6dafb15020f1055229bcbf4475d37043a36301c2f18048400100000014280000011ff327016daf00b1500020f121000000b15000000000803fce0100002800000058ff7f3f7ff78e3b0100000029bcbf4475d37043a36301c2f18048400b0000006400000002db9aafae5020f10552b866c74468b13243d61622c2b62dcabf0100000014280000011ff327019aaf00ae500020f121000000ae5000000000803fce01000028000000c0ce35bf433a343f01000000b866c74468b13243d61622c2b62dcabf0b0000006400000002dba2afac5020f105525268c744dda43c434e2223c2e9f1c73f0100000014280000011ff32701a2af00ac500020f121000000ac5000000000803fc701000028000000543a343fafce353f010000005268c744dda43c434e2223c2e9f1c73f0b0000006400000002dbb0afaa5020f105524881c744775e8d43af945d42b62dcabf0100000014280000011ff32701b0af00aa500020f121000000aa5000000000803fce01000028000000c0ce35bf433a343f010000004881c744775e8d43af945d42b62dcabf0b00000064000000";

const go = (guid: bigint, entry: number, x: number, y: number, z: number): WorldGameObject => ({
  guid,
  entry,
  pos: { x, y, z },
});

describe("parseUpdateObject (real OctoWoW capture)", () => {
  it("extracts all 14 GameObjects with entries and positions", () => {
    const result = parseUpdateObject(Buffer.from(REAL_OBJ, "hex"));
    expect(result.gameObjects).toHaveLength(14);
    expect(result.self).toBeNull();
    const first = result.gameObjects[0]!;
    expect(first.entry).toBe(152614);
    expect(first.pos.x).toBeCloseTo(-5067.5, 0);
    expect(first.pos.y).toBeCloseTo(439.0, 0);
    expect(first.pos.z).toBeCloseTo(423.8, 0);
    // consumes the whole packet cleanly — every entry is a real (non-zero) id
    expect(result.gameObjects.every((g) => g.entry > 0)).toBe(true);
  });
});

// The head of a real 32KB Stormwind grid packet: GameObjects interleaved with pathing
// NPCs (spline movement). Truncated mid-block, so the parser must also return partial
// results. If the spline decode breaks, it desyncs and this GameObject count changes.
const BIG_GRID =
  "ec0000000002ffb30b3d23c20210f105509a2e0cc6d18202444200c24228642b3f01000000011ff12f01b30b3d23c20210f12100000023c202000000803f8f1900005935a83e4bca713f010000009a2e0cc6d18202444200c24228642b3f00000000080000006400000002db3d68f56210f105508f500cc65463ff43f940c442a41a66bf01000000011ff12f013d6800f5620010f121000000f56200009a99d93fd6000000936fdebe2594663f010000008f500cc65463ff43f940c442a41a66bf00000000090000006400000002dbaa66f26210f10550f6d80bc6ddfc02445b42c442950e1ec001000000011ff12f01aa6600f2620010f121000000f26200009a99d93fd6000000d1af713f42cda8be01000000f6d80bc6ddfc02445b42c442950e1ec000000000090000006400000002cff337014430f1037001014000f37d8802930b0cc6d10dfd433645c242173f1dc00000000000002040f6ff1f4100009040711c974000002040e00f494000000000f2010000a83100007ab800000a000000eeee0bc61cfaff431d32c242b8070cc68f72fd43a442c24282200cc602ebfa432b53c2424c390cc67563f8438791c24216520cc6e8dbf543f6d1c24249580cc6053af54311ddc2427b5e0cc61f98f4430ee6c242ae640cc63df6f34327f7c242336a0cc60466f3436906c342336a0cc60466f3436906c342336a0cc60466f3436906c34201000000061f004010fc5f000000000000000000c0df00ca0f38190000f3370144000030f109000000440000000000803f0e1400000e140000370000000b000000000101013b1d000020080000af2900000207010d030000000406010e040000000212011a00900000d0070000d0070000d0070000f4fd543e0000c03f46150000461500002a256c4357919a430000803f010000007c0000005b000000e70000002f00000049000000141e00000e14000001100000e4000000a2000000d2b1b243c958fa4302df3d3701d20130f103700001000060cc6f02cde70bc6374102446e14c142f9bd7540000000000000204014331b4100009040711c974000002040e00f494001000000061f0040101c40000000000000000000c0ff00ca0f381900003d3701d2010030f109000000d20100003333933f727e0000727e00003e0000000c0000000001000100920000d0070000d0070000d00700003d2cb43ecdccdc3f98060000980600006a0900006a350a44c40332440000803f020000008d000000670000000a0100003300000052000000cf0e0000727e00000110000006010000ba000000c2db99422b8ed34202cf3737014430f1037000010000f8a05102e1a80bc62f8d0144a0bac0426c2663400000000000002040f6ff1f4100009040711c974000002040e00f494001000000061f004010fc5f000000000000000000c0df00ca0f3819000037370144000030f109000000440000000000803f0e1400000e140000370000000b000000000100013b1d000020080000af2900000207010d030000000406010e040000000212011a00900000d0070000d0070000d007000008ac9c3e0000c03f5f0c00005f0c00002a256c4357919a430000803f010000007c0000005b000000e70000002f00000049000000141e00000e14000001100000e4000000a2000000d2b1b243c958fa4302dbb67c790e10f10550528709c6ddb4ff430416c8421dc9a9bf01000000011ff13f01b67c00790e0010f121000000790e00000000803f4e010000f69b1d3f17bb49bf01000000528709c6ddb4ff430416c8421dc9a9bf000000005e000000030000006400000002df2b3701170530f1037000010000ad22010048d809c6688101447e5dc54255c1854000000000000020401500004100009040711c974000002040e00f494001000000061f0040103c41000000000000000000c0df00ca0f381900002b370117050030f109000000170500000000803f4e0400004e0400001e0000000c00000000010101452a0000020e010d00920000d0070000d0070000d0070000f4fd543e0000c03fa1050000a105000023b62f422cbb5d420000803f050000003d0000003400000073000000200000002c000000b00400004e0400000110000066000000540000008ae82b42be5f6c4202df2c3701160530f1037000010000ad220100e1ef09c6eef4014457bbc5420894ac4000000000000020401500004100009040711c974000002040e00f494001000000061f0040103c41000000000000000000c0df00ca0f381900002c370116050030f109000000160500000000803f4e0400004e0400001e0000000c00000000010001171d0000020e010d00920000d0070000d0070000d007000008ac9c3e0000c03f910500009105000023b62f422cbb5d420000803f050000003d0000003400000073000000200000002c000000b00400004e0400000110000066000000540000008ae82b42be5f6c4202db3067430810f10550714f08c6276101442d12c1427215233f01000000011ff12f0130670043080010f121000000430800001f85ab3f1a0000000857a03e791f733f01000000714f08c6276101442d12c1427215233f00000000050000006400000002db2f67580810f10550484908c608dc00442477c1428c4a20c001000000011ff12f012f670058080010f121000000580800001f85ab3f1a000000791f733f0857a0be01000000484908c608dc00442477c1428c4a20c000000000050000006400000002fb34670dbe0210f10550004908c656d6004485dcbc428c4a20c001000000011ff12f013467000dbe0210f1210000000dbe02001f85ab3f1a000000791f733f0857a0be01000000004908c656d6004485dcbc428c4a20c000000000050000006400000002fb36671fbe0210f10550294908c69ad90044e0edbf428c4a20c001000000011ff12f013667001fbe0210f1210000001fbe02001f85ab3f1a000000791f733f0857a0be01000000294908c69ad90044e0edbf428c4a20c000000000050000006400000002db3767036310f10550c31508c6e91e01449cc4d74237890f4001000000011ff12f0137670003630010f12100000003630000cdccac3f770200002594663fb56fde3e01000000c31508c6e91e01449cc4d74237890f4000000000050000006400000002db32677b6d10f10550294808c6be4f01446a7cc1425f0a6fbf01000000011ff12f013267007b6d0010f1210000007b6d00001f85ab3f1a0000006073e6be469a643f01000000294808c6be4f01446a7cc1425f0a6fbf00000000050000006400000002db3367026310f105505c6808c60a07fa439cc4d74237890f4001000000011ff12f0133670002630010f12100000002630000cdccac3f770200002594663fb56fde3e010000005c6808c60a07fa439cc4d74237890f4000000000050000006400000002db3167896d10f105508f4f08c623630144a1b6be427215233f01000000011ff12f01316700896d0010f121000000896d00001f85ab3f1a0000000857a03e791f733f010000008f4f08c623630144a1b6be427215233f00000000050000006400000002fb356720be0210f105500a4908c62bd700448164be428c4a20c001000000011ff12f0135670020be0210f12100000020be02001f85ab3f1a000000791f733f0857a0be010000000a4908c62bd700448164be428c4a20c000000000050000006400000002df713701270530f1037000010000ad220100145e07c67b34024498eeca422636914000000000000020401500004100009040711c974000002040e00f494001000000061f0040105c4c000000000000000000c0df00ca0f3819000071370127050030f109000000270500000000803f4e0400004e0400001e0000000c00000000010001a90600000406010e0400000000920000d0070000d0070000d007000008ac9c3e0000c03fe6050000e605000023b62f422cbb5d420000803f074000003d0000003400000073000000200000002c000000b00400004e0400000110000066000000540000008ae82b42be5f6c4202db46674d0810f1055033a706c67d7f024439f4cc42fad3463f01000000011ff12f014667004d080010f1210000004d0800001f85ab3f1a00000048dec13e41f06c3f0100000033a706c67d7f024439f4cc42fad3463f00000000050000006400000002db4b67450810f10550e19f06c69308024439f4cc42d95a17c001000000011ff12f014b670045080010f121000000450800001f85ab3f1a00000030f06c3f48dec1be01000000e19f06c69308024439f4cc42d95a17c000000000050000006400000002db49677c6d10f10550d79f06c6777e02446d27ce42b64b4bbf01000000011ff12f014967007c6d0010f1210000007c6d00001f85ab3f1a000000fcfec5be5d156c3f01000000d79f06c6777e02446d27ce42b64b4bbf00000000050000006400000002db4867f86210f1055048b206c6fcc1004419c4e6420c052c3f01000000011ff12f01486700f8620010f121000000f8620000cdccac3f7702000042cda83ed1af713f0100000048b206c6fcc1004419c4e6420c052c3f00000000050000006400000002db45675f0810f1055048a706c69a0902446d27ce42f33c164001000000011ff12f014567005f080010f1210000005f0800001f85ab3f1a0000005d156c3ffcfec53e0100000048a706c69a0902446d27ce42f33c164000000000050000006400000002dfee37013a3830f10370000100008922010052690cc6cdfc0a44d1e2bb425c55bd4000000000000020401500004100009040711c974000002040e00f494001000000061f00c0301c40000000000000000000c0df00ca0f3c190000ee37013a380030f1090000003a380000cdcc8c3fe3a7000082090000e3a70000820900003c0000000c0000000002000000900000d0070000d0070000d0070000d656ac3e3333d33f5f3800005f38000047c10b448f4034440000803f030000008100000055000000ea0000004600000096000000cf0e000082090000e3a7000001100000ee0000009600000005a38e422820c44202df363701b80730f1037001014000f37d8802fa9b0bc6ae2808443ff2be420b3812400000000000002040f6ff1f4100009040711c974000002040e00f49400000000090010000991d00002fb800000700000068840bc6537506443510bf425c990bc652f8074493f5be4250ae0bc6517b0944f1dabe4244c30bc652fe0a44cad7bd4281c80bc6155f0b441fb3bd42ecca0bc6c78b0b44bf96bd42ecca0bc6c78b0b44bf96bd42ecca0bc6c78b0b44bf96bd4201000000061f004010fc5f000000000000000000c0df00ca0f38190000363701b8070030f109000000b80700000000803f0e1400000e140000370000000b000000000101013b1d000020080000af2900000207010d030000000406010e040000000212011a00900000d0070000d0070000d0070000f4fd543e0000c03f46150000461500002a256c4357919a430000803f010000007c0000005b000000e70000002f00000049000000141e";

describe("parseUpdateObject (real grid packet with pathing NPCs)", () => {
  it("stays in sync through spline movement blocks and returns partial on truncation", () => {
    const result = parseUpdateObject(Buffer.from(BIG_GRID, "hex"));
    // Parsing past the spline-moving NPCs yields the interleaved GameObjects.
    expect(result.gameObjects.length).toBe(18);
    expect(result.gameObjects.every((g) => g.entry > 0)).toBe(true);
  });
});

describe("parseUpdateObject incomplete packets", () => {
  it("reads a whole packet without complaint", () => {
    expect(parseUpdateObject(Buffer.from(REAL_OBJ, "hex")).incomplete).toBeNull();
  });

  it("says where a packet stopped being readable, and what it was reading", () => {
    const { incomplete } = parseUpdateObject(Buffer.from(BIG_GRID, "hex"));
    expect(incomplete).not.toBeNull();
    expect(incomplete?.of).toBe(0xec); // the block count the packet announced
    expect(incomplete?.block).toBeGreaterThan(0);
    expect(incomplete?.block).toBeLessThan(0xec);
    expect(incomplete?.what).toMatch(/^update type \d+, guid 0x[0-9a-f]+/);
    expect(incomplete?.reason).toMatch(/read past end/);
  });

  it("names an update type it does not know", () => {
    const body = new PacketWriter().u32LE(2).u8(0).u8(9).packedGuid(0x555n).toBuffer();
    expect(parseUpdateObject(body).incomplete).toEqual({
      block: 0,
      of: 2,
      what: "update type 9, guid 0x555",
      reason: "unknown update type",
    });
  });

  it("flags bytes left over after the last block — one was read at the wrong size", () => {
    const body = new PacketWriter().u32LE(0).u8(0).u32LE(0xdead).toBuffer();
    expect(parseUpdateObject(body).incomplete?.reason).toBe("4 bytes left over");
  });

  it("names the movement flags of a movement block it could not read", () => {
    const body = new PacketWriter().u32LE(1).u8(0).u8(2).packedGuid(0x555n).u8(3).u8(0x20).u32LE(0x400000).u32LE(0).toBuffer();
    expect(parseUpdateObject(body).incomplete?.reason).toMatch(/movement flags 0x400000/);
  });
});

describe("parseUpdateObject paths (real grid packet)", () => {
  it("reads where a walking NPC's path ends, and no path for one standing still", () => {
    const { positions } = parseUpdateObject(Buffer.from(BIG_GRID, "hex"));
    const walker = positions.find((p) => p.guid === 0xf1300000440137f3n); // a Stormwind guard on patrol
    expect(walker?.destination?.x).toBeCloseTo(-8986.5, 0);
    expect(walker?.destination?.y).toBeCloseTo(486.8, 0);
    const standing = positions.find((p) => p.guid === 0xf1300001d201373dn);
    expect(standing?.destination).toBeNull();
  });
});

describe("parseUpdateObject self-guid filtering", () => {
  function packet(): Buffer {
    const w = new PacketWriter();
    w.u32LE(3); // object count
    w.u8(0); // hasTransport
    block(w, 4, 1n, 10, 20, 30); // OBJTYPE_PLAYER — us (guid 1)
    block(w, 4, 2n, 100, 200, 300); // OBJTYPE_PLAYER — a bystander (guid 2)
    block(w, 5, 3n, 11, 21, 31, 24397); // OBJTYPE_GAMEOBJECT — the bench
    return w.toBuffer();
  }

  it("takes OUR position by guid, not a bystander player in the same packet", () => {
    const mine = parseUpdateObject(packet(), 1n);
    expect(mine.self?.x).toBeCloseTo(10, 1);
    expect(mine.self?.y).toBeCloseTo(20, 1);
    expect(mine.gameObjects).toHaveLength(1);
    expect(mine.gameObjects[0]?.entry).toBe(24397);
  });

  it("without a self-guid, the last player wins (the legacy bug we fixed)", () => {
    const legacy = parseUpdateObject(packet());
    expect(legacy.self?.x).toBeCloseTo(100, 1); // the bystander at (100,200,300)
  });
});

describe("parseUpdateObject self health", () => {
  /** A VALUES block carrying only UNIT_FIELD_HEALTH (field 22) — what a hit sends. */
  function healthUpdate(w: PacketWriter, guid: bigint, health: number): void {
    w.u8(0); // UPDATETYPE_VALUES
    w.packedGuid(guid);
    w.u8(1).u32LE(1 << 22).u32LE(health);
  }

  /** A CREATE block for a player carrying its entry-less values: health (22) only. */
  function createPlayer(w: PacketWriter, guid: bigint, health: number): void {
    w.u8(2).packedGuid(guid).u8(4).u8(0x40);
    w.f32LE(1).f32LE(2).f32LE(3).f32LE(0);
    w.u8(1).u32LE(1 << 22).u32LE(health);
  }

  function packet(write: (w: PacketWriter) => void, count: number): Buffer {
    const w = new PacketWriter().u32LE(count).u8(0);
    write(w);
    return w.toBuffer();
  }

  it("reads our health from a values update", () => {
    const body = packet((w) => healthUpdate(w, 7n, 0), 1);
    expect(parseUpdateObject(body, 7n).selfHealth).toBe(0);
  });

  it("reads our health from the block that creates us", () => {
    const body = packet((w) => createPlayer(w, 7n, 3100), 1);
    expect(parseUpdateObject(body, 7n).selfHealth).toBe(3100);
  });

  it("ignores a bystander's health, so their death is never taken for ours", () => {
    const body = packet((w) => {
      healthUpdate(w, 7n, 2800);
      healthUpdate(w, 9n, 0);
    }, 2);
    expect(parseUpdateObject(body, 7n).selfHealth).toBe(2800);
  });

  it("reports nothing without our guid, or when no block carried our health", () => {
    expect(parseUpdateObject(packet((w) => healthUpdate(w, 7n, 0), 1)).selfHealth).toBeNull();
    expect(parseUpdateObject(packet((w) => healthUpdate(w, 9n, 0), 1), 7n).selfHealth).toBeNull();
  });
});

describe("parseUpdateObject unit owners", () => {
  const WARLOCK = 0x1234n;
  const INFERNAL = 0xf130_0000_5900_0abcn; // creature entry 89
  const BENCH = 0xf110_0000_5f4d_0001n; // a GameObject

  /** A values block carrying the given fields, which must all sit in the first 32. */
  function values(w: PacketWriter, fields: readonly (readonly [number, number])[]): void {
    let mask = 0;
    for (const [index] of fields) mask |= 1 << index;
    w.u8(1).u32LE(mask >>> 0);
    for (const [, value] of [...fields].sort(([a], [b]) => a - b)) w.u32LE(value);
  }

  function packet(count: number, write: (w: PacketWriter) => void): Buffer {
    const w = new PacketWriter().u32LE(count).u8(0);
    write(w);
    return w.toBuffer();
  }

  it("reads who holds a unit from the block that creates it", () => {
    const body = packet(1, (w) => {
      w.u8(2).packedGuid(INFERNAL).u8(3).u8(0x40).f32LE(1).f32LE(2).f32LE(3).f32LE(0);
      values(w, [[3, 89], [10, 0x1234], [22, 3000]]); // entry, CHARMEDBY low word, health
    });
    expect(parseUpdateObject(body).ownerChanges).toEqual([
      { kind: "create", guid: INFERNAL, words: new Map([[10, 0x1234]]) },
    ]);
  });

  it("passes on every unit's create, owned or not, but no GameObject's", () => {
    const body = packet(2, (w) => {
      w.u8(2).packedGuid(WARLOCK).u8(4).u8(0x40).f32LE(1).f32LE(2).f32LE(3).f32LE(0);
      values(w, [[22, 3000]]);
      w.u8(2).packedGuid(BENCH).u8(5).u8(0x40).f32LE(1).f32LE(2).f32LE(3).f32LE(0);
      values(w, [[3, 24397], [10, 0x3f800000]]); // a GameObject's rotation sits at the same index
    });
    expect(parseUpdateObject(body).ownerChanges).toEqual([{ kind: "create", guid: WARLOCK, words: new Map() }]);
  });

  it("reads an owner change from a unit's values update, and ignores a GameObject's", () => {
    const body = packet(3, (w) => {
      w.u8(0).packedGuid(INFERNAL);
      values(w, [[10, 0], [11, 0]]); // the charm breaks
      w.u8(0).packedGuid(BENCH);
      values(w, [[10, 0x3f800000]]);
      w.u8(0).packedGuid(WARLOCK);
      values(w, [[22, 2500]]); // no owner words: nothing to pass on
    });
    expect(parseUpdateObject(body).ownerChanges).toEqual([
      { kind: "values", guid: INFERNAL, words: new Map([[10, 0], [11, 0]]) },
    ]);
  });

  it("reports units that left view, in block order with the rest", () => {
    const body = packet(2, (w) => {
      w.u8(4).u32LE(2).packedGuid(INFERNAL).packedGuid(BENCH); // OUT_OF_RANGE
      w.u8(0).packedGuid(INFERNAL);
      values(w, [[14, 0x1234]]);
    });
    expect(parseUpdateObject(body).ownerChanges).toEqual([
      { kind: "out-of-range", guid: INFERNAL },
      { kind: "values", guid: INFERNAL, words: new Map([[14, 0x1234]]) },
    ]);
  });
});

describe("parseUpdateObject positions", () => {
  const INFERNAL = 0xf130_0000_5900_0abcn;
  const GANKER = 0x555n;
  const US = 0x77n;

  function packet(count: number, write: (w: PacketWriter) => void): Buffer {
    const w = new PacketWriter().u32LE(count).u8(0);
    write(w);
    return w.toBuffer();
  }

  it("places the units and players coming into view, but never us", () => {
    const body = packet(3, (w) => {
      w.u8(2).packedGuid(INFERNAL).u8(3).u8(0x40).f32LE(10).f32LE(20).f32LE(30).f32LE(0).u8(0); // unit
      w.u8(2).packedGuid(GANKER).u8(4).u8(0x40).f32LE(11).f32LE(21).f32LE(31).f32LE(0).u8(0); // player
      w.u8(2).packedGuid(US).u8(4).u8(0x40).f32LE(1).f32LE(2).f32LE(3).f32LE(0).u8(0); // us
    });
    const { positions, self } = parseUpdateObject(body, US);
    expect(positions.map((p) => p.guid)).toEqual([INFERNAL, GANKER]);
    expect(positions[0]?.pos.x).toBeCloseTo(10, 1);
    expect(self?.x).toBeCloseTo(1, 1);
  });

  it("says where a unit that comes into view already running is heading", () => {
    const body = packet(1, (w) => {
      w.u8(2).packedGuid(INFERNAL).u8(3).u8(0x20); // CREATE, a unit, LIVING
      w.u32LE(0x00400001).u32LE(0); // moving forward on a spline; time
      w.f32LE(90).f32LE(0).f32LE(0).f32LE(0); // at 90 yd, orientation
      w.u32LE(0); // fall time
      for (let i = 0; i < 6; i += 1) w.f32LE(7); // speeds
      w.u32LE(0).u32LE(0).u32LE(12_000).u32LE(5).u32LE(1); // spline flags, time passed, duration, id, 1 point
      w.f32LE(45).f32LE(0).f32LE(0); // the point
      w.f32LE(2).f32LE(0).f32LE(0); // where it ends — beside us
      w.u8(0); // no values
    });
    const { positions } = parseUpdateObject(body, US);
    expect(positions[0]?.pos.x).toBeCloseTo(90, 1);
    expect(positions[0]?.destination?.x).toBeCloseTo(2, 1);
  });

  it("reads past a path that ends facing a point, a target or an angle, to the objects after it", () => {
    const WALKER = 0xf130_000d_b001_614bn;
    const facings: readonly [string, number, (w: PacketWriter) => void][] = [
      ["point", 0x00010000, (w) => void w.f32LE(5).f32LE(6).f32LE(7)],
      ["target", 0x00020000, (w) => void w.u64LE(GANKER)],
      ["angle", 0x00040000, (w) => void w.f32LE(1.5)],
    ];
    for (const [facing, flag, writeFacing] of facings) {
      const body = packet(2, (w) => {
        w.u8(2).packedGuid(WALKER).u8(3).u8(0x70); // CREATE, a unit, LIVING | HAS_POSITION | ALL
        w.u32LE(0x00400101).u32LE(0); // walking forward on a spline; time
        w.f32LE(90).f32LE(0).f32LE(0).f32LE(0); // at 90 yd, orientation
        w.u32LE(0); // fall time
        for (let i = 0; i < 6; i += 1) w.f32LE(2.5); // speeds
        w.u32LE(flag | 0x100); // spline flags: walking, and how it ends facing
        writeFacing(w);
        w.u32LE(0).u32LE(12_000).u32LE(5).u32LE(1); // time passed, duration, id, 1 point
        w.f32LE(45).f32LE(0).f32LE(0); // the point
        w.f32LE(20).f32LE(0).f32LE(0); // where it ends
        w.u32LE(1); // UPDATEFLAG_ALL's word
        w.u8(0); // no values
        w.u8(2).packedGuid(INFERNAL).u8(3).u8(0x40).f32LE(10).f32LE(20).f32LE(30).f32LE(0).u8(0); // after it
      });
      const { positions, incomplete } = parseUpdateObject(body, US);
      expect({ facing, incomplete }).toEqual({ facing, incomplete: null });
      expect(positions.map((p) => p.guid)).toEqual([WALKER, INFERNAL]);
      expect(positions[0]?.destination?.x).toBeCloseTo(20, 1);
    }
  });

  it("reads past a unit that is attacking something, or no one, to the objects after it", () => {
    for (const target of [US, 0n]) {
      const body = packet(2, (w) => {
        w.u8(2).packedGuid(GANKER).u8(4).u8(0x74); // CREATE, a player, LIVING | HAS_POSITION | ALL | attacking
        w.u32LE(0).u32LE(0); // standing still; time
        w.f32LE(12).f32LE(0).f32LE(0).f32LE(0); // at 12 yd, orientation
        w.u32LE(0); // fall time
        for (let i = 0; i < 6; i += 1) w.f32LE(7); // speeds
        w.u32LE(1); // UPDATEFLAG_ALL's word
        w.packedGuid(target); // whom it is attacking
        w.u8(0); // no values
        w.u8(2).packedGuid(INFERNAL).u8(3).u8(0x40).f32LE(10).f32LE(20).f32LE(30).f32LE(0).u8(0); // after it
      });
      const { positions, incomplete } = parseUpdateObject(body, US);
      expect({ target, incomplete }).toEqual({ target, incomplete: null });
      expect(positions.map((p) => p.guid)).toEqual([GANKER, INFERNAL]);
    }
  });

  it("reads another player's race, class and health, but never ours", () => {
    const player = (w: PacketWriter, guid: bigint, health: number): void => {
      w.u8(2).packedGuid(guid).u8(4).u8(0x40).f32LE(1).f32LE(2).f32LE(3).f32LE(0);
      // Two mask words: health is field 22, race/class/gender/power field 36.
      w.u8(2).u32LE(1 << 22).u32LE(1 << (36 - 32));
      w.u32LE(health).u32LE(0x00010502); // an Orc (2) Priest (5)
    };
    const body = packet(2, (w) => {
      player(w, GANKER, 1200);
      player(w, US, 900);
    });
    expect(parseUpdateObject(body, US).players).toEqual([{ guid: GANKER, raceId: 2, classId: 5, health: 1200 }]);
  });

  it("places a unit whose movement block alone was updated", () => {
    const body = packet(1, (w) => {
      w.u8(1).packedGuid(INFERNAL).u8(0x40).f32LE(50).f32LE(60).f32LE(70).f32LE(0); // MOVEMENT
    });
    const { positions } = parseUpdateObject(body, US);
    expect(positions).toHaveLength(1);
    expect(positions[0]?.guid).toBe(INFERNAL);
    expect(positions[0]?.pos.y).toBeCloseTo(60, 1);
  });
});

describe("parseDestroyObject", () => {
  it("reads the full GUID of the object removed", () => {
    const body = new PacketWriter().u64LE(0xf130_0000_5900_0abcn).toBuffer();
    expect(parseDestroyObject(body)).toBe(0xf130_0000_5900_0abcn);
  });
});

describe("nearestGameObject", () => {
  it("returns the closest object by 3D distance", () => {
    const objects = [
      go(1n, 100, -8859, 650, 98),
      go(2n, 24397, -8824.2, 638.1, 94.2), // the bench she's parked on
      go(3n, 61095, -8826.2, 635.7, 94.2),
    ];
    const nearest = nearestGameObject(objects, { x: -8824.6, y: 637.8, z: 94.2 });
    expect(nearest?.guid).toBe(2n);
    expect(nearest?.entry).toBe(24397);
  });

  it("returns null when there are no objects", () => {
    expect(nearestGameObject([], { x: 0, y: 0, z: 0 })).toBeNull();
  });
});
