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

// GET all Expenses
router.get('/', async (req, res) => {
  try {
    const [expenses] = await pool.query(
      `SELECT e.id, DATE_FORMAT(e.date, '%Y-%m-%d') as date,
              COALESCE(e.time, DATE_FORMAT(e.created_at, '%h:%i %p')) as time,
              COALESCE(ec.name, e.category_name) as category,
              e.description,
              e.payment_method as paymentMethod,
              e.amount, e.note, e.recipient,
              e.paid_from_loan as paidFromLoan, e.loan_payment_id as loanPaymentId,
              e.created_at as createdAt
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       ORDER BY e.date DESC, e.created_at DESC`
    );

    const formatted = expenses.map(e => ({
      ...e,
      paymentMethod: formatPaymentMethod(e.paymentMethod),
      amount: Number(e.amount) || 0,
      paidFromLoan: Boolean(e.paidFromLoan),
      loanPaymentId: e.loanPaymentId || undefined,
      createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Expense
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const expId = `exp-${Date.now()}`;
    const amount = Number(data.amount) || 0;
    const date = data.date || new Date().toISOString().split('T')[0];
    const time = data.time || new Date().toTimeString().split(' ')[0];
    const pMethod = normalizePaymentMethod(data.paymentMethod);
    const categoryName = data.category || 'Other';
    const paidFromLoan = Boolean(data.paidFromLoan);

    const result = await withTransaction(async (conn) => {
      // Find or insert category
      const [catRows] = await conn.query('SELECT id FROM expense_categories WHERE LOWER(name) = ?', [categoryName.toLowerCase()]);
      let categoryId = null;
      if (catRows.length > 0) {
        categoryId = catRows[0].id;
      } else {
        categoryId = `exp_cat_${Date.now()}`;
        await conn.query('INSERT INTO expense_categories (id, name, status) VALUES (?, ?, "active")', [categoryId, categoryName]);
      }

      // If this expense was paid directly by the MD (out of pocket), it's not
      // company cash going out - it's a new liability to the MD. Record it as
      // a loan "received" so the Loan Summary reflects what the company owes,
      // paired with an offsetting INCOME entry so net cash impact stays zero
      // (mirrors how loans.js records a normal MD loan injection).
      let loanPaymentId = null;
      if (paidFromLoan && amount > 0) {
        const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
        let loanId = loanRows.length > 0 ? loanRows[0].id : null;
        if (!loanId) {
          loanId = 'loan-md-default';
          await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
        }

        loanPaymentId = `lp-${Date.now()}`;
        const loanNote = data.note || `Paid directly by MD for expense: ${data.description || categoryName}`;
        await conn.query(
          `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
           VALUES (?, ?, 'received', ?, ?, ?, ?, ?, ?, NOW())`,
          [loanPaymentId, loanId, amount, date, time, pMethod, expId, loanNote]
        );

        await conn.query(
          `INSERT INTO financial_transactions (
            id, date, time, type, category, description, payment_method,
            amount, reference_type, reference_id, notes, created_at
          ) VALUES (?, ?, ?, 'INCOME', 'Loan from MD', ?, ?, ?, 'md_loan', ?, ?, NOW())`,
          [`tx-${Date.now()}-in`, date, time, loanNote, pMethod, amount, loanPaymentId, loanNote]
        );
      }

      await conn.query(
        `INSERT INTO expenses (
          id, date, time, category_id, category_name, description, payment_method,
          amount, recipient, note, paid_from_loan, loan_payment_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          expId,
          date,
          time,
          categoryId,
          categoryName,
          data.description,
          pMethod,
          amount,
          data.recipient || null,
          data.note || null,
          paidFromLoan ? 1 : 0,
          loanPaymentId
        ]
      );

      // Record in financial_transactions
      await conn.query(
        `INSERT INTO financial_transactions (
          id, date, time, type, category, description, payment_method,
          amount, reference_type, reference_id, notes, created_at
        ) VALUES (?, ?, ?, 'EXPENSE', ?, ?, ?, ?, 'expense', ?, ?, NOW())`,
        [
          `tx-${Date.now()}`,
          date,
          time,
          categoryName,
          data.description || `Expense - ${categoryName}`,
          pMethod,
          amount,
          expId,
          data.note || null
        ]
      );

      // If category is Loan Repayment, update MD loan record
      if (categoryName.toLowerCase() === 'loan repayment') {
        const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
        let loanId = loanRows.length > 0 ? loanRows[0].id : null;
        if (!loanId) {
          loanId = 'loan-md-default';
          await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
        }

        await conn.query(
          `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
           VALUES (?, ?, 'repayment', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `lp-${Date.now()}`,
            loanId,
            amount,
            date,
            time,
            pMethod,
            data.reference || null,
            data.note || data.description || 'Loan Repayment'
          ]
        );
      }

      return {
        id: expId,
        date,
        time,
        category: categoryName,
        description: data.description,
        paymentMethod: formatPaymentMethod(pMethod),
        amount,
        note: data.note,
        recipient: data.recipient,
        paidFromLoan,
        loanPaymentId: loanPaymentId || undefined,
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Expense (super admin only)
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to edit expenses.' });
    }
    const { id } = req.params;
    const data = req.body;
    const amount = Number(data.amount) || 0;
    const date = data.date || new Date().toISOString().split('T')[0];
    const time = data.time || new Date().toTimeString().split(' ')[0];
    const pMethod = normalizePaymentMethod(data.paymentMethod);
    const categoryName = data.category || 'Other';
    const paidFromLoan = Boolean(data.paidFromLoan);

    const result = await withTransaction(async (conn) => {
      const [existingRows] = await conn.query('SELECT * FROM expenses WHERE id = ?', [id]);
      if (existingRows.length === 0) {
        throw new Error('Expense not found');
      }
      const existing = existingRows[0];

      const [catRows] = await conn.query('SELECT id FROM expense_categories WHERE LOWER(name) = ?', [categoryName.toLowerCase()]);
      let categoryId = null;
      if (catRows.length > 0) {
        categoryId = catRows[0].id;
      } else {
        categoryId = `exp_cat_${Date.now()}`;
        await conn.query('INSERT INTO expense_categories (id, name, status) VALUES (?, ?, "active")', [categoryId, categoryName]);
      }

      // Reconcile the linked MD-loan record with the (possibly changed)
      // paidFromLoan flag and amount.
      let loanPaymentId = existing.loan_payment_id;
      const loanNote = data.note || `Paid directly by MD for expense: ${data.description || categoryName}`;

      if (paidFromLoan && amount > 0) {
        if (loanPaymentId) {
          await conn.query(
            `UPDATE loan_payments SET amount = ?, payment_date = ?, payment_time = ?, payment_method = ?, notes = ? WHERE id = ?`,
            [amount, date, time, pMethod, loanNote, loanPaymentId]
          );
          await conn.query(
            `UPDATE financial_transactions SET amount = ?, date = ?, time = ?, payment_method = ?, description = ?, notes = ?
             WHERE reference_type = 'md_loan' AND reference_id = ?`,
            [amount, date, time, pMethod, loanNote, loanNote, loanPaymentId]
          );
        } else {
          const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
          let loanId = loanRows.length > 0 ? loanRows[0].id : null;
          if (!loanId) {
            loanId = 'loan-md-default';
            await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
          }
          loanPaymentId = `lp-${Date.now()}`;
          await conn.query(
            `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
             VALUES (?, ?, 'received', ?, ?, ?, ?, ?, ?, NOW())`,
            [loanPaymentId, loanId, amount, date, time, pMethod, id, loanNote]
          );
          await conn.query(
            `INSERT INTO financial_transactions (
              id, date, time, type, category, description, payment_method,
              amount, reference_type, reference_id, notes, created_at
            ) VALUES (?, ?, ?, 'INCOME', 'Loan from MD', ?, ?, ?, 'md_loan', ?, ?, NOW())`,
            [`tx-${Date.now()}-in`, date, time, loanNote, pMethod, amount, loanPaymentId, loanNote]
          );
        }
      } else if (loanPaymentId) {
        await conn.query('DELETE FROM loan_payments WHERE id = ?', [loanPaymentId]);
        await conn.query('DELETE FROM financial_transactions WHERE reference_type = "md_loan" AND reference_id = ?', [loanPaymentId]);
        loanPaymentId = null;
      }

      await conn.query(
        `UPDATE expenses SET
          date = ?, time = ?, category_id = ?, category_name = ?, description = ?, payment_method = ?,
          amount = ?, recipient = ?, note = ?, paid_from_loan = ?, loan_payment_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [date, time, categoryId, categoryName, data.description, pMethod, amount, data.recipient || null, data.note || null, paidFromLoan ? 1 : 0, loanPaymentId, id]
      );

      // Keep the main EXPENSE ledger entry in sync
      await conn.query(
        `UPDATE financial_transactions SET date = ?, time = ?, category = ?, description = ?, payment_method = ?, amount = ?, notes = ?
         WHERE reference_type = 'expense' AND reference_id = ?`,
        [date, time, categoryName, data.description || `Expense - ${categoryName}`, pMethod, amount, data.note || null, id]
      );

      return {
        id,
        date,
        time,
        category: categoryName,
        description: data.description,
        paymentMethod: formatPaymentMethod(pMethod),
        amount,
        note: data.note,
        recipient: data.recipient,
        paidFromLoan,
        loanPaymentId: loanPaymentId || undefined,
        createdAt: typeof existing.created_at === 'string' ? existing.created_at : new Date(existing.created_at).toISOString()
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Expense
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete expenses.' });
    }
    const { id } = req.params;
    const [rows] = await pool.query('SELECT loan_payment_id FROM expenses WHERE id = ?', [id]);
    const loanPaymentId = rows[0]?.loan_payment_id;

    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    await pool.query('DELETE FROM financial_transactions WHERE reference_type = "expense" AND reference_id = ?', [id]);

    if (loanPaymentId) {
      await pool.query('DELETE FROM loan_payments WHERE id = ?', [loanPaymentId]);
      await pool.query('DELETE FROM financial_transactions WHERE reference_type = "md_loan" AND reference_id = ?', [loanPaymentId]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Expense Categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM expense_categories WHERE status = "active" ORDER BY name ASC');
    res.json(rows.map(r => r.name));
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD Expense Category
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const id = `exp_cat_${Date.now()}`;
    await pool.query('INSERT IGNORE INTO expense_categories (id, name, status) VALUES (?, ?, "active")', [id, name.trim()]);
    const [rows] = await pool.query('SELECT name FROM expense_categories WHERE status = "active" ORDER BY name ASC');
    res.json(rows.map(r => r.name));
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Expense Category
router.delete('/categories/:name', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete expense categories.' });
    }
    const { name } = req.params;
    await pool.query('DELETE FROM expense_categories WHERE name = ?', [name]);
    const [rows] = await pool.query('SELECT name FROM expense_categories WHERE status = "active" ORDER BY name ASC');
    res.json(rows.map(r => r.name));
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
