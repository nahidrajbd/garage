import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const statusMapToFrontend = {
  due: 'Due',
  partial: 'Partial',
  paid: 'Paid',
  cancelled: 'Due'
};

const statusMapToDb = {
  'Due': 'due',
  'Partial': 'partial',
  'Paid': 'paid'
};

// GET all Invoices
router.get('/', async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.id, i.invoice_number as invoiceNumber, i.customer_id as customerId, i.vehicle_id as vehicleId,
              i.customer_name as customerName, i.customer_phone as customerPhone,
              i.vehicle_registration as vehicleRegistration, i.vehicle_model as vehicleModel,
              i.job_card_id as jobCardId, jc.job_card_number as jobCardNumber,
              i.quotation_id as quotationId, q.quotation_number as quotationNumber,
              DATE_FORMAT(i.invoice_date, '%Y-%m-%d') as date,
              i.subtotal, i.discount, i.total as grandTotal,
              i.paid_amount as paid, i.due_amount as due,
              i.status, i.payment_method as paymentMethod, i.notes,
              i.created_at as createdAt, i.updated_at as updatedAt
       FROM invoices i
       LEFT JOIN job_cards jc ON i.job_card_id = jc.id
       LEFT JOIN quotations q ON i.quotation_id = q.id
       ORDER BY i.created_at DESC`
    );

    const [items] = await pool.query(
      `SELECT id, invoice_id as invoiceId, service_id as serviceId, service_name as serviceName,
              description, quantity, unit_price as price, total
       FROM invoice_items`
    );

    const itemMap = {};
    for (const item of items) {
      if (!itemMap[item.invoiceId]) itemMap[item.invoiceId] = [];
      itemMap[item.invoiceId].push({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1
      });
    }

    const formatted = invoices.map(inv => ({
      ...inv,
      status: statusMapToFrontend[inv.status] || 'Due',
      subtotal: Number(inv.subtotal) || 0,
      discount: Number(inv.discount) || 0,
      grandTotal: Number(inv.grandTotal) || 0,
      paid: Number(inv.paid) || 0,
      due: Number(inv.due) || 0,
      items: itemMap[inv.id] || [],
      convertedFromQuotation: Boolean(inv.quotationId),
      createdAt: typeof inv.createdAt === 'string' ? inv.createdAt : new Date(inv.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Invoice by ID or Number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT i.id, i.invoice_number as invoiceNumber, i.customer_id as customerId, i.vehicle_id as vehicleId,
              i.customer_name as customerName, i.customer_phone as customerPhone,
              i.vehicle_registration as vehicleRegistration, i.vehicle_model as vehicleModel,
              i.job_card_id as jobCardId, jc.job_card_number as jobCardNumber,
              i.quotation_id as quotationId, q.quotation_number as quotationNumber,
              DATE_FORMAT(i.invoice_date, '%Y-%m-%d') as date,
              i.subtotal, i.discount, i.total as grandTotal,
              i.paid_amount as paid, i.due_amount as due,
              i.status, i.payment_method as paymentMethod, i.notes,
              i.created_at as createdAt, i.updated_at as updatedAt
       FROM invoices i
       LEFT JOIN job_cards jc ON i.job_card_id = jc.id
       LEFT JOIN quotations q ON i.quotation_id = q.id
       WHERE i.id = ? OR i.invoice_number = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const inv = rows[0];
    const [items] = await pool.query(
      `SELECT id, invoice_id as invoiceId, service_id as serviceId, service_name as serviceName,
              description, quantity, unit_price as price, total
       FROM invoice_items WHERE invoice_id = ?`,
      [inv.id]
    );

    res.json({
      ...inv,
      status: statusMapToFrontend[inv.status] || 'Due',
      subtotal: Number(inv.subtotal) || 0,
      discount: Number(inv.discount) || 0,
      grandTotal: Number(inv.grandTotal) || 0,
      paid: Number(inv.paid) || 0,
      due: Number(inv.due) || 0,
      items: items.map(it => ({
        id: it.id,
        serviceId: it.serviceId,
        serviceName: it.serviceName,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1
      })),
      convertedFromQuotation: Boolean(inv.quotationId),
      createdAt: typeof inv.createdAt === 'string' ? inv.createdAt : new Date(inv.createdAt).toISOString()
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Invoice
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const invId = `inv-${Date.now()}`;
    const invoiceNumber = data.invoiceNumber;

    const result = await withTransaction(async (conn) => {
      let customerId = data.customerId;
      let vehicleId = data.vehicleId;

      // Auto link or create customer
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

      // Auto link or create vehicle
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
        calculatedSubtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.price || 0)), 0);
      }
      const discount = Number(data.discount) || 0;
      const grandTotal = Math.max(0, calculatedSubtotal - discount);
      const paid = Math.min(grandTotal, Math.max(0, Number(data.paid) || 0));
      const due = Math.max(0, grandTotal - paid);

      let status = 'due';
      if (due === 0 && grandTotal > 0) {
        status = 'paid';
      } else if (paid > 0) {
        status = 'partial';
      }

      await conn.query(
        `INSERT INTO invoices (
          id, invoice_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, job_card_id, quotation_id, invoice_date,
          subtotal, discount, total, paid_amount, due_amount, status, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          invId,
          invoiceNumber,
          customerId || null,
          vehicleId || null,
          data.customerName || null,
          data.customerPhone || null,
          data.vehicleRegistration || null,
          data.vehicleModel || null,
          data.jobCardId || null,
          data.quotationId || null,
          data.date || new Date().toISOString().split('T')[0],
          calculatedSubtotal,
          discount,
          grandTotal,
          paid,
          due,
          status,
          data.paymentMethod || 'Cash',
          data.notes || null
        ]
      );

      // Insert line items
      const createdItems = [];
      if (Array.isArray(data.items)) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = `invi-${Date.now()}-${i}`;
          const qty = Number(item.quantity) || 1;
          const uPrice = Number(item.price) || 0;
          const tot = qty * uPrice;
          await conn.query(
            `INSERT INTO invoice_items (id, invoice_id, service_id, service_name, quantity, unit_price, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [itemId, invId, item.serviceId || null, item.serviceName, qty, uPrice, tot]
          );
          createdItems.push({
            id: itemId,
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            price: uPrice,
            quantity: qty
          });
        }
      }

      // If initial payment > 0, record in payments and financial_transactions
      if (paid > 0) {
        const paymentId = `pmt-${Date.now()}`;
        const pDate = data.date || new Date().toISOString().split('T')[0];
        const pMethod = (data.paymentMethod || 'cash').toLowerCase();

        await conn.query(
          `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, reference, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [paymentId, invId, paid, pMethod, pDate, invoiceNumber, `Initial payment for ${invoiceNumber}`]
        );

        await conn.query(
          `INSERT INTO financial_transactions (
            id, transaction_type, category, reference_type, reference_id, description,
            amount, payment_method, transaction_date, transaction_time, created_at
          ) VALUES (?, 'cash_in', 'Service Payment', 'invoice_payment', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `tx-${Date.now()}`,
            invoiceNumber,
            `Service Payment - ${data.vehicleModel || 'Vehicle'} (${data.customerName || 'Customer'})`,
            paid,
            pMethod,
            pDate,
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          ]
        );
      }

      // If linked to job card, update job card invoice_id
      if (data.jobCardId) {
        await conn.query('UPDATE job_cards SET invoice_id = ? WHERE id = ?', [invId, data.jobCardId]);
      }

      return {
        ...data,
        id: invId,
        customerId,
        vehicleId,
        subtotal: calculatedSubtotal,
        discount,
        grandTotal,
        paid,
        due,
        status: statusMapToFrontend[status] || 'Due',
        items: createdItems,
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// RECORD PAYMENT FOR INVOICE
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'Cash', note } = req.body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const updatedInvoice = await withTransaction(async (conn) => {
      const [invRows] = await conn.query('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?', [id, id]);
      if (invRows.length === 0) {
        throw new Error('Invoice not found');
      }
      const inv = invRows[0];

      const currentPaid = Number(inv.paid_amount) || 0;
      const grandTotal = Number(inv.total) || 0;
      const newPaid = Math.min(grandTotal, currentPaid + paymentAmount);
      const newDue = Math.max(0, grandTotal - newPaid);
      const newStatus = newDue === 0 ? 'paid' : 'partial';

      // Update invoice
      await conn.query(
        `UPDATE invoices SET paid_amount = ?, due_amount = ?, status = ? WHERE id = ?`,
        [newPaid, newDue, newStatus, inv.id]
      );

      // Insert payment record
      const paymentId = `pmt-${Date.now()}`;
      const pMethod = (paymentMethod || 'cash').toLowerCase();
      const today = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await conn.query(
        `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, reference, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [paymentId, inv.id, paymentAmount, pMethod, today, inv.invoice_number, note || `Due collection for invoice ${inv.invoice_number}`]
      );

      // Insert exactly one financial transaction in ledger
      await conn.query(
        `INSERT INTO financial_transactions (
          id, transaction_type, category, reference_type, reference_id, description,
          amount, payment_method, transaction_date, transaction_time, created_at
        ) VALUES (?, 'cash_in', 'Service Payment', 'invoice_payment', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `tx-${Date.now()}`,
          inv.invoice_number,
          `Due Collection - ${inv.customer_name || 'Customer'} (${inv.vehicle_model || 'Vehicle'})`,
          paymentAmount,
          pMethod,
          today,
          timeStr
        ]
      );

      // Fetch items for full returned invoice
      const [items] = await conn.query(
        `SELECT id, invoice_id as invoiceId, service_id as serviceId, service_name as serviceName,
                quantity, unit_price as price, total
         FROM invoice_items WHERE invoice_id = ?`,
        [inv.id]
      );

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        date: typeof inv.invoice_date === 'string' ? inv.invoice_date : new Date(inv.invoice_date).toISOString().split('T')[0],
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        customerPhone: inv.customer_phone,
        vehicleRegistration: inv.vehicle_registration,
        vehicleModel: inv.vehicle_model,
        subtotal: Number(inv.subtotal),
        discount: Number(inv.discount),
        grandTotal,
        paid: newPaid,
        due: newDue,
        status: statusMapToFrontend[newStatus] || 'Paid',
        paymentMethod: inv.payment_method,
        notes: inv.notes,
        items: items.map(it => ({
          id: it.id,
          serviceId: it.serviceId,
          serviceName: it.serviceName,
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1
        })),
        createdAt: typeof inv.created_at === 'string' ? inv.created_at : new Date(inv.created_at).toISOString()
      };
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error recording invoice payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Invoice
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete invoices.' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
