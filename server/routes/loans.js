import express from 'express';
import pool, { withTransaction } from '../db.js';

const router = express.Router();

const formatPaymentMethod = (method) => {
  const m = String(method || 'cash').toLowerCase();
  if (m === 'bkash') return 'bKash';
  if (m === 'bank') return 'Bank';
  return 'Cash';
};

// GET Loan Summary
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'received' THEN amount ELSE 0 END), 0) as totalReceived,
        COALESCE(SUM(CASE WHEN payment_type = 'repayment' THEN amount ELSE 0 END), 0) as totalRepaid
       FROM loan_payments`
    );

    const totalReceived = Number(rows[0].totalReceived) || 0;
    const totalRepaid = Number(rows[0].totalRepaid) || 0;
    const remaining = Math.max(0, totalReceived - totalRepaid);

    res.json({
      totalReceived,
      totalRepaid,
      remaining
    });
  } catch (error) {
    console.error('Error fetching loan summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Loan Records
router.get('/records', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, DATE_FORMAT(payment_date, '%Y-%m-%d') as date,
              COALESCE(payment_time, DATE_FORMAT(created_at, '%h:%i %p')) as time,
              CASE payment_type WHEN 'received' THEN 'Received' ELSE 'Repayment' END as type,
              amount,
              payment_method as paymentMethod,
              notes as note,
              created_at as createdAt
       FROM loan_payments
       ORDER BY payment_date DESC, created_at DESC`
    );

    const formatted = rows.map(r => ({
      id: r.id,
      date: r.date,
      time: r.time,
      type: r.type,
      amount: Number(r.amount) || 0,
      paymentMethod: formatPaymentMethod(r.paymentMethod),
      note: r.note,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching loan records:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Loan Record (Received or Repayment)
router.post('/records', async (req, res) => {
  try {
    const data = req.body;
    const isReceived = String(data.type).toLowerCase() === 'received';
    const pType = isReceived ? 'received' : 'repayment';
    const amount = Number(data.amount) || 0;
    const date = data.date || new Date().toISOString().split('T')[0];
    const time = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const pMethod = (data.paymentMethod || 'cash').toLowerCase();
    const id = `lp-${Date.now()}`;

    const result = await withTransaction(async (conn) => {
      const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
      let loanId = loanRows.length > 0 ? loanRows[0].id : null;
      if (!loanId) {
        loanId = 'loan-md-default';
        await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
      }

      await conn.query(
        `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, loanId, pType, amount, date, time, pMethod, data.reference || null, data.note || null]
      );

      // Record in financial ledger
      if (isReceived) {
        await conn.query(
          `INSERT INTO financial_transactions (
            id, transaction_type, category, reference_type, reference_id, description,
            amount, payment_method, transaction_date, transaction_time, created_at
          ) VALUES (?, 'cash_in', 'Loan from MD', 'md_loan', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `tx-${Date.now()}`,
            id,
            data.note || 'Loan from MD (Inflow)',
            amount,
            pMethod,
            date,
            time
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO financial_transactions (
            id, transaction_type, category, reference_type, reference_id, description,
            amount, payment_method, transaction_date, transaction_time, created_at
          ) VALUES (?, 'cash_out', 'Loan Repayment', 'md_loan', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `tx-${Date.now()}`,
            id,
            data.note || 'Loan Repayment to MD',
            amount,
            pMethod,
            date,
            time
          ]
        );
      }

      return {
        id,
        date,
        time,
        type: isReceived ? 'Received' : 'Repayment',
        amount,
        paymentMethod: formatPaymentMethod(pMethod),
        note: data.note,
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating loan record:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
