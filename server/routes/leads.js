import express from 'express';
import pool, { withTransaction } from '../db.js';

const router = express.Router();

const LEAD_SELECT = `
  SELECT l.id, l.lead_number as leadNumber, l.customer_name as customerName, l.phone,
         l.source, l.inquiry, l.status,
         DATE_FORMAT(l.lead_date, '%Y-%m-%d') as leadDate,
         DATE_FORMAT(l.last_contact_date, '%Y-%m-%d') as lastContactDate,
         DATE_FORMAT(l.next_follow_up_date, '%Y-%m-%d') as nextFollowUpDate,
         DATE_FORMAT(l.visit_date, '%Y-%m-%d') as visitDate,
         l.visit_time as visitTime, l.vehicle_model as vehicleModel,
         l.customer_id as customerId, l.vehicle_id as vehicleId,
         l.job_card_id as jobCardId, l.job_card_number as jobCardNumber,
         l.quotation_id as quotationId, l.quotation_number as quotationNumber,
         l.invoice_id as invoiceId, l.invoice_number as invoiceNumber,
         l.notes, l.created_at as createdAt, l.updated_at as updatedAt
  FROM leads l
`;

function formatLead(row, followUps) {
  return {
    ...row,
    inquiry: row.inquiry || '',
    lastContactDate: row.lastContactDate || undefined,
    nextFollowUpDate: row.nextFollowUpDate || undefined,
    visitDate: row.visitDate || undefined,
    visitTime: row.visitTime || undefined,
    vehicleModel: row.vehicleModel || undefined,
    customerId: row.customerId || undefined,
    vehicleId: row.vehicleId || undefined,
    jobCardId: row.jobCardId || undefined,
    jobCardNumber: row.jobCardNumber || undefined,
    quotationId: row.quotationId || undefined,
    quotationNumber: row.quotationNumber || undefined,
    invoiceId: row.invoiceId || undefined,
    invoiceNumber: row.invoiceNumber || undefined,
    notes: row.notes || undefined,
    followUps: followUps || [],
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? (typeof row.updatedAt === 'string' ? row.updatedAt : new Date(row.updatedAt).toISOString()) : undefined,
  };
}

function formatFollowUp(fu) {
  return {
    id: fu.id,
    leadId: fu.leadId,
    staffId: fu.staffId,
    contactDate: fu.contactDate,
    status: fu.status,
    note: fu.note || '',
    nextFollowUpDate: fu.nextFollowUpDate || undefined,
    createdAt: typeof fu.createdAt === 'string' ? fu.createdAt : new Date(fu.createdAt).toISOString(),
  };
}

async function nextLeadNumber(conn) {
  const [rows] = await conn.query('SELECT lead_number FROM leads');
  let maxSeq = 0;
  for (const r of rows) {
    const match = r.lead_number.match(/(\d+)$/);
    const seq = match ? parseInt(match[1], 10) : 0;
    if (seq > maxSeq) maxSeq = seq;
  }
  return `LD-${String(maxSeq + 1).padStart(4, '0')}`;
}

const TERMINAL_STATUSES = ['Service Taken', 'Not Interested', 'Lost'];

