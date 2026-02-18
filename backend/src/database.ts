import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'supplemental_tax.db');

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase(): void {
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

// Initialize the database on module import
initDatabase();

export { db, initDatabase };
