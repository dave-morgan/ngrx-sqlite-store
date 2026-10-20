import type { Migration } from '../storage/storage-engine';

/** Register via new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS }). */
export const SCHEMA_MIGRATIONS: Migration[] = [
  {
    version: 2,
    up: async (exec) => {
      await exec.exec(`
      CREATE TABLE nss_node (
        path TEXT PRIMARY KEY, parent TEXT, kind INTEGER NOT NULL, pos REAL, value TEXT
      ) WITHOUT ROWID;
      CREATE INDEX nss_node_parent ON nss_node(parent, pos);
      CREATE TABLE nss_chunk (
        path TEXT NOT NULL, seq INTEGER NOT NULL, data TEXT NOT NULL,
        PRIMARY KEY(path, seq)
      ) WITHOUT ROWID;
      CREATE TABLE nss_entity (
        coll TEXT NOT NULL, id TEXT NOT NULL, pos REAL NOT NULL, sortkey TEXT,
        data TEXT NOT NULL, PRIMARY KEY(coll, id)
      ) WITHOUT ROWID;
      CREATE INDEX nss_entity_order ON nss_entity(coll, pos);
    `);
    },
  },
];
