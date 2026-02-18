import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { parseTaxBillPdf } from '../services/pdfParser';
import { parseSpreadsheet, mapToProperties, mapToBills } from '../services/csvParser';
import { calculateSupplementalTax, getDefaultTaxRate } from '../services/taxCalculator';

const router = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // fallback for some CSV uploads
    ];

    const allowedExtensions = ['.pdf', '.csv', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${ext}). Allowed: PDF, CSV, XLS, XLSX`));
    }
  },
});

/**
 * POST /api/upload/pdf
 * Upload and parse a tax bill PDF.
 * Returns extracted data from the PDF.
 */
router.post('/pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded. Use field name "file".' });
      return;
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    const parsedData = await parseTaxBillPdf(fileBuffer);

    // Save document record
    const docId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO uploaded_documents (id, bill_id, filename, original_name, file_type, parsed_data, upload_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      null, // bill_id is null until user associates it
      req.file.filename,
      req.file.originalname,
      'pdf',
      JSON.stringify(parsedData),
      now
    );

    res.json({
      success: true,
      data: {
        documentId: docId,
        filename: req.file.originalname,
        parsed: parsedData,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/upload/spreadsheet
 * Upload and parse a CSV or Excel spreadsheet.
 * Returns parsed rows and mapped property/bill data.
 */
router.post('/spreadsheet', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded. Use field name "file".' });
      return;
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    const rows = parseSpreadsheet(fileBuffer, req.file.originalname);
    const properties = mapToProperties(rows);
    const bills = mapToBills(rows);

    // Save document record
    const docId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO uploaded_documents (id, bill_id, filename, original_name, file_type, parsed_data, upload_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      null,
      req.file.filename,
      req.file.originalname,
      path.extname(req.file.originalname).replace('.', ''),
      JSON.stringify({ rows, properties, bills }),
      now
    );

    res.json({
      success: true,
      data: {
        documentId: docId,
        filename: req.file.originalname,
        totalRows: rows.length,
        rawRows: rows,
        mappedProperties: properties,
        mappedBills: bills,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/upload/import
 * Import parsed spreadsheet data into the database.
 * Creates clients, properties, and bills from the parsed data.
 *
 * Body: {
 *   documentId?: string,
 *   defaultClientName?: string,
 *   defaultCounty?: string,
 *   defaultTaxRate?: number,
 *   defaultEventType?: string,
 *   properties: MappedProperty[],
 *   bills: MappedBill[]
 * }
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const {
      defaultClientName,
      defaultCounty,
      defaultTaxRate,
      defaultEventType,
      properties,
      bills,
    } = req.body;

    if (!properties && !bills) {
      res.status(400).json({ success: false, error: 'Either properties or bills array is required' });
      return;
    }

    const now = new Date().toISOString();
    const results = {
      clientsCreated: 0,
      propertiesCreated: 0,
      billsCreated: 0,
      errors: [] as string[],
    };

    // Cache for client name -> client id mapping to avoid duplicates
    const clientCache: Map<string, string> = new Map();

    // Cache for address/APN -> property id mapping
    const propertyCache: Map<string, string> = new Map();

    // Use a transaction for atomicity
    const importTransaction = db.transaction(() => {
      // Import properties first
      const propertyList = properties || [];
      for (let i = 0; i < propertyList.length; i++) {
        const prop = propertyList[i];
        try {
          const clientName = prop.clientName || defaultClientName || 'Unknown Client';
          let clientId = clientCache.get(clientName.toLowerCase());

          if (!clientId) {
            // Check if client already exists by name
            const existingClient = db.prepare(
              'SELECT id FROM clients WHERE LOWER(name) = LOWER(?)'
            ).get(clientName) as { id: string } | undefined;

            if (existingClient) {
              clientId = existingClient.id;
            } else {
              clientId = uuidv4();
              db.prepare(`
                INSERT INTO clients (id, name, email, phone, company, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(clientId, clientName, prop.clientEmail || null, null, null, now, now);
              results.clientsCreated++;
            }
            clientCache.set(clientName.toLowerCase(), clientId);
          }

          const address = prop.address || `Unknown Address (row ${i + 1})`;
          const cacheKey = (prop.apn || address).toLowerCase();
          let propertyId = propertyCache.get(cacheKey);

          if (!propertyId) {
            propertyId = uuidv4();
            db.prepare(`
              INSERT INTO properties (id, client_id, address, city, county, zip, apn, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              propertyId,
              clientId,
              address,
              prop.city || null,
              prop.county || defaultCounty || null,
              prop.zip || null,
              prop.apn || null,
              now
            );
            results.propertiesCreated++;
            propertyCache.set(cacheKey, propertyId);
          }
        } catch (rowErr) {
          results.errors.push(`Property row ${i + 1}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
        }
      }

      // Import bills
      const billList = bills || [];
      for (let i = 0; i < billList.length; i++) {
        const bill = billList[i];
        try {
          // Find the property for this bill (by APN or address)
          let propertyId: string | undefined;

          if (bill.apn) {
            propertyId = propertyCache.get(bill.apn.toLowerCase());
            if (!propertyId) {
              const existingProp = db.prepare(
                'SELECT id FROM properties WHERE LOWER(apn) = LOWER(?)'
              ).get(bill.apn) as { id: string } | undefined;
              if (existingProp) {
                propertyId = existingProp.id;
              }
            }
          }

          if (!propertyId && bill.address) {
            propertyId = propertyCache.get(bill.address.toLowerCase());
            if (!propertyId) {
              const existingProp = db.prepare(
                'SELECT id FROM properties WHERE LOWER(address) = LOWER(?)'
              ).get(bill.address) as { id: string } | undefined;
              if (existingProp) {
                propertyId = existingProp.id;
              }
            }
          }

          // If still no property, create one with a default client
          if (!propertyId) {
            const clientName = defaultClientName || 'Unknown Client';
            let clientId = clientCache.get(clientName.toLowerCase());

            if (!clientId) {
              const existingClient = db.prepare(
                'SELECT id FROM clients WHERE LOWER(name) = LOWER(?)'
              ).get(clientName) as { id: string } | undefined;

              if (existingClient) {
                clientId = existingClient.id;
              } else {
                clientId = uuidv4();
                db.prepare(`
                  INSERT INTO clients (id, name, email, phone, company, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(clientId, clientName, null, null, null, now, now);
                results.clientsCreated++;
              }
              clientCache.set(clientName.toLowerCase(), clientId);
            }

            propertyId = uuidv4();
            const address = bill.address || `Unknown Address (bill row ${i + 1})`;
            db.prepare(`
              INSERT INTO properties (id, client_id, address, city, county, zip, apn, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(propertyId, clientId, address, null, defaultCounty || null, null, bill.apn || null, now);
            results.propertiesCreated++;

            const cacheKey = (bill.apn || address).toLowerCase();
            propertyCache.set(cacheKey, propertyId);
          }

          // Calculate tax if we have enough data
          const eventDate = bill.eventDate || now.split('T')[0];
          const oldValue = bill.oldAssessedValue || 0;
          const newValue = bill.newAssessedValue || 0;
          const county = defaultCounty || '';
          const taxRate = bill.taxRate || defaultTaxRate || getDefaultTaxRate(county);
          const eventType = bill.eventType || defaultEventType || 'change_of_ownership';

          // Validate event type
          const validEventType = ['change_of_ownership', 'new_construction'].includes(eventType)
            ? eventType
            : 'change_of_ownership';

          const calcResult = calculateSupplementalTax({
            eventDate,
            oldAssessedValue: oldValue,
            newAssessedValue: newValue,
            taxRate,
          });

          const billId = uuidv4();
          const firstBill = calcResult.firstBill;

          db.prepare(`
            INSERT INTO bills (
              id, property_id, bill_type, event_type, event_date,
              old_assessed_value, new_assessed_value, supplemental_value,
              tax_rate, annual_tax_amount, prorated_tax_amount, proration_factor,
              fiscal_year_start, fiscal_year_end, due_date, status,
              penalty_amount, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            billId,
            propertyId,
            'first_supplemental',
            validEventType,
            eventDate,
            oldValue,
            newValue,
            calcResult.supplementalValue,
            taxRate,
            firstBill.annualTaxAmount,
            firstBill.proratedTaxAmount,
            firstBill.prorationFactor,
            firstBill.fiscalYearStart,
            firstBill.fiscalYearEnd,
            bill.dueDate || null,
            bill.status || 'pending',
            0,
            bill.notes || null,
            now,
            now
          );
          results.billsCreated++;

          // Also create second supplemental bill if applicable
          if (calcResult.secondBill) {
            const secondBillId = uuidv4();
            const secondBill = calcResult.secondBill;

            db.prepare(`
              INSERT INTO bills (
                id, property_id, bill_type, event_type, event_date,
                old_assessed_value, new_assessed_value, supplemental_value,
                tax_rate, annual_tax_amount, prorated_tax_amount, proration_factor,
                fiscal_year_start, fiscal_year_end, due_date, status,
                penalty_amount, notes, created_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              secondBillId,
              propertyId,
              'second_supplemental',
              validEventType,
              eventDate,
              oldValue,
              newValue,
              calcResult.supplementalValue,
              taxRate,
              secondBill.annualTaxAmount,
              secondBill.proratedTaxAmount,
              secondBill.prorationFactor,
              secondBill.fiscalYearStart,
              secondBill.fiscalYearEnd,
              null,
              bill.status || 'pending',
              0,
              bill.notes ? `${bill.notes} (2nd supplemental)` : '2nd supplemental bill',
              now,
              now
            );
            results.billsCreated++;
          }
        } catch (rowErr) {
          results.errors.push(`Bill row ${i + 1}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
        }
      }
    });

    importTransaction();

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
