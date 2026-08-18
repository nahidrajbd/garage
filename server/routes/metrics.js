import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET Dashboard Metrics
router.get('/', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

    // Cash In & Out (Today)
    const [todayCashRows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as todayCashIn,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as todayCashOut
       FROM financial_transactions
       WHERE date = ?`,
      [todayStr]
    );

    // Cash In & Out (This Month)
    const [monthCashRows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as monthIncome,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as monthExpenses
       FROM financial_transactions
       WHERE date LIKE ?`,
      [`${monthPrefix}%`]
    );

    // Total Customers
    const [custRows] = await pool.query('SELECT COUNT(*) as total FROM customers WHERE status = "active"');

    // Total Invoices
    const [invRows] = await pool.query('SELECT COUNT(*) as total FROM invoices');

    // Pending Quotations
    const [quotRows] = await pool.query(
      `SELECT COUNT(*) as total FROM quotations WHERE status IN ('draft', 'sent', 'accepted')`
    );

    // Job Cards status breakdown
    const [jcWaiting] = await pool.query(`SELECT COUNT(*) as total FROM job_cards WHERE status = 'waiting'`);
    const [jcProgress] = await pool.query(`SELECT COUNT(*) as total FROM job_cards WHERE status = 'in_progress'`);
    const [jcCompletedToday] = await pool.query(
      `SELECT COUNT(*) as total FROM job_cards WHERE status IN ('completed', 'delivered') AND date = ?`,
      [todayStr]
    );

    const todayCashIn = Number(todayCashRows[0].todayCashIn) || 0;
    const todayCashOut = Number(todayCashRows[0].todayCashOut) || 0;
    const todayNet = todayCashIn - todayCashOut;

    const monthIncome = Number(monthCashRows[0].monthIncome) || 0;
    const monthExpenses = Number(monthCashRows[0].monthExpenses) || 0;
    const monthNet = monthIncome - monthExpenses;

    const waitingJobCardsCount = Number(jcWaiting[0].total) || 0;
    const inProgressJobCardsCount = Number(jcProgress[0].total) || 0;
    const activeJobCardsCount = waitingJobCardsCount + inProgressJobCardsCount;
    const completedTodayJobCardsCount = Number(jcCompletedToday[0].total) || 0;

    res.json({
      todayCashIn,
      todayCashOut,
      todayNet,
      monthIncome,
      monthExpenses,
      monthNet,
      totalCustomers: Number(custRows[0].total) || 0,
      totalActiveInvoices: Number(invRows[0].total) || 0,
      pendingQuotationsCount: Number(quotRows[0].total) || 0,
      activeJobCardsCount,
      waitingJobCardsCount,
      inProgressJobCardsCount,
      completedTodayJobCardsCount
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
