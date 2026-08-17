import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET all Expenses
router.get('/', async (req, res) => {
  try {
    const [expenses] = await pool.query(
      `SELECT e.id, DATE_FORMAT(e.expense_date, '%Y-%m-%d') as date,
              COALESCE(e.expense_time, DATE_FORMAT(e.created_at, '%h:%i %p')) as time,
              COALESCE(ec.name, e.category_name) as category,
              e.description,
              CASE LOWER(e.payment_method)
                WHEN 'bkash' THEN 'bKash'
                WHEN 'bank' THEN 'Bank'
                ELSE 'Cash'
              END as paymentMethod,
              e.amount, e.notes as note, e.recipient, e.reference,
              e.created_at as createdAt
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       ORDER BY e.expense_date DESC, e.created_at DESC`
    );

    const formatted = expenses.map(e => ({
      ...e,
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
    const time = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const pMethod = (data.paymentMethod || 'Cash').toLowerCase();
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
          id, category_id, category_name, description, amount, payment_method,
          expense_date, expense_time, reference, recipient, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          expId,
          categoryId,
          categoryName,
          data.description,
          amount,
          pMethod,
          date,
          time,
          data.reference || null,
          data.recipient || null,
          data.note || null
        ]
      );

      // Record in financial_transactions
      await conn.query(
        `INSERT INTO financial_transactions (
          id, transaction_type, category, reference_type, reference_id, description,
          amount, payment_method, transaction_date, transaction_time, created_at
        ) VALUES (?, 'cash_out', ?, 'expense', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `tx-${Date.now()}`,
          categoryName,
          expId,
          data.description || `Expense - ${categoryName}`,
          amount,
          pMethod,
          date,
          time
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
        paymentMethod: data.paymentMethod || 'Cash',
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
