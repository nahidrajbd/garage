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
              e.created_at as createdAt
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       ORDER BY e.date DESC, e.created_at DESC`
    );

    const formatted = expenses.map(e => ({
      ...e,
      paymentMethod: formatPaymentMethod(e.paymentMethod),
      amount: Number(e.amount) || 0,
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

      await conn.query(
        `INSERT INTO expenses (
          id, date, time, category_id, category_name, description, payment_method,
          amount, recipient, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
          data.note || null
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
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
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
    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    await pool.query('DELETE FROM financial_transactions WHERE reference_type = "expense" AND reference_id = ?', [id]);
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