// GET all leads (with follow-ups)
router.get('/', async (req, res) => {
  try {
    const [leads] = await pool.query(`${LEAD_SELECT} ORDER BY l.created_at DESC`);
    const [followUps] = await pool.query(
      `SELECT id, lead_id as leadId, staff_id as staffId,
              DATE_FORMAT(contact_date, '%Y-%m-%d') as contactDate,
              status, note, DATE_FORMAT(next_follow_up_date, '%Y-%m-%d') as nextFollowUpDate,
              created_at as createdAt
       FROM lead_follow_ups ORDER BY created_at ASC`
    );

    const fuMap = {};
    for (const fu of followUps) {
      if (!fuMap[fu.leadId]) fuMap[fu.leadId] = [];
      fuMap[fu.leadId].push(formatFollowUp(fu));
    }

    res.json(leads.map(l => formatLead(l, fuMap[l.id])));
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET lead by id or lead number (with follow-ups)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`${LEAD_SELECT} WHERE l.id = ? OR l.lead_number = ?`, [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const [followUps] = await pool.query(
      `SELECT id, lead_id as leadId, staff_id as staffId,
              DATE_FORMAT(contact_date, '%Y-%m-%d') as contactDate,
              status, note, DATE_FORMAT(next_follow_up_date, '%Y-%m-%d') as nextFollowUpDate,
              created_at as createdAt
       FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at ASC`,
      [rows[0].id]
    );

    res.json(formatLead(rows[0], followUps.map(formatFollowUp)));
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE lead
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.customerName || !data.phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }

    const result = await withTransaction(async (conn) => {
      const id = `lead-${Date.now()}`;
      const leadNumber = await nextLeadNumber(conn);
      const leadDate = data.leadDate || new Date().toISOString().split('T')[0];

      await conn.query(
        `INSERT INTO leads (id, lead_number, customer_name, phone, source, inquiry, status, lead_date,
                             next_follow_up_date, vehicle_model, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?, ?, ?, NOW())`,
        [
          id, leadNumber, data.customerName.trim(), data.phone.trim(),
          data.source || 'Facebook', data.inquiry ? data.inquiry.trim() : null,
          leadDate, data.nextFollowUpDate || null, data.vehicleModel || null, data.notes || null,
        ]
      );

      return { id, leadNumber };
    });

    const [rows] = await pool.query(`${LEAD_SELECT} WHERE l.id = ?`, [result.id]);
    res.status(201).json(formatLead(rows[0], []));
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE lead (partial)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const fieldMap = {
      customerName: 'customer_name',
      phone: 'phone',
      source: 'source',
      inquiry: 'inquiry',
      status: 'status',
      leadDate: 'lead_date',
      lastContactDate: 'last_contact_date',
      nextFollowUpDate: 'next_follow_up_date',
      visitDate: 'visit_date',
      visitTime: 'visit_time',
      vehicleModel: 'vehicle_model',
      customerId: 'customer_id',
      vehicleId: 'vehicle_id',
      jobCardId: 'job_card_id',
      jobCardNumber: 'job_card_number',
      quotationId: 'quotation_id',
      quotationNumber: 'quotation_number',
      invoiceId: 'invoice_id',
      invoiceNumber: 'invoice_number',
      notes: 'notes',
    };

    const updates = [];
    const params = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${col} = ?`);
        params.push(data[key] === '' ? null : data[key]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [rows] = await pool.query(`${LEAD_SELECT} WHERE l.id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    const [followUps] = await pool.query(
      `SELECT id, lead_id as leadId, staff_id as staffId,
              DATE_FORMAT(contact_date, '%Y-%m-%d') as contactDate,
              status, note, DATE_FORMAT(next_follow_up_date, '%Y-%m-%d') as nextFollowUpDate,
              created_at as createdAt
       FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at ASC`,
      [id]
    );

    res.json(formatLead(rows[0], followUps.map(formatFollowUp)));
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD follow-up (records the call + updates the lead's current state)
router.post('/:id/follow-ups', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!data.staffId || !data.status) {
      return res.status(400).json({ error: 'staffId and status are required' });
    }

    const contactDate = data.contactDate || new Date().toISOString().split('T')[0];
    const isTerminal = TERMINAL_STATUSES.includes(data.status);
    const nextFollowUpDate = isTerminal ? null : (data.nextFollowUpDate || null);

    await withTransaction(async (conn) => {
      const fuId = `fu-${id}-${Date.now()}`;
      await conn.query(
        `INSERT INTO lead_follow_ups (id, lead_id, staff_id, contact_date, status, note, next_follow_up_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [fuId, id, data.staffId, contactDate, data.status, data.note ? data.note.trim() : null, nextFollowUpDate]
      );

      const updates = ['status = ?', 'last_contact_date = ?', 'next_follow_up_date = ?'];
      const params = [data.status, contactDate, nextFollowUpDate];
      if (data.visitDate) { updates.push('visit_date = ?'); params.push(data.visitDate); }
      if (data.visitTime) { updates.push('visit_time = ?'); params.push(data.visitTime); }
      params.push(id);
      await conn.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
    });

    const [rows] = await pool.query(`${LEAD_SELECT} WHERE l.id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    const [followUps] = await pool.query(
      `SELECT id, lead_id as leadId, staff_id as staffId,
              DATE_FORMAT(contact_date, '%Y-%m-%d') as contactDate,
              status, note, DATE_FORMAT(next_follow_up_date, '%Y-%m-%d') as nextFollowUpDate,
              created_at as createdAt
       FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at ASC`,
      [id]
    );

    res.json(formatLead(rows[0], followUps.map(formatFollowUp)));
  } catch (error) {
    console.error('Error adding follow-up:', error);
    res.status(500).json({ error: error.message });
  }
});

// CONVERT lead to customer
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await withTransaction(async (conn) => {
      const [leadRows] = await conn.query('SELECT * FROM leads WHERE id = ?', [id]);
      if (leadRows.length === 0) return null;
      const lead = leadRows[0];

      if (lead.customer_id) {
        const [existing] = await conn.query('SELECT * FROM customers WHERE id = ?', [lead.customer_id]);
        if (existing.length > 0) return existing[0];
      }

      const customerId = `cust-${Date.now()}`;
      await conn.query(
        `INSERT INTO customers (id, name, phone, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
        [customerId, lead.customer_name, lead.phone]
      );
      await conn.query('UPDATE leads SET customer_id = ? WHERE id = ?', [customerId, id]);

      const [created] = await conn.query('SELECT * FROM customers WHERE id = ?', [customerId]);
      return created[0];
    });

    if (!result) return res.status(404).json({ error: 'Lead not found' });

    res.json({
      id: result.id,
      name: result.name,
      phone: result.phone,
      email: result.email || undefined,
      address: result.address || undefined,
      notes: result.notes || undefined,
      vehicles: [],
      totalVisits: 0,
      lastServiceDate: new Date().toISOString().split('T')[0],
      createdAt: typeof result.created_at === 'string' ? result.created_at : new Date(result.created_at).toISOString(),
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
