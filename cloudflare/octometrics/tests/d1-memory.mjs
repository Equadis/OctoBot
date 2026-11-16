/**
 * An in-memory stand-in for D1 that really interprets the queries the Worker issues against metric_events, so tests exercise the real contract
 * instead of canned answers: INSERT stores a row with an id and a received_at; SELECT filters by realm and type (a literal, a list or a bound
 * value), orders by id (newest first by default) and honours LIMIT; queries the summary issues for raid-learning (json_extract) return nothing.
 */
export function memoryD1(seed = []) {
  const rows = [];
  const state = { rows, inserts: 0, queries: [] };
  let nextId = 1;
  const add = row => {
    const stored = {
      id: row.id ?? nextId, type: row.type, realm: row.realm ?? "N'Zoth", account: row.account, role: row.role,
      observed_at: row.observed_at, received_at: row.received_at ?? row.observed_at,
      payload_json: row.payload_json ?? JSON.stringify(row.payload ?? {}),
    };
    nextId = Math.max(nextId, stored.id) + 1;
    rows.push(stored);
    return stored;
  };
  seed.forEach(add);
  const types = (sql, args) => {
    const literal = /type='([a-z_]+)'/.exec(sql);
    if (literal) return [literal[1]];
    const list = /type IN \(([^)]*)\)/.exec(sql);
    if (list) return [...list[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    return null;
  };
  return {
    state,
    add,
    prepare: sql => ({
      bind: (...args) => ({
        all: async () => {
          state.queries.push(sql);
          if (/json_extract\(payload_json,'\$\.activityChange'\)/.test(sql)) return { results: [] };
          const wanted = types(sql, args);
          const limit = Number(/LIMIT (\d+)/.exec(sql)?.[1] ?? 1000);
          const found = rows.filter(r => (args[0] === undefined || r.realm === args[0]) && (!wanted || wanted.includes(r.type)));
          return { results: found.sort((a, b) => b.id - a.id).slice(0, limit).map(r => ({ ...r })) };
        },
        run: async () => {
          if (/^INSERT/.test(sql)) {
            const row = add({ type: args[0], realm: args[1], account: args[2], role: args[3], observed_at: args[4], payload_json: args[5], received_at: new Date().toISOString() });
            state.inserts += 1;
            return { meta: { last_row_id: row.id } };
          }
          return { meta: {} };
        },
      }),
      all: async () => ({ results: [] }),
      run: async () => ({ meta: {} }),
    }),
  };
}
