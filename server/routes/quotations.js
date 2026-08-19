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
              jc.id as jobCardId, jc.job_card_number as jobCardNumber,
              DATE_FORMAT(q.quotation_date, '%Y-%m-%d') as date,
              DATE_FORMAT(q.valid_until, '%Y-%m-%d') as validUntil,
              q.status, q.subtotal, q.discount, q.total as grandTotal,
              q.notes, q.terms, q.converted_invoice_id as convertedInvoiceId,
              COALESCE(q.converted_invoice_number, inv.invoice_number) as convertedInvoiceNumber,
              q.created_at as createdAt, q.updated_at as updatedAt
       FROM quotations q
       LEFT JOIN job_cards jc ON jc.quotation_id = q.id
       LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
       ORDER BY q.created_at DESC`
    );

    const [items] = await pool.query(
      `SELECT id, quotation_id as quotationId, description as serviceName, description,
              quantity, unit_price as unitPrice, total
       FROM quotation_items ORDER BY sort_order ASC, created_at ASC`
    );

    const itemMap = {};
    for (const item of items) {
      if (!itemMap[item.quotationId]) itemMap[item.quotationId] = [];
      itemMap[item.quotationId].push({
        id: item.id,
        serviceName: item.serviceName || item.description || 'Service',
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0
      });
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
              jc.id as jobCardId, jc.job_card_number as jobCardNumber,
              DATE_FORMAT(q.quotation_date, '%Y-%m-%d') as date,
              DATE_FORMAT(q.valid_until, '%Y-%m-%d') as validUntil,
              q.status, q.subtotal, q.discount, q.total as grandTotal,
              q.notes, q.terms, q.converted_invoice_id as convertedInvoiceId,
              COALESCE(q.converted_invoice_number, inv.invoice_number) as convertedInvoiceNumber,
              q.created_at as createdAt, q.updated_at as updatedAt
       FROM quotations q
       LEFT JOIN job_cards jc ON jc.quotation_id = q.id
       LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
       WHERE q.id = ? OR q.quotation_number = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const q = rows[0];
    const [items] = await pool.query(
      `SELECT id, quotation_id as quotationId, description as serviceName, description,
              quantity, unit_price as unitPrice, total
       FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, created_at ASC`,
      [q.id]
    );

    res.json({
      ...q,
      status: statusMapToFrontend[q.status] || 'Draft',
      subtotal: Number(q.subtotal) || 0,
      discount: Number(q.discount) || 0,
      grandTotal: Number(q.grandTotal) || 0,
      items: items.map(it => ({
        id: it.id,
        serviceName: it.serviceName || it.description || 'Service',
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || 0
      })),
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

      // Safe quotation number generation
      let qNumber = data.quotationNumber;
      if (!qNumber) {
        const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "quotation_prefix"');
        const prefix = setRows[0]?.setting_value || 'QT-';
        const [countRows] = await conn.query('SELECT COUNT(*) as count FROM quotations');
        const nextSeq = (countRows[0]?.count || 0) + 1;
        qNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
      }

      // Ensure no unique key collision
      const [existingQ] = await conn.query('SELECT id FROM quotations WHERE quotation_number = ?', [qNumber]);
      if (existingQ.length > 0) {
        const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "quotation_prefix"');
        const prefix = setRows[0]?.setting_value || 'QT-';
        const [countRows] = await conn.query('SELECT COUNT(*) as count FROM quotations');
        const nextSeq = (countRows[0]?.count || 0) + 1;
        qNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
        const [stillExists] = await conn.query('SELECT id FROM quotations WHERE quotation_number = ?', [qNumber]);
        if (stillExists.length > 0) {
          qNumber = `${prefix}${Date.now().toString().slice(-4)}`;
        }
      }

      // Calculate totals
      let calculatedSubtotal = 0;
      if (Array.isArray(data.items)) {
        calculatedSubtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0)), 0);
      }
      const discount = Number(data.discount) || 0;
      const grandTotal = Math.max(0, calculatedSubtotal - discount);

      await conn.query(
        `INSERT INTO quotations (
          id, quotation_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, quotation_date, valid_until,
          status, subtotal, discount, total, notes, terms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          qId,
          qNumber,
          customerId || null,
          vehicleId || null,
          data.customerName || 'Customer',
          data.customerPhone || 'N/A',
          data.vehicleRegistration || 'N/A',
          data.vehicleModel || 'Vehicle',
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

      // If linked to job card, update job card quotation_id
      if (data.jobCardId) {
        await conn.query('UPDATE job_cards SET quotation_id = ? WHERE id = ?', [qId, data.jobCardId]);
      }

      const createdItems = [];
      if (Array.isArray(data.items)) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = `qti-${Date.now()}-${i}`;
          const qty = Number(item.quantity) || 1;
          const uPrice = Number(item.unitPrice || item.price) || 0;
          const tot = qty * uPrice;
          const serviceName = item.serviceName || item.description || 'Service';

          await conn.query(
            `INSERT INTO quotation_items (id, quotation_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
             VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
            [itemId, qId, serviceName, qty, uPrice, tot, i]
          );

          createdItems.push({
            id: itemId,
            quotationId: qId,
            serviceName,
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
        quotationNumber: qNumber,
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
      if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes); }
      if (data.terms !== undefined) { updates.push('terms = ?'); params.push(data.terms); }

      if (Array.isArray(data.items)) {
        const calculatedSubtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0)), 0);
        const discount = Number(data.discount !== undefined ? data.discount : 0);
        const grandTotal = Math.max(0, calculatedSubtotal - discount);

        updates.push('subtotal = ?'); params.push(calculatedSubtotal);
        updates.push('discount = ?'); params.push(discount);
        updates.push('total = ?'); params.push(grandTotal);

        await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = `qti-${Date.now()}-${i}`;
          const qty = Number(item.quantity) || 1;
          const uPrice = Number(item.unitPrice || item.price) || 0;
          const tot = qty * uPrice;
          const sName = item.serviceName || item.description || 'Service';

          await conn.query(
            `INSERT INTO quotation_items (id, quotation_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
             VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
            [itemId, id, sName, qty, uPrice, tot, i]
          );
        }
      }

      if (updates.length > 0) {
        params.push(id);
        await conn.query(`UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`, params);
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
      const [quotRows] = await conn.query('SELECT * FROM quotations WHERE id = ?', [id]);
      if (quotRows.length === 0) {
        throw new Error('Quotation not found');
      }
      const quotation = quotRows[0];

      if (quotation.status === 'converted' && quotation.converted_invoice_id) {
        const [existingInv] = await conn.query('SELECT * FROM invoices WHERE id = ?', [quotation.converted_invoice_id]);
        if (existingInv.length > 0) {
          return existingInv[0];
        }
      }

      // Check linked job card
      const [jcRows] = await conn.query('SELECT id FROM job_cards WHERE quotation_id = ? LIMIT 1', [id]);
      const linkedJobCardId = jcRows.length > 0 ? jcRows[0].id : null;

      // Generate invoice number
      const [countRows] = await conn.query('SELECT COUNT(*) as count FROM invoices');
      const currentYear = new Date().getFullYear();
      const nextNum = String((countRows[0].count || 0) + 1).padStart(3, '0');
      const invoiceNumber = `INV-${currentYear}-${nextNum}`;
      const invoiceId = `inv-${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0];

      // Insert invoice
      await conn.query(
        `INSERT INTO invoices (
          id, invoice_number, quotation_id, job_card_id, customer_id, vehicle_id,
          customer_name, customer_phone, vehicle_registration, vehicle_model,
          date, time, subtotal, discount, grand_total, paid, due, status,
          payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'due', 'cash', ?, NOW())`,
        [
          invoiceId,
          invoiceNumber,
          quotation.id,
          linkedJobCardId,
          quotation.customer_id,
          quotation.vehicle_id,
          quotation.customer_name,
          quotation.customer_phone,
          quotation.vehicle_registration,
          quotation.vehicle_model,
          today,
          timeStr,
          quotation.subtotal,
          quotation.discount,
          quotation.total,
          quotation.total, // due
          `Created from quotation ${quotation.quotation_number}${quotation.notes ? ' | ' + quotation.notes : ''}`
        ]
      );

      // Copy line items
      const [qItems] = await conn.query('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, created_at ASC', [id]);
      const createdItems = [];
      for (let i = 0; i < qItems.length; i++) {
        const it = qItems[i];
        const itemId = `invi-${Date.now()}-${i}`;
        await conn.query(
          `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
           VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
          [itemId, invoiceId, it.description, it.quantity, it.unit_price, it.total, i]
        );
        createdItems.push({
          id: itemId,
          serviceName: it.description,
          price: Number(it.unit_price),
          quantity: Number(it.quantity)
        });
      }

      // Mark quotation as converted
      await conn.query(
        `UPDATE quotations SET status = 'converted', converted_invoice_id = ?, converted_invoice_number = ? WHERE id = ?`,
        [invoiceId, invoiceNumber, id]
      );

      // If linked to a job card, link the invoice to the job card too
      if (linkedJobCardId) {
        await conn.query('UPDATE job_cards SET invoice_id = ? WHERE id = ?', [invoiceId, linkedJobCardId]);
      }

      // Return newly created invoice
      return {
        id: invoiceId,
        invoiceNumber,
        date: today,
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
        jobCardId: linkedJobCardId,
        items: createdItems,
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
