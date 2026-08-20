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

const formatPaymentMethod = (method) => {
  const m = String(method || 'cash').toLowerCase();
  if (m === 'bkash') return 'bKash';
  if (m === 'bank') return 'Bank';
  return 'Cash';
};

const normalizePaymentMethod = (method) => {
  const m = String(method || 'cash').toLowerCase();
  if (m === 'bkash') return 'bkash';
  if (m === 'bank') return 'bank';
  return 'cash';
};

const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const formatMoney = (n) => `৳${(Number(n) || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function buildInvoiceEmailHtml({
  businessName, footerText, invoiceNumber, date, customerName,
  vehicleModel, vehicleRegistration, items, subtotal, discount, grandTotal, paid, due,
}) {
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px 4px; border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
      <td style="padding:8px 4px; border-bottom:1px solid #eee; text-align:center;">${it.quantity}</td>
      <td style="padding:8px 4px; border-bottom:1px solid #eee; text-align:right;">${formatMoney(it.total)}</td>
    </tr>`).join('');

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color:#1f2937;">
    <div style="background:#C1121F; padding:20px 24px; text-align:center; border-radius:8px 8px 0 0;">
      <h1 style="color:#fff; margin:0; font-size:20px;">${escapeHtml(businessName)}</h1>
    </div>
    <div style="padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
      <p style="margin-top:0;">Dear ${escapeHtml(customerName || 'Customer')},</p>
      <p>Thank you for choosing ${escapeHtml(businessName)}. Please find your invoice details below.</p>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <tr><td style="padding:4px 0; color:#6b7280;">Invoice No.</td><td style="text-align:right; font-weight:bold;">${escapeHtml(invoiceNumber)}</td></tr>
        <tr><td style="padding:4px 0; color:#6b7280;">Date</td><td style="text-align:right;">${escapeHtml(date)}</td></tr>
        ${vehicleModel ? `<tr><td style="padding:4px 0; color:#6b7280;">Vehicle</td><td style="text-align:right;">${escapeHtml(vehicleModel)}${vehicleRegistration ? ` (${escapeHtml(vehicleRegistration)})` : ''}</td></tr>` : ''}
      </table>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb; text-align:left; color:#6b7280;">
            <th style="padding:8px 4px;">Service</th>
            <th style="padding:8px 4px; text-align:center;">Qty</th>
            <th style="padding:8px 4px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <tr><td style="padding:4px 0; color:#6b7280;">Subtotal</td><td style="text-align:right;">${formatMoney(subtotal)}</td></tr>
        ${discount > 0 ? `<tr><td style="padding:4px 0; color:#b91c1c;">Discount</td><td style="text-align:right; color:#b91c1c;">- ${formatMoney(discount)}</td></tr>` : ''}
        <tr><td style="padding:8px 0; font-size:16px; font-weight:bold; border-top:2px solid #e5e7eb;">Grand Total</td><td style="padding:8px 0; text-align:right; font-size:16px; font-weight:bold; color:#C1121F; border-top:2px solid #e5e7eb;">${formatMoney(grandTotal)}</td></tr>
        <tr><td style="padding:4px 0; color:#047857;">Paid</td><td style="text-align:right; color:#047857;">${formatMoney(paid)}</td></tr>
        <tr><td style="padding:4px 0; font-weight:bold;">Due</td><td style="text-align:right; font-weight:bold; color:${due > 0 ? '#dc2626' : '#047857'};">${formatMoney(due)}</td></tr>
      </table>

      ${footerText ? `<p style="margin-top:24px; color:#6b7280; font-size:13px;">${escapeHtml(footerText)}</p>` : ''}
    </div>
  </div>`;
}

// GET all Invoices
router.get('/', async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.id, i.invoice_number as invoiceNumber, i.customer_id as customerId, i.vehicle_id as vehicleId,
              i.customer_name as customerName, i.customer_phone as customerPhone,
              i.vehicle_registration as vehicleRegistration, i.vehicle_model as vehicleModel,
              i.job_card_id as jobCardId, jc.job_card_number as jobCardNumber,
              i.quotation_id as quotationId, q.quotation_number as quotationNumber,
              DATE_FORMAT(i.date, '%Y-%m-%d') as date,
              i.subtotal, i.discount, i.grand_total as grandTotal,
              i.paid, i.due,
              i.status, i.payment_method as paymentMethod, i.notes,
              i.created_at as createdAt, i.updated_at as updatedAt
       FROM invoices i
       LEFT JOIN job_cards jc ON i.job_card_id = jc.id
       LEFT JOIN quotations q ON i.quotation_id = q.id
       ORDER BY i.created_at DESC`
    );

    const [items] = await pool.query(
      `SELECT id, invoice_id as invoiceId, description as serviceName,
              description, quantity, unit_price as price, total
       FROM invoice_items ORDER BY sort_order ASC, created_at ASC`
    );

    const itemMap = {};
    for (const item of items) {
      if (!itemMap[item.invoiceId]) itemMap[item.invoiceId] = [];
      itemMap[item.invoiceId].push({
        id: item.id,
        serviceName: item.serviceName || item.description || 'Service',
        description: item.description,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1
      });
    }

    const formatted = invoices.map(inv => ({
      ...inv,
      status: statusMapToFrontend[inv.status] || 'Due',
      paymentMethod: formatPaymentMethod(inv.paymentMethod),
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
              DATE_FORMAT(i.date, '%Y-%m-%d') as date,
              i.subtotal, i.discount, i.grand_total as grandTotal,
              i.paid, i.due,
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
      `SELECT id, invoice_id as invoiceId, description as serviceName,
              description, quantity, unit_price as price, total
       FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC`,
      [inv.id]
    );

    res.json({
      ...inv,
      status: statusMapToFrontend[inv.status] || 'Due',
      paymentMethod: formatPaymentMethod(inv.paymentMethod),
      subtotal: Number(inv.subtotal) || 0,
      discount: Number(inv.discount) || 0,
      grandTotal: Number(inv.grandTotal) || 0,
      paid: Number(inv.paid) || 0,
      due: Number(inv.due) || 0,
      items: items.map(it => ({
        id: it.id,
        serviceName: it.serviceName || it.description || 'Service',
        description: it.description,
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
    const invoiceDate = data.date || new Date().toISOString().split('T')[0];
    const invoiceTime = new Date().toTimeString().split(' ')[0];
    const pMethod = normalizePaymentMethod(data.paymentMethod);

    const result = await withTransaction(async (conn) => {
      let customerId = data.customerId;
      let vehicleId = data.vehicleId;

      // Random 4-digit invoice number (e.g. INV-4821), retried on collision
      const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "invoice_prefix"');
      const prefix = setRows[0]?.setting_value || 'INV-';
      let invoiceNumber = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        const candidate = `${prefix}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const [existingInv] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [candidate]);
        if (existingInv.length === 0) {
          invoiceNumber = candidate;
          break;
        }
      }
      if (!invoiceNumber) {
        invoiceNumber = `${prefix}${Date.now().toString().slice(-4)}`;
      }

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
          vehicle_registration, vehicle_model, job_card_id, quotation_id, date, time,
          subtotal, discount, grand_total, paid, due, status, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
          invoiceDate,
          invoiceTime,
          calculatedSubtotal,
          discount,
          grandTotal,
          paid,
          due,
          status,
          pMethod,
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
          const itemDesc = item.serviceName || item.description || 'Service';

          await conn.query(
            `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
             VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
            [itemId, invId, itemDesc, qty, uPrice, tot, i]
          );

          createdItems.push({
            id: itemId,
            serviceName: itemDesc,
            price: uPrice,
            quantity: qty
          });
        }
      }

      // If initial payment > 0, record in payments and financial_transactions
      if (paid > 0) {
        const paymentId = `pmt-${Date.now()}`;

        await conn.query(
          `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, payment_time, reference, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [paymentId, invId, paid, pMethod, invoiceDate, invoiceTime, invoiceNumber, `Initial payment for ${invoiceNumber}`]
        );

        await conn.query(
          `INSERT INTO financial_transactions (
            id, date, time, type, category, description, payment_method,
            amount, reference_type, reference_id, notes, created_at
          ) VALUES (?, ?, ?, 'INCOME', 'Service Payment', ?, ?, ?, 'invoice_payment', ?, ?, NOW())`,
          [
            `tx-${Date.now()}`,
            invoiceDate,
            invoiceTime,
            `Service Payment - ${data.vehicleModel || 'Vehicle'} (${data.customerName || 'Customer'})`,
            pMethod,
            paid,
            invoiceNumber,
            `Initial payment received for invoice ${invoiceNumber}`
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
        invoiceNumber,
        date: invoiceDate,
        customerId,
        vehicleId,
        subtotal: calculatedSubtotal,
        discount,
        grandTotal,
        paid,
        due,
        status: statusMapToFrontend[status] || 'Due',
        paymentMethod: formatPaymentMethod(pMethod),
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

      const currentPaid = Number(inv.paid) || 0;
      const grandTotal = Number(inv.grand_total) || 0;
      const newPaid = Math.min(grandTotal, currentPaid + paymentAmount);
      const newDue = Math.max(0, grandTotal - newPaid);
      const newStatus = newDue === 0 ? 'paid' : 'partial';

      // Update invoice
      await conn.query(
        `UPDATE invoices SET paid = ?, due = ?, status = ? WHERE id = ?`,
        [newPaid, newDue, newStatus, inv.id]
      );

      // Insert payment record
      const paymentId = `pmt-${Date.now()}`;
      const pMethod = normalizePaymentMethod(paymentMethod);
      const today = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0];

      await conn.query(
        `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, payment_time, reference, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [paymentId, inv.id, paymentAmount, pMethod, today, timeStr, inv.invoice_number, note || `Due collection for invoice ${inv.invoice_number}`]
      );

      // Insert exactly one financial transaction in ledger
      await conn.query(
        `INSERT INTO financial_transactions (
          id, date, time, type, category, description, payment_method,
          amount, reference_type, reference_id, notes, created_at
        ) VALUES (?, ?, ?, 'INCOME', 'Service Payment', ?, ?, ?, 'invoice_payment', ?, ?, NOW())`,
        [
          `tx-${Date.now()}`,
          today,
          timeStr,
          `Due Collection - ${inv.customer_name || 'Customer'} (${inv.vehicle_model || 'Vehicle'})`,
          pMethod,
          paymentAmount,
          inv.invoice_number,
          note || `Due payment collection for ${inv.invoice_number}`
        ]
      );

      // Fetch items for full returned invoice
      const [items] = await conn.query(
        `SELECT id, invoice_id as invoiceId, description as serviceName,
                description, quantity, unit_price as price, total
         FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC`,
        [inv.id]
      );

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        date: typeof inv.date === 'string' ? inv.date : new Date(inv.date).toISOString().split('T')[0],
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
        paymentMethod: formatPaymentMethod(inv.payment_method),
        notes: inv.notes,
        items: items.map(it => ({
          id: it.id,
          serviceName: it.serviceName || it.description || 'Service',
          description: it.description,
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

// EMAIL Invoice
router.post('/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const [invRows] = await pool.query(
      `SELECT i.*, DATE_FORMAT(i.date, '%Y-%m-%d') as invDate
       FROM invoices i WHERE i.id = ? OR i.invoice_number = ?`,
      [id, id]
    );
    if (invRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const inv = invRows[0];

    let targetEmail = email ? String(email).trim() : '';
    let customer = null;
    if (inv.customer_id) {
      const [custRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [inv.customer_id]);
      customer = custRows[0] || null;
    }
    if (!targetEmail && customer?.email) {
      targetEmail = customer.email;
    }
    if (!targetEmail) {
      return res.status(400).json({ error: 'No email address provided for this customer' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Persist a newly-provided email onto the customer record for next time
    if (email && customer && !customer.email) {
      await pool.query('UPDATE customers SET email = ? WHERE id = ?', [targetEmail, customer.id]);
    }

    const [items] = await pool.query(
      `SELECT description as serviceName, description, quantity, unit_price as price, total
       FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC`,
      [inv.id]
    );

    const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    for (const row of settingsRows) settings[row.setting_key] = row.setting_value;

    const html = buildInvoiceEmailHtml({
      businessName: settings.business_name || 'NextGarage',
      footerText: settings.default_footer_text || '',
      invoiceNumber: inv.invoice_number,
      date: inv.invDate,
      customerName: inv.customer_name,
      vehicleModel: inv.vehicle_model,
      vehicleRegistration: inv.vehicle_registration,
      items: items.map(it => ({
        name: it.serviceName || it.description || 'Service',
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        total: Number(it.total) || 0,
      })),
      subtotal: Number(inv.subtotal) || 0,
      discount: Number(inv.discount) || 0,
      grandTotal: Number(inv.grand_total) || 0,
      paid: Number(inv.paid) || 0,
      due: Number(inv.due) || 0,
    });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${settings.business_name || 'NextGarage'} <onboarding@resend.dev>`,
        to: [targetEmail],
        reply_to: settings.email || undefined,
        subject: `Invoice ${inv.invoice_number} from ${settings.business_name || 'NextGarage'}`,
        html,
      }),
    });
    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      console.error('Resend API error:', resendData);
      return res.status(502).json({ error: resendData.message || 'Failed to send email' });
    }

    res.json({ success: true, email: targetEmail });
  } catch (error) {
    console.error('Error emailing invoice:', error);
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
