import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'supplemental_tax.db');

let sqlDb: SqlJsDatabase;
let inTransaction = false;

function saveToFile(): void {
  if (inTransaction || !sqlDb) return;
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Wrapper around sql.js that provides a better-sqlite3-compatible API.
 * This allows all existing route files to work without changes.
 */
const db = {
  prepare(sql: string) {
    return {
      get(...params: unknown[]): Record<string, unknown> | undefined {
        const stmt = sqlDb.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params.map(p => p === undefined ? null : p) as (number | string | Uint8Array | null)[]);
          }
          if (stmt.step()) {
            return stmt.getAsObject() as Record<string, unknown>;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params: unknown[]): Record<string, unknown>[] {
        const stmt = sqlDb.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params.map(p => p === undefined ? null : p) as (number | string | Uint8Array | null)[]);
          }
          const rows: Record<string, unknown>[] = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject() as Record<string, unknown>);
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      run(...params: unknown[]): { changes: number } {
        if (params.length > 0) {
          sqlDb.run(sql, params.map(p => p === undefined ? null : p) as (number | string | Uint8Array | null)[]);
        } else {
          sqlDb.run(sql);
        }
        saveToFile();
        return { changes: sqlDb.getRowsModified() };
      },
    };
  },

  exec(sql: string): void {
    sqlDb.exec(sql);
    saveToFile();
  },

  pragma(pragma: string): void {
    sqlDb.run(`PRAGMA ${pragma}`);
  },

  transaction<T>(fn: () => T): () => T {
    return () => {
      sqlDb.run('BEGIN TRANSACTION');
      inTransaction = true;
      try {
        const result = fn();
        sqlDb.run('COMMIT');
        inTransaction = false;
        saveToFile();
        return result;
      } catch (err) {
        sqlDb.run('ROLLBACK');
        inTransaction = false;
        throw err;
      }
    };
  },
};

async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  // Enable foreign keys
  sqlDb.run('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT,
      county TEXT,
      zip TEXT,
      apn TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      bill_type TEXT NOT NULL CHECK (bill_type IN ('first_supplemental', 'second_supplemental')),
      event_type TEXT NOT NULL CHECK (event_type IN ('change_of_ownership', 'new_construction')),
      event_date TEXT NOT NULL,
      old_assessed_value REAL NOT NULL,
      new_assessed_value REAL NOT NULL,
      supplemental_value REAL NOT NULL,
      tax_rate REAL NOT NULL,
      annual_tax_amount REAL NOT NULL,
      prorated_tax_amount REAL NOT NULL,
      proration_factor REAL NOT NULL,
      fiscal_year_start TEXT NOT NULL,
      fiscal_year_end TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'disputed')),
      paid_date TEXT,
      paid_amount REAL,
      penalty_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS escrow_accounts (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      escrow_company TEXT,
      monthly_escrow_amount REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      annual_tax_budget REAL NOT NULL DEFAULT 0,
      expected_supplemental REAL NOT NULL DEFAULT 0,
      shortage_amount REAL NOT NULL DEFAULT 0,
      shortage_detected INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploaded_documents (
      id TEXT PRIMARY KEY,
      bill_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      parsed_data TEXT,
      upload_date TEXT NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id);
    CREATE INDEX IF NOT EXISTS idx_bills_property_id ON bills(property_id);
    CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    CREATE INDEX IF NOT EXISTS idx_bills_event_date ON bills(event_date);
    CREATE INDEX IF NOT EXISTS idx_escrow_accounts_property_id ON escrow_accounts(property_id);
    CREATE INDEX IF NOT EXISTS idx_uploaded_documents_bill_id ON uploaded_documents(bill_id);
  `);
}

export { db, initDatabase };
