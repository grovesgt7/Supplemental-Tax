import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';

const router = Router();

/**
 * GET /api/clients
 * List all clients with their property count.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const clients = db.prepare(`
      SELECT
        c.*,
        COUNT(p.id) AS property_count
      FROM clients c
      LEFT JOIN properties p ON p.client_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    res.json({ success: true, data: clients });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/clients/:id
 * Get a single client with their properties and associated bills.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    const properties = db.prepare(`
      SELECT * FROM properties WHERE client_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    // Get bills for all client properties
    const propertyIds = (properties as Array<{ id: string }>).map((p) => p.id);
    let bills: unknown[] = [];

    if (propertyIds.length > 0) {
      const placeholders = propertyIds.map(() => '?').join(',');
      bills = db.prepare(`
        SELECT b.*, p.address AS property_address
        FROM bills b
        JOIN properties p ON p.id = b.property_id
        WHERE b.property_id IN (${placeholders})
        ORDER BY b.created_at DESC
      `).all(...propertyIds);
    }

    res.json({
      success: true,
      data: {
        ...(client as Record<string, unknown>),
        properties,
        bills,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/clients
 * Create a new client.
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, email, phone, company } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Client name is required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO clients (id, name, email, phone, company, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), email || null, phone || null, company || null, now, now);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/clients/:id
 * Update an existing client.
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    const { name, email, phone, company } = req.body;
    const now = new Date().toISOString();

    const existingClient = existing as Record<string, unknown>;

    db.prepare(`
      UPDATE clients
      SET name = ?, email = ?, phone = ?, company = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : existingClient.name,
      email !== undefined ? email : existingClient.email,
      phone !== undefined ? phone : existingClient.phone,
      company !== undefined ? company : existingClient.company,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete a client and cascade to their properties and bills.
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    // Foreign key cascades will handle properties and bills
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
