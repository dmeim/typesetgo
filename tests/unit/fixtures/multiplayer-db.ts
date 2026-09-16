import type { MutationCtx } from "../../../convex/_generated/server";

/** In-memory boundary fixture: executes real handlers without a Convex client or URL. */
export function multiplayerDb(seed: Record<string, Record<string, unknown>[]>) {
  const tables = new Map(Object.entries(seed).map(([name, rows]) => [name,
    new Map(rows.map((row) => [row._id as string, structuredClone(row)]))]));
  let nextId = 0;
  const get = (id: string) => {
    for (const table of tables.values()) {
      if (table.has(id)) return structuredClone(table.get(id));
    }
    return null;
  };
  const db = {
    normalizeId: (table: string, id: string) => id.startsWith(`${table}:`) ? id : null,
    get: async (id: string) => get(id),
    insert: async (tableName: string, value: Record<string, unknown>) => {
      const table = tables.get(tableName) ?? new Map();
      tables.set(tableName, table);
      const id = `${tableName}:new${++nextId}`;
      table.set(id, { ...structuredClone(value), _id: id, _creationTime: Date.now() });
      return id;
    },
    patch: async (id: string, patch: Record<string, unknown>) => {
      for (const table of tables.values()) {
        const row = table.get(id);
        if (!row) continue;
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) delete row[key];
          else row[key] = structuredClone(value);
        }
        return;
      }
      throw new Error(`Missing fixture row: ${id}`);
    },
    delete: async (id: string) => {
      for (const table of tables.values()) table.delete(id);
    },
    query: (tableName: string) => {
      let rows = [...(tables.get(tableName)?.values() ?? [])];
      const query = {
        withIndex: (_name: string, filter: (q: { eq: (key: string, value: unknown) => unknown }) => unknown) => {
          filter({ eq: (key, value) => { rows = rows.filter((r) => r[key] === value); } });
          return query;
        },
        collect: async () => structuredClone(rows),
        first: async () => structuredClone(rows[0] ?? null),
      };
      return query;
    },
  };
  return { ctx: { db } as unknown as MutationCtx, get, rows: (name: string) => [...(tables.get(name)?.values() ?? [])] };
}
