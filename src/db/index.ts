import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle as drizzleNodePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePgLite } from 'drizzle-orm/pglite';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _pgliteInstance: PGlite | undefined;
  var _drizzleDb: any;
  var _dbInitialized: Promise<void> | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export async function initDatabase(): Promise<void> {
  if (global._dbInitialized) {
    return global._dbInitialized;
  }

  global._dbInitialized = (async () => {
    if (process.env.SQL_HOST) {
      console.log(`[Database] Connecting to PostgreSQL at ${process.env.SQL_HOST}:${process.env.SQL_DB_NAME}`);
      return;
    }

    console.log('[Database] SQL_HOST not detected — initializing in-memory PostgreSQL (PGlite)');
    if (!global._pgliteInstance) {
      global._pgliteInstance = new PGlite();
    }

    const ddlPath = path.resolve(process.cwd(), 'drizzle/0000_material_mister_fear.sql');
    if (fs.existsSync(ddlPath)) {
      const ddl = fs.readFileSync(ddlPath, 'utf8');
      await global._pgliteInstance.exec(ddl);
      console.log('[Database] In-memory database schema applied successfully.');
    } else {
      console.warn('[Database] DDL file not found at:', ddlPath);
    }
  })();

  return global._dbInitialized;
}

// Auto-trigger initialization in background for fast ready state
if (!process.env.SQL_HOST) {
  initDatabase().catch((err) => {
    console.error('[Database] Failed to initialize in-memory schema:', err);
  });
}

function getDbInstance() {
  if (global._drizzleDb) return global._drizzleDb;

  if (process.env.SQL_HOST) {
    const pool = createPool();
    global._drizzleDb = drizzleNodePg(pool, { schema });
  } else {
    if (!global._pgliteInstance) {
      global._pgliteInstance = new PGlite();
    }
    global._drizzleDb = drizzlePgLite(global._pgliteInstance, { schema });
  }

  return global._drizzleDb;
}

export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDbInstance();
    const val = instance[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});
