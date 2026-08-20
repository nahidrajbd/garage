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
       WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?`,
      [todayStr]
    );

    // Cash In & Out (This Month)
    const [monthCashRows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as monthIncome,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as monthExpenses
       FROM financial_transactions
       WHERE DATE_FORMAT(date, '%Y-%m') = ?`,
      [monthPrefix]
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
    const [jcProgress] = await pool.query(`SELECT COUNT(*) as total FROM job_cards WHERE status = 'in_progress'`);
    const [jcCompletedToday] = await pool.query(
      `SELECT COUNT(*) as total FROM job_cards WHERE status = 'completed' AND DATE_FORMAT(date, '%Y-%m-%d') = ?`,
      [todayStr]
    );

    // Overall Financials
    const [finRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalIncome,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense
      FROM financial_transactions
    `);
    const [invSummary] = await pool.query(`
      SELECT 
        COALESCE(SUM(grand_total), 0) as totalBilled,
        COALESCE(SUM(paid), 0) as totalPaid,
        COALESCE(SUM(due), 0) as totalDue
      FROM invoices
    `);

    const todayCashIn = Number(todayCashRows[0].todayCashIn) || 0;
    const todayCashOut = Number(todayCashRows[0].todayCashOut) || 0;
    const todayNet = todayCashIn - todayCashOut;

    const monthIncome = Number(monthCashRows[0].monthIncome) || 0;
    const monthExpenses = Number(monthCashRows[0].monthExpenses) || 0;
    const monthNet = monthIncome - monthExpenses;

    const inProgressJobCardsCount = Number(jcProgress[0].total) || 0;
    const activeJobCardsCount = inProgressJobCardsCount;
    const completedTodayJobCardsCount = Number(jcCompletedToday[0].total) || 0;

    const tIncome = Number(finRows[0]?.totalIncome) || 0;
    const tExpense = Number(finRows[0]?.totalExpense) || 0;

    res.json({
      todayCashIn,
      todayCashOut,
      todayNet,
      monthIncome,
      monthExpenses,
      monthNet,
      totalCustomers: Number(custRows[0].total) || 0,
      totalActiveInvoices: Number(invRows[0].total) || 0,
      totalInvoices: Number(invRows[0].total) || 0,
      pendingQuotationsCount: Number(quotRows[0].total) || 0,
      activeJobCardsCount,
      inProgressJobCardsCount,
      completedTodayJobCardsCount,
      totalBilled: Number(invSummary[0]?.totalBilled) || 0,
      totalPaid: Number(invSummary[0]?.totalPaid) || 0,
      totalDue: Number(invSummary[0]?.totalDue) || 0,
      totalIncome: tIncome,
      totalExpense: tExpense,
      netProfit: tIncome - tExpense
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
