import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { calculateSupplementalTax, getFiscalYear } from '../services/taxCalculator';

const router = Router();

/**
 * GET /api/bills/summary/stats
 * Dashboard statistics for bills.
 * NOTE: This route must be defined BEFORE /:id to avoid matching "summary" as an ID.
 */
router.get('/summary/stats', (_req: Request, res: Response) => {
  try {
    const totalBills = db.prepare('SELECT COUNT(*) AS count FROM bills').get() as { count: number };

    const totalAmount = db.prepare(
      'SELECT COALESCE(SUM(prorated_tax_amount), 0) AS total FROM bills'
    ).get() as { total: number };

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(prorated_tax_amount), 0) AS total_amount
      FROM bills
      GROUP BY status
    `).all();

    const totalPaid = db.prepare(
      'SELECT COALESCE(SUM(paid_amount), 0) AS total FROM bills WHERE status = ?'
    ).get('paid') as { total: number };

    const totalPending = db.prepare(
      'SELECT COALESCE(SUM(prorated_tax_amount), 0) AS total FROM bills WHERE status = ?'
    ).get('pending') as { total: number };

    const totalOverdue = db.prepare(
      'SELECT COALESCE(SUM(prorated_tax_amount), 0) AS total FROM bills WHERE status = ?'
    ).get('overdue') as { total: number };

    const totalPenalties = db.prepare(
      'SELECT COALESCE(SUM(penalty_amount), 0) AS total FROM bills'
    ).get() as { total: number };

    const recentBills = db.prepare(`
      SELECT b.*, p.address AS property_address
      FROM bills b
      JOIN properties p ON p.id = b.property_id
      ORDER BY b.created_at DESC
      LIMIT 10
    `).all();

    const byEventType = db.prepare(`
      SELECT event_type, COUNT(*) AS count, COALESCE(SUM(prorated_tax_amount), 0) AS total_amount
      FROM bills
      GROUP BY event_type
    `).all();

    res.json({
      success: true,
      data: {
        totalBills: totalBills.count,
        totalAmount: totalAmount.total,
        totalPaid: totalPaid.total,
        totalPending: totalPending.total,
        totalOverdue: totalOverdue.total,
        totalPenalties: totalPenalties.total,
        byStatus,
        byEventType,
        recentBills,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/bills
 * List all bills with optional filters.
 * Query params: status, client_id, property_id, date_from, date_to
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, client_id, property_id, date_from, date_to } = req.query;

    let query = `
      SELECT b.*, p.address AS property_address, p.apn, p.city, p.county,
             c.name AS client_name, c.id AS client_id
      FROM bills b
      JOIN properties p ON p.id = b.property_id
      JOIN clients c ON c.id = p.client_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status && typeof status === 'string') {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (client_id && typeof client_id === 'string') {
      query += ' AND c.id = ?';
      params.push(client_id);
    }

    if (property_id && typeof property_id === 'string') {
      query += ' AND b.property_id = ?';
      params.push(property_id);
    }

    if (date_from && typeof date_from === 'string') {
      query += ' AND b.event_date >= ?';
      params.push(date_from);
    }

    if (date_to && typeof date_to === 'string') {
      query += ' AND b.event_date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY b.created_at DESC';

    const bills = db.prepare(query).all(...params);
    res.json({ success: true, data: bills });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/bills/:id
 * Get a single bill with property and client info.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const bill = db.prepare(`
      SELECT b.*, p.address AS property_address, p.apn, p.city, p.county, p.zip,
             c.name AS client_name, c.id AS client_id, c.email AS client_email
      FROM bills b
      JOIN properties p ON p.id = b.property_id
      JOIN clients c ON c.id = p.client_id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!bill) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    // Get any uploaded documents associated with this bill
    const documents = db.prepare(
      'SELECT * FROM uploaded_documents WHERE bill_id = ?'
    ).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...(bill as Record<string, unknown>),
        documents,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/bills
 * Create a new bill with automatic tax calculation.
 * Required: property_id, event_type, event_date, old_assessed_value, new_assessed_value, tax_rate
 * Optional: bill_type (defaults to 'first_supplemental'), due_date, status, notes
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      property_id,
      bill_type,
      event_type,
      event_date,
      old_assessed_value,
      new_assessed_value,
      tax_rate,
      due_date,
      status,
      notes,
    } = req.body;

    // Validation
    if (!property_id) {
      res.status(400).json({ success: false, error: 'property_id is required' });
      return;
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(property_id);
    if (!property) {
      res.status(404).json({ success: false, error: 'Property not found' });
      return;
    }

    if (!event_type || !['change_of_ownership', 'new_construction'].includes(event_type)) {
      res.status(400).json({ success: false, error: 'event_type must be change_of_ownership or new_construction' });
      return;
    }

    if (!event_date) {
      res.status(400).json({ success: false, error: 'event_date is required' });
      return;
    }

    if (old_assessed_value === undefined || old_assessed_value === null || typeof old_assessed_value !== 'number') {
      res.status(400).json({ success: false, error: 'old_assessed_value is required and must be a number' });
      return;
    }

    if (new_assessed_value === undefined || new_assessed_value === null || typeof new_assessed_value !== 'number') {
      res.status(400).json({ success: false, error: 'new_assessed_value is required and must be a number' });
      return;
    }

    if (!tax_rate || typeof tax_rate !== 'number' || tax_rate <= 0) {
      res.status(400).json({ success: false, error: 'tax_rate is required and must be a positive number' });
      return;
    }

    // Calculate the supplemental tax
    const calcResult = calculateSupplementalTax({
      eventDate: event_date,
      oldAssessedValue: old_assessed_value,
      newAssessedValue: new_assessed_value,
      taxRate: tax_rate,
    });

    const resolvedBillType = bill_type || 'first_supplemental';
    const billData = resolvedBillType === 'second_supplemental' && calcResult.secondBill
      ? calcResult.secondBill
      : calcResult.firstBill;

    const id = uuidv4();
    const now = new Date().toISOString();

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
      id,
      property_id,
      resolvedBillType,
      event_type,
      event_date,
      old_assessed_value,
      new_assessed_value,
      calcResult.supplementalValue,
      tax_rate,
      billData.annualTaxAmount,
      billData.proratedTaxAmount,
      billData.prorationFactor,
      billData.fiscalYearStart,
      billData.fiscalYearEnd,
      due_date || null,
      status || 'pending',
      0,
      notes || null,
      now,
      now
    );

    const createdBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      data: createdBill,
      calculation: calcResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/bills/:id
 * Update an existing bill (status, payment info, notes, etc.).
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    const {
      status,
      paid_date,
      paid_amount,
      penalty_amount,
      due_date,
      notes,
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE bills
      SET status = ?,
          paid_date = ?,
          paid_amount = ?,
          penalty_amount = ?,
          due_date = ?,
          notes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      status !== undefined ? status : existing.status,
      paid_date !== undefined ? paid_date : existing.paid_date,
      paid_amount !== undefined ? paid_amount : existing.paid_amount,
      penalty_amount !== undefined ? penalty_amount : existing.penalty_amount,
      due_date !== undefined ? due_date : existing.due_date,
      notes !== undefined ? notes : existing.notes,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/bills/:id
 * Delete a bill.
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    db.prepare('DELETE FROM bills WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
