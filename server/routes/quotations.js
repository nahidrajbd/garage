import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const statusMapToFrontend = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  converted: 'Converted'
};

const statusMapToDb = {
  'Draft': 'draft',
  'Sent': 'sent',
  'Accepted': 'accepted',
  'Rejected': 'rejected',
  'Expired': 'expired',
  'Converted': 'converted'
};

// GET all Quotations
router.get('/', async (req, res) => {
  try {
    const [quotations] = await pool.query(
      `SELECT q.id, q.quotation_number as quotationNumber, q.customer_id as customerId, q.vehicle_id as vehicleId,
              q.customer_name as customerName, q.customer_phone as customerPhone,
              q.vehicle_registration as vehicleRegistration, q.vehicle_model as vehicleModel,
              q.job_card_id as jobCardId, jc.job_card_number as jobCardNumber,
              DATE_FORMAT(q.quotation_date, '%Y-%m-%d') as date,
              DATE_FORMAT(q.valid_until, '%Y-%m-%d') as validUntil,
              q.status, q.subtotal, q.discount, q.total as grandTotal,
              q.notes, q.terms, q.converted_invoice_id as convertedInvoiceId,
              inv.invoice_number as convertedInvoiceNumber,
              q.created_at as createdAt, q.updated_at as updatedAt
       FROM quotations q
       LEFT JOIN job_cards jc ON q.job_card_id = jc.id
       LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
       ORDER BY q.created_at DESC`
    );

    const [items] = await pool.query(
      `SELECT id, quotation_id as quotationId, service_name as serviceName, description,
              quantity, unit_price as unitPrice, total
       FROM quotation_items`
    );

    const itemMap = {};
    for (const item of items) {
      if (!itemMap[item.quotationId]) itemMap[item.quotationId] = [];
      itemMap[item.quotationId].push(item);
    }

    const formatted = quotations.map(q => ({
      ...q,
      status: statusMapToFrontend[q.status] || 'Draft',
      subtotal: Number(q.subtotal) || 0,
      discount: Number(q.discount) || 0,
      grandTotal: Number(q.grandTotal) || 0,
      items: itemMap[q.id] || [],
      createdAt: typeof q.createdAt === 'string' ? q.createdAt : new Date(q.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Quotation by ID or Number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT q.id, q.quotation_number as quotationNumber, q.customer_id as customerId, q.vehicle_id as vehicleId,
              q.customer_name as customerName, q.customer_phone as customerPhone,
              q.vehicle_registration as vehicleRegistration, q.vehicle_model as vehicleModel,
              q.job_card_id as jobCardId, jc.job_card_number as jobCardNumber,
              DATE_FORMAT(q.quotation_date, '%Y-%m-%d') as date,
              DATE_FORMAT(q.valid_until, '%Y-%m-%d') as validUntil,
              q.status, q.subtotal, q.discount, q.total as grandTotal,
              q.notes, q.terms, q.converted_invoice_id as convertedInvoiceId,
              inv.invoice_number as convertedInvoiceNumber,
              q.created_at as createdAt, q.updated_at as updatedAt
       FROM quotations q
       LEFT JOIN job_cards jc ON q.job_card_id = jc.id
       LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
       WHERE q.id = ? OR q.quotation_number = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const q = rows[0];
    const [items] = await pool.query(
      `SELECT id, quotation_id as quotationId, service_name as serviceName, description,
              quantity, unit_price as unitPrice, total
       FROM quotation_items WHERE quotation_id = ?`,
      [q.id]
    );

    res.json({
      ...q,
      status: statusMapToFrontend[q.status] || 'Draft',
      subtotal: Number(q.subtotal) || 0,
      discount: Number(q.discount) || 0,
      grandTotal: Number(q.grandTotal) || 0,
      items: items || [],
      createdAt: typeof q.createdAt === 'string' ? q.createdAt : new Date(q.createdAt).toISOString()
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Quotation
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const qId = `qt-${Date.now()}`;
    const dbStatus = statusMapToDb[data.status] || 'draft';

    const result = await withTransaction(async (conn) => {
      let customerId = data.customerId;
      let vehicleId = data.vehicleId;

      // Auto link customer/vehicle if missing
      if (!customerId && data.customerPhone) {
        const [custs] = await conn.query('SELECT id FROM customers WHERE phone = ?', [data.customerPhone]);
        if (custs.length > 0) {
          customerId = custs[0].id;
        } else if (data.customerName) {
          customerId = `cust-${Date.now()}`;
          await conn.query(
            `INSERT INTO customers (id, name, phone, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
            [customerId, data.customerName, data.customerPhone]
          );
        }
      }

      if (customerId && data.vehicleRegistration) {
        const [vehs] = await conn.query('SELECT id FROM vehicles WHERE customer_id = ? AND registration_number = ?', [customerId, data.vehicleRegistration]);
        if (vehs.length > 0) {
          vehicleId = vehs[0].id;
        } else {
          vehicleId = `veh-${Date.now()}`;
          await conn.query(
            `INSERT INTO vehicles (id, customer_id, registration_number, model, created_at) VALUES (?, ?, ?, ?, NOW())`,
            [vehicleId, customerId, data.vehicleRegistration, data.vehicleModel || 'Vehicle']
          );
        }
      }

      // Calculate totals
      let calculatedSubtotal = 0;
      if (Array.isArray(data.items)) {
        calculatedSubtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || 0)), 0);
      }
      const discount = Number(data.discount) || 0;
      const grandTotal = Math.max(0, calculatedSubtotal - discount);

      await conn.query(
        `INSERT INTO quotations (
          id, quotation_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, job_card_id, quotation_date, valid_until,
          status, subtotal, discount, total, notes, terms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          qId,
          data.quotationNumber,
          customerId || null,
          vehicleId || null,
          data.customerName || null,
          data.customerPhone || null,
          data.vehicleRegistration || null,
          data.vehicleModel || null,
          data.jobCardId || null,
          data.date || new Date().toISOString().split('T')[0],
          data.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          dbStatus,
          calculatedSubtotal,
          discount,
          grandTotal,
          data.notes || null,
          data.terms || null
        ]
      );

      const createdItems = [];
      if (Array.isArray(data.items)) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = `qti-${Date.now()}-${i}`;
          const qty = Number(item.quantity) || 1;
          const uPrice = Number(item.unitPrice) || 0;
          const tot = qty * uPrice;
          await conn.query(
            `INSERT INTO quotation_items (id, quotation_id, service_name, description, quantity, unit_price, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [itemId, qId, item.serviceName, item.description || null, qty, uPrice, tot]
          );
          createdItems.push({
            id: itemId,
            quotationId: qId,
            serviceName: item.serviceName,
            description: item.description,
            quantity: qty,
            unitPrice: uPrice,
            total: tot
          });
        }
      }

      return {
        ...data,
        id: qId,
        customerId,
        vehicleId,
        subtotal: calculatedSubtotal,
        discount,
        grandTotal,
        items: createdItems,
        status: data.status || 'Draft',
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Quotation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    await withTransaction(async (conn) => {
      const updates = [];
      const params = [];

      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(statusMapToDb[data.status] || data.status.toLowerCase());
      }
      if (data.customerName !== undefined) { updates.push('customer_name = ?'); params.push(data.customerName); }
      if (data.customerPhone !== undefined) { updates.push('customer_phone = ?'); params.push(data.customerPhone); }
      if (data.vehicleRegistration !== undefined) { updates.push('vehicle_registration = ?'); params.push(data.vehicleRegistration); }
      if (data.vehicleModel !== undefined) { updates.push('vehicle_model = ?'); params.push(data.vehicleModel); }
      if (data.date !== undefined) { updates.push('quotation_date = ?'); params.push(data.date); }
      if (data.validUntil !== undefined) { updates.push('valid_until = ?'); params.push(data.validUntil); }
      if (data.subtotal !== undefined) { updates.push('subtotal = ?'); params.push(data.subtotal); }
      if (data.discount !== undefined) { updates.push('discount = ?'); params.push(data.discount); }
      if (data.grandTotal !== undefined) { updates.push('total = ?'); params.push(data.grandTotal); }
      if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes); }
      if (data.terms !== undefined) { updates.push('terms = ?'); params.push(data.terms); }

      if (updates.length > 0) {
        params.push(id);
        await conn.query(`UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      if (Array.isArray(data.items)) {
        await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = `qti-${Date.now()}-${i}`;
          const qty = Number(item.quantity) || 1;
          const uPrice = Number(item.unitPrice) || 0;
          await conn.query(
            `INSERT INTO quotation_items (id, quotation_id, service_name, description, quantity, unit_price, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [itemId, id, item.serviceName, item.description || null, qty, uPrice, qty * uPrice]
          );
        }
      }
    });

    const [rows] = await pool.query('SELECT * FROM quotations WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const dbStatus = statusMapToDb[status] || status.toLowerCase();

    await pool.query('UPDATE quotations SET status = ? WHERE id = ?', [dbStatus, id]);
    res.json({ id, status });
  } catch (error) {
    console.error('Error updating quotation status:', error);
    res.status(500).json({ error: error.message });
  }
});

// CONVERT Quotation to Invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await withTransaction(async (conn) => {
      const [qRows] = await conn.query('SELECT * FROM quotations WHERE id = ?', [id]);
      if (qRows.length === 0) {
        throw new Error('Quotation not found');
      }
      const quotation = qRows[0];

      // If already converted and invoice exists, return that invoice
      if (quotation.status === 'converted' && quotation.converted_invoice_id) {
        const [existingInv] = await conn.query('SELECT * FROM invoices WHERE id = ?', [quotation.converted_invoice_id]);
        if (existingInv.length > 0) {
          return existingInv[0];
        }
      }

      // Generate invoice number
      const [countRows] = await conn.query('SELECT COUNT(*) as count FROM invoices');
      const currentYear = new Date().getFullYear();
      const nextNum = String((countRows[0].count || 0) + 1).padStart(3, '0');
      const invoiceNumber = `INV-${currentYear}-${nextNum}`;
      const invoiceId = `inv-${Date.now()}`;

      // Insert invoice
      await conn.query(
        `INSERT INTO invoices (
          id, invoice_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, job_card_id, quotation_id, invoice_date,
          subtotal, discount, total, paid_amount, due_amount, status, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, 0.00, ?, 'due', 'Cash', ?, NOW())`,
        [
          invoiceId,
          invoiceNumber,
          quotation.customer_id,
          quotation.vehicle_id,
          quotation.customer_name,
          quotation.customer_phone,
          quotation.vehicle_registration,
          quotation.vehicle_model,
          quotation.job_card_id,
          quotation.id,
          quotation.subtotal,
          quotation.discount,
          quotation.total,
          quotation.total, // due_amount
          `Created from quotation ${quotation.quotation_number}${quotation.notes ? ' | ' + quotation.notes : ''}`
        ]
      );

      // Copy line items
      const [qItems] = await conn.query('SELECT * FROM quotation_items WHERE quotation_id = ?', [id]);
      for (let i = 0; i < qItems.length; i++) {
        const it = qItems[i];
        await conn.query(
          `INSERT INTO invoice_items (id, invoice_id, service_name, description, quantity, unit_price, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [`invi-${Date.now()}-${i}`, invoiceId, it.service_name, it.description, it.quantity, it.unit_price, it.total]
        );
      }

      // Mark quotation as converted
      await conn.query(
        `UPDATE quotations SET status = 'converted', converted_invoice_id = ? WHERE id = ?`,
        [invoiceId, id]
      );

      // If linked to a job card, link the invoice to the job card too
      if (quotation.job_card_id) {
        await conn.query('UPDATE job_cards SET invoice_id = ? WHERE id = ?', [invoiceId, quotation.job_card_id]);
      }

      // Return newly created invoice
      return {
        id: invoiceId,
        invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        customerId: quotation.customer_id,
        customerName: quotation.customer_name,
        customerPhone: quotation.customer_phone,
        vehicleRegistration: quotation.vehicle_registration,
        vehicleModel: quotation.vehicle_model,
        subtotal: Number(quotation.subtotal),
        discount: Number(quotation.discount),
        grandTotal: Number(quotation.total),
        paid: 0,
        due: Number(quotation.total),
        status: 'Due',
        paymentMethod: 'Cash',
        notes: `Created from quotation ${quotation.quotation_number}`,
        quotationId: quotation.id,
        quotationNumber: quotation.quotation_number,
        convertedFromQuotation: true,
        jobCardId: quotation.job_card_id,
        createdAt: new Date().toISOString()
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error converting quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Quotation
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete quotations.' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM quotations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
