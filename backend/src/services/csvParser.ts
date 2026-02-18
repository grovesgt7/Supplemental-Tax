import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface MappedProperty {
  address: string | null;
  city: string | null;
  county: string | null;
  zip: string | null;
  apn: string | null;
  clientName: string | null;
  clientEmail: string | null;
}

export interface MappedBill {
  address: string | null;
  apn: string | null;
  eventType: string | null;
  eventDate: string | null;
  oldAssessedValue: number | null;
  newAssessedValue: number | null;
  taxRate: number | null;
  status: string | null;
  dueDate: string | null;
  notes: string | null;
}

// Column name mappings: normalized key -> list of possible column names (lowercased)
const PROPERTY_COLUMN_MAP: Record<string, string[]> = {
  address: ['address', 'property address', 'street address', 'street', 'property', 'situs', 'situs address', 'prop address'],
  city: ['city', 'property city', 'situs city'],
  county: ['county', 'property county'],
  zip: ['zip', 'zipcode', 'zip code', 'postal code', 'postal', 'property zip'],
  apn: ['apn', 'parcel', 'parcel number', 'parcel no', 'parcel #', 'assessor parcel', 'assessor parcel number', 'assessors parcel number'],
  clientName: ['client', 'client name', 'owner', 'owner name', 'name', 'taxpayer', 'assessee'],
  clientEmail: ['email', 'client email', 'owner email', 'e-mail'],
};

const BILL_COLUMN_MAP: Record<string, string[]> = {
  address: ['address', 'property address', 'street address', 'street', 'property', 'situs', 'situs address'],
  apn: ['apn', 'parcel', 'parcel number', 'parcel no', 'parcel #', 'assessor parcel'],
  eventType: ['event type', 'event', 'type', 'transaction type', 'change type'],
  eventDate: ['event date', 'date', 'transaction date', 'change date', 'recording date', 'effective date', 'date of change'],
  oldAssessedValue: ['old value', 'old assessed value', 'prior value', 'previous value', 'former value', 'old assessed', 'prior assessed value', 'original value'],
  newAssessedValue: ['new value', 'new assessed value', 'current value', 'revised value', 'new assessed', 'current assessed value'],
  taxRate: ['tax rate', 'rate', 'rate %', 'rate%', 'tax rate %'],
  status: ['status', 'bill status', 'payment status'],
  dueDate: ['due date', 'due', 'payment due', 'delinquent date'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'description'],
};

/**
 * Parse a spreadsheet file (CSV, XLSX, XLS) from a buffer.
 * Detects file type from filename extension and parses accordingly.
 */
