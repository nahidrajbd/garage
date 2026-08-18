import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

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

// GET all Transactions for Unified Ledger
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date,
              COALESCE(time, DATE_FORMAT(created_at, '%h:%i %p')) as time,
              CASE type WHEN 'INCOME' THEN 'IN' ELSE 'OUT' END as flow,
              category as type,
              description,
              reference_id as reference,
              payment_method as paymentMethod,
              amount,
              reference_id as sourceId,
              created_at
       FROM financial_transactions
       ORDER BY date DESC, created_at DESC`
    );

    const formatted = rows.map(r => ({
      id: r.id,
      date: r.date,
      time: r.time,
      flow: r.flow,
      type: r.type,
      description: r.description,
      reference: r.reference,
      paymentMethod: formatPaymentMethod(r.paymentMethod),
      amount: Number(r.amount) || 0,
      sourceId: r.sourceId
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Cash In List
router.get('/cash-in', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date,
              COALESCE(time, DATE_FORMAT(created_at, '%h:%i %p')) as time,
              category as type,
              description,
              reference_id as reference,
              payment_method as paymentMethod,
              amount,
              created_at as createdAt
       FROM financial_transactions
       WHERE type = 'INCOME'
       ORDER BY date DESC, created_at DESC`
    );

    const formatted = rows.map(r => ({
      id: r.id,
      date: r.date,
      time: r.time,
      type: r.type,
      description: r.description,
      reference: r.reference,
      paymentMethod: formatPaymentMethod(r.paymentMethod),
      amount: Number(r.amount) || 0,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching cash-in:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Cash In
router.post('/cash-in', async (req, res) => {
  try {
    const data = req.body;
    const txId = `cin-${Date.now()}`;
    const date = data.date || new Date().toISOString().split('T')[0];
    const time = data.time || new Date().toTimeString().split(' ')[0];
    const amount = Number(data.amount) || 0;
    const pMethod = normalizePaymentMethod(data.paymentMethod);
    const type = data.type || 'Other Income';

    const result = await withTransaction(async (conn) => {
      let refType = 'other';
      if (type === 'Service Payment') refType = 'invoice_payment';
      if (type === 'Loan from MD') refType = 'md_loan';

      await conn.query(
        `INSERT INTO financial_transactions (
          id, date, time, type, category, description, payment_method,
          amount, reference_type, reference_id, notes, created_at
        ) VALUES (?, ?, ?, 'INCOME', ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          txId,
          date,
          time,
          type,
          data.description || `${type} Inflow`,
          pMethod,
          amount,
          refType,
          data.reference || null,
          data.note || null
        ]
      );

      // If MD Loan received, record in loan payments
      if (type === 'Loan from MD') {
        const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
        let loanId = loanRows.length > 0 ? loanRows[0].id : null;
        if (!loanId) {
          loanId = 'loan-md-default';
          await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
        }

        await conn.query(
          `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
           VALUES (?, ?, 'received', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `lp-${Date.now()}`,
            loanId,
            amount,
            date,
            time,
            pMethod,
            data.reference || null,
            data.note || data.description || 'Loan Received from MD'
          ]
        );
      }

      return {
        id: txId,
        date,
        time,
        type,
        description: data.description || `${type} Inflow`,
        reference: data.reference,
        paymentMethod: formatPaymentMethod(pMethod),
        amount,
        customerName: data.customerName,
        vehicleInfo: data.vehicleInfo,
        note: data.note,
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating cash in:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Cash In
router.delete('/cash-in/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete cash-in transactions.' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM financial_transactions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cash in:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