export function parseSpreadsheet(buffer: Buffer, filename: string): ParsedRow[] {
  const ext = filename.toLowerCase().split('.').pop() || '';

  let workbook: XLSX.WorkBook;

  try {
    if (ext === 'csv') {
      // For CSV, convert buffer to string first for better encoding handling
      const csvText = buffer.toString('utf-8');
      workbook = XLSX.read(csvText, { type: 'string' });
    } else {
      // For Excel formats (xlsx, xls)
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }
  } catch (err) {
    throw new Error(`Failed to parse spreadsheet: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Spreadsheet contains no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Could not read the first sheet');
  }

  // Convert to JSON array of objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false, // Get formatted strings for dates
  });

  if (rawRows.length === 0) {
    return [];
  }

  // Normalize the rows: trim keys and values
  const rows: ParsedRow[] = rawRows.map((row) => {
    const normalized: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      const trimmedKey = key.trim();
      if (value === null || value === undefined || value === '') {
        normalized[trimmedKey] = null;
      } else if (typeof value === 'number') {
        normalized[trimmedKey] = value;
      } else {
        normalized[trimmedKey] = String(value).trim();
      }
    }
    return normalized;
  });

  return rows;
}

/**
 * Find the best matching column in a row for a given target field.
 * Uses case-insensitive matching against known column name variants.
 */
function findColumn(rowKeys: string[], targetAliases: string[]): string | null {
  const normalizedKeys = rowKeys.map((k) => k.toLowerCase().trim());

  for (const alias of targetAliases) {
    const idx = normalizedKeys.indexOf(alias);
    if (idx !== -1) {
      return rowKeys[idx];
    }
  }

  // Try partial matching as a fallback
  for (const alias of targetAliases) {
    for (let i = 0; i < normalizedKeys.length; i++) {
      if (normalizedKeys[i].includes(alias) || alias.includes(normalizedKeys[i])) {
        return rowKeys[i];
      }
    }
  }

  return null;
}

/**
 * Extract a string value from a row for a given field.
 */
function getStringValue(row: ParsedRow, columnMap: Record<string, string[]>, field: string, rowKeys: string[]): string | null {
  const aliases = columnMap[field];
  if (!aliases) return null;

  const col = findColumn(rowKeys, aliases);
  if (!col) return null;

  const val = row[col];
  if (val === null || val === undefined) return null;
  return String(val).trim() || null;
}

/**
 * Extract a numeric value from a row for a given field.
 */
function getNumericValue(row: ParsedRow, columnMap: Record<string, string[]>, field: string, rowKeys: string[]): number | null {
  const aliases = columnMap[field];
  if (!aliases) return null;

  const col = findColumn(rowKeys, aliases);
  if (!col) return null;

  const val = row[col];
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') return val;

  // Parse string: remove $, commas, %, and whitespace
  const cleaned = String(val).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Map parsed spreadsheet rows to property fields.
 */
export function mapToProperties(rows: ParsedRow[]): MappedProperty[] {
  if (rows.length === 0) return [];

  const rowKeys = Object.keys(rows[0]);

  return rows.map((row) => ({
    address: getStringValue(row, PROPERTY_COLUMN_MAP, 'address', rowKeys),
    city: getStringValue(row, PROPERTY_COLUMN_MAP, 'city', rowKeys),
    county: getStringValue(row, PROPERTY_COLUMN_MAP, 'county', rowKeys),
    zip: getStringValue(row, PROPERTY_COLUMN_MAP, 'zip', rowKeys),
    apn: getStringValue(row, PROPERTY_COLUMN_MAP, 'apn', rowKeys),
    clientName: getStringValue(row, PROPERTY_COLUMN_MAP, 'clientName', rowKeys),
    clientEmail: getStringValue(row, PROPERTY_COLUMN_MAP, 'clientEmail', rowKeys),
  }));
}

/**
 * Map parsed spreadsheet rows to bill fields.
 */
export function mapToBills(rows: ParsedRow[]): MappedBill[] {
  if (rows.length === 0) return [];

  const rowKeys = Object.keys(rows[0]);

  return rows.map((row) => {
    const eventTypeRaw = getStringValue(row, BILL_COLUMN_MAP, 'eventType', rowKeys);
    let eventType: string | null = null;
    if (eventTypeRaw) {
      const lower = eventTypeRaw.toLowerCase();
      if (lower.includes('ownership') || lower.includes('transfer') || lower.includes('sale') || lower.includes('coo')) {
        eventType = 'change_of_ownership';
      } else if (lower.includes('construction') || lower.includes('build') || lower.includes('nc')) {
        eventType = 'new_construction';
      } else {
        eventType = eventTypeRaw;
      }
    }

    const statusRaw = getStringValue(row, BILL_COLUMN_MAP, 'status', rowKeys);
    let status: string | null = null;
    if (statusRaw) {
      const lower = statusRaw.toLowerCase();
      if (lower.includes('paid')) status = 'paid';
      else if (lower.includes('overdue') || lower.includes('delinquent')) status = 'overdue';
      else if (lower.includes('disput')) status = 'disputed';
      else if (lower.includes('pending')) status = 'pending';
      else status = statusRaw;
    }

    return {
      address: getStringValue(row, BILL_COLUMN_MAP, 'address', rowKeys),
      apn: getStringValue(row, BILL_COLUMN_MAP, 'apn', rowKeys),
      eventType,
      eventDate: getStringValue(row, BILL_COLUMN_MAP, 'eventDate', rowKeys),
      oldAssessedValue: getNumericValue(row, BILL_COLUMN_MAP, 'oldAssessedValue', rowKeys),
      newAssessedValue: getNumericValue(row, BILL_COLUMN_MAP, 'newAssessedValue', rowKeys),
      taxRate: getNumericValue(row, BILL_COLUMN_MAP, 'taxRate', rowKeys),
      status,
      dueDate: getStringValue(row, BILL_COLUMN_MAP, 'dueDate', rowKeys),
      notes: getStringValue(row, BILL_COLUMN_MAP, 'notes', rowKeys),
    };
  });
}
