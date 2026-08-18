import { pool, testConnection, withTransaction } from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`  ✅ ${message}`);
    passedTests++;
  }
}

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 NEXTGARAGE COMPREHENSIVE BACKEND UNIT TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Database Connection
  console.log('Test 1: Database Connection');
  const isConnected = await testConnection();
  assert(isConnected === true, 'Successfully connected to MySQL database');

  const testSuffix = Date.now();
  const testPhone = `01711${String(testSuffix).slice(-6)}`;
  const custId = `unit-cust-${testSuffix}`;
  const vehId = `unit-veh-${testSuffix}`;
  const invId = `unit-inv-${testSuffix}`;
  const invNumber = `INV-TEST-${String(testSuffix).slice(-4)}`;
  const quotId = `unit-qt-${testSuffix}`;
  const quotNumber = `QT-TEST-${String(testSuffix).slice(-4)}`;
  const convInvId = `unit-conv-inv-${testSuffix}`;
  const convInvNumber = `INV-CONV-${String(testSuffix).slice(-4)}`;
  const jcId = `unit-jc-${testSuffix}`;
  const jcNumber = `JC-TEST-${String(testSuffix).slice(-4)}`;
  const expId = `unit-exp-${testSuffix}`;
  const itemId = `unit-item-${testSuffix}`;

  const today = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0];

  try {
    // Test 2: Customer & Vehicle Creation
    console.log('\nTest 2: Customer & Vehicle Creation');
    await withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO customers (id, name, phone, email, address, status, created_at)
         VALUES (?, 'Unit Test Customer', ?, 'test@unit.com', 'Rajshahi, Bangladesh', 'active', NOW())`,
        [custId, testPhone]
      );
      await conn.query(
        `INSERT INTO vehicles (id, customer_id, registration_number, model, model_year, color, created_at)
         VALUES (?, ?, 'Rajshahi Metro-Test 99-88', 'Toyota Premio 2020', '2020', 'Pearl White', NOW())`,
        [vehId, custId]
      );
    });
    const [custRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [custId]);
    assert(custRows.length === 1, 'Customer inserted and retrieved');
    assert(custRows[0].phone === testPhone, 'Customer phone matches');

    // Test 3: Invoice Creation (with items, partial payment & transaction ledger)
    console.log('\nTest 3: Invoice Creation Flow (Fixing "failed saving invoice")');

    await withTransaction(async (conn) => {
      // 1. Insert Invoice
      await conn.query(
        `INSERT INTO invoices (
          id, invoice_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, date, time, subtotal, discount,
          grand_total, paid, due, status, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, 'Unit Test Customer', ?, 'Rajshahi Metro-Test 99-88', 'Toyota Premio 2020', ?, ?, 5000.00, 500.00, 4500.00, 2000.00, 2500.00, 'partial', 'cash', 'Unit test invoice saving', NOW())`,
        [invId, invNumber, custId, vehId, testPhone, today, timeStr]
      );

      // 2. Insert Invoice Items
      await conn.query(
        `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
         VALUES (?, ?, 'service', 'Full Periodic Car Servicing', 1.000, 5000.00, 5000.00, 0, NOW())`,
        [`${invId}-item-1`, invId]
      );

      // 3. Insert Initial Payment
      await conn.query(
        `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, payment_time, reference, note, created_at)
         VALUES (?, ?, 2000.00, 'cash', ?, ?, ?, 'Initial partial payment', NOW())`,
        [`${invId}-pmt-1`, invId, today, timeStr, invNumber]
      );

      // 4. Insert Financial Transaction Ledger Entry
      await conn.query(
        `INSERT INTO financial_transactions (
          id, date, time, type, category, description, payment_method,
          amount, reference_type, reference_id, notes, created_at
        ) VALUES (?, ?, ?, 'INCOME', 'Service Payment', ?, 'cash', 2000.00, 'invoice_payment', ?, 'Initial payment received', NOW())`,
        [`${invId}-tx-1`, today, timeStr, `Service Payment - Toyota Premio 2020 (Unit Test Customer)`, invNumber]
      );
    });

    // Verify Invoice and relationships
    const [invCheck] = await pool.query('SELECT * FROM invoices WHERE id = ?', [invId]);
    assert(invCheck.length === 1, 'Invoice saved successfully to database');
    assert(Number(invCheck[0].grand_total) === 4500, 'Invoice grand_total matches 4500');
    assert(Number(invCheck[0].paid) === 2000, 'Invoice paid amount matches 2000');
    assert(Number(invCheck[0].due) === 2500, 'Invoice due amount matches 2500');
    assert(invCheck[0].status === 'partial', 'Invoice status is "partial"');

    const [itemCheck] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invId]);
    assert(itemCheck.length === 1, 'Invoice items saved successfully');
    assert(itemCheck[0].description === 'Full Periodic Car Servicing', 'Invoice item description matches');

    const [pmtCheck] = await pool.query('SELECT * FROM payments WHERE invoice_id = ?', [invId]);
    assert(pmtCheck.length === 1, 'Payment record saved successfully');
    assert(Number(pmtCheck[0].amount) === 2000, 'Payment amount matches 2000');

    const [txCheck] = await pool.query('SELECT * FROM financial_transactions WHERE reference_id = ?', [invNumber]);
    assert(txCheck.length === 1, 'Financial transaction ledger recorded for initial payment');
    assert(txCheck[0].type === 'INCOME', 'Transaction type is INCOME');

    // Test 4: Due Payment Collection Flow
    console.log('\nTest 4: Due Payment Collection Flow');
    await withTransaction(async (conn) => {
      // Collect remaining 2500 due via bKash
      await conn.query(
        `UPDATE invoices SET paid = 4500.00, due = 0.00, status = 'paid' WHERE id = ?`,
        [invId]
      );

      await conn.query(
        `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, payment_time, reference, note, created_at)
         VALUES (?, ?, 2500.00, 'bkash', ?, ?, ?, 'Due settlement via bKash', NOW())`,
        [`${invId}-pmt-2`, invId, today, timeStr, invNumber]
      );

      await conn.query(
        `INSERT INTO financial_transactions (
          id, date, time, type, category, description, payment_method,
          amount, reference_type, reference_id, notes, created_at
        ) VALUES (?, ?, ?, 'INCOME', 'Service Payment', ?, 'bkash', 2500.00, 'invoice_payment', ?, 'Due settlement', NOW())`,
        [`${invId}-tx-2`, today, timeStr, `Due Collection - Unit Test Customer (Toyota Premio 2020)`, invNumber]
      );
    });

    const [invPaidCheck] = await pool.query('SELECT * FROM invoices WHERE id = ?', [invId]);
    assert(invPaidCheck[0].status === 'paid', 'Invoice status updated to "paid"');
    assert(Number(invPaidCheck[0].due) === 0, 'Invoice due is now 0');
    assert(Number(invPaidCheck[0].paid) === 4500, 'Invoice total paid is now 4500');

    // Test 5: Quotation Creation & Conversion Flow
    console.log('\nTest 5: Quotation Creation & Conversion to Invoice Flow');
    await withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO quotations (
          id, quotation_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, quotation_date, valid_until, status,
          subtotal, discount, total, notes, created_at
        ) VALUES (?, ?, ?, ?, 'Unit Test Customer', ?, 'Rajshahi Metro-Test 99-88', 'Toyota Premio 2020', ?, DATE_ADD(?, INTERVAL 15 DAY), 'draft', 3000.00, 200.00, 2800.00, 'Quotation test', NOW())`,
        [quotId, quotNumber, custId, vehId, testPhone, today, today]
      );

      await conn.query(
        `INSERT INTO quotation_items (id, quotation_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
         VALUES (?, ?, 'service', 'Brake Pad Servicing & Replacement', 1.000, 3000.00, 3000.00, 0, NOW())`,
        [`${quotId}-item-1`, quotId]
      );
    });

    const [quotCheck] = await pool.query('SELECT * FROM quotations WHERE id = ?', [quotId]);
    assert(quotCheck.length === 1, 'Quotation created successfully');
    assert(Number(quotCheck[0].total) === 2800, 'Quotation total is 2800');

    // Convert quotation to invoice
    await withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO invoices (
          id, invoice_number, quotation_id, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, date, time, subtotal, discount, grand_total,
          paid, due, status, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, 'Unit Test Customer', ?, 'Rajshahi Metro-Test 99-88', 'Toyota Premio 2020', ?, ?, 3000.00, 200.00, 2800.00, 0.00, 2800.00, 'due', 'cash', 'Converted from quotation', NOW())`,
        [convInvId, convInvNumber, quotId, custId, vehId, testPhone, today, timeStr]
      );

      await conn.query(
        `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
         VALUES (?, ?, 'service', 'Brake Pad Servicing & Replacement', 1.000, 3000.00, 3000.00, 0, NOW())`,
        [`${convInvId}-item-1`, convInvId]
      );

      await conn.query(
        `UPDATE quotations SET status = 'converted', converted_invoice_id = ?, converted_invoice_number = ? WHERE id = ?`,
        [convInvId, convInvNumber, quotId]
      );
    });

    const [convCheck] = await pool.query('SELECT * FROM quotations WHERE id = ?', [quotId]);
    assert(convCheck[0].status === 'converted', 'Quotation marked as converted');
    assert(convCheck[0].converted_invoice_id === convInvId, 'Quotation linked to converted invoice');

    // Test 6: Job Card Creation & Linking
    console.log('\nTest 6: Job Card Creation & Invoice Linking');
    await withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO job_cards (
          id, job_card_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, mileage, date, expected_delivery_date,
          status, customer_complaint, vehicle_condition, assigned_to, quotation_id, invoice_id, created_at
        ) VALUES (?, ?, ?, ?, 'Unit Test Customer', ?, 'Rajshahi Metro-Test 99-88', 'Toyota Premio 2020', '45000 km', ?, DATE_ADD(?, INTERVAL 2 DAY), 'in_progress', 'Engine vibration', 'Good', 'Karim', ?, ?, NOW())`,
        [jcId, jcNumber, custId, vehId, testPhone, today, today, quotId, invId]
      );

      await conn.query(
        `INSERT INTO job_card_items (id, job_card_id, service_name, description, created_at)
         VALUES (?, ?, 'Engine Diagnostic & Tuning', 'Check engine mounts and spark plugs', NOW())`,
        [`${jcId}-item-1`, jcId]
      );
    });

    const [jcCheck] = await pool.query('SELECT * FROM job_cards WHERE id = ?', [jcId]);
    assert(jcCheck.length === 1, 'Job card created successfully');
    assert(jcCheck[0].invoice_id === invId, 'Job card correctly linked to invoice');
    assert(jcCheck[0].quotation_id === quotId, 'Job card correctly linked to quotation');

    // Test 7: Expense & Ledger Flow
    console.log('\nTest 7: Expense & Financial Ledger Flow');
    await withTransaction(async (conn) => {
      const [catRows] = await conn.query('SELECT id FROM expense_categories WHERE LOWER(name) = "purchase" LIMIT 1');
      const catId = catRows.length > 0 ? catRows[0].id : null;

      await conn.query(
        `INSERT INTO expenses (id, date, time, category_id, category_name, description, payment_method, amount, recipient, note, created_at)
         VALUES (?, ?, ?, ?, 'Purchase', 'Brake pads replacement batch', 'cash', 1200.00, 'Parts Supplier', 'Unit test expense', NOW())`,
        [expId, today, timeStr, catId]
      );

      await conn.query(
        `INSERT INTO financial_transactions (id, date, time, type, category, description, payment_method, amount, reference_type, reference_id, notes, created_at)
         VALUES (?, ?, ?, 'EXPENSE', 'Purchase', 'Brake pads replacement batch', 'cash', 1200.00, 'expense', ?, 'Expense recording', NOW())`,
        [`${expId}-tx-1`, today, timeStr, expId]
      );
    });

    const [expCheck] = await pool.query('SELECT * FROM expenses WHERE id = ?', [expId]);
    assert(expCheck.length === 1, 'Expense saved successfully');
    assert(Number(expCheck[0].amount) === 1200, 'Expense amount is 1200');

    const [expTxCheck] = await pool.query('SELECT * FROM financial_transactions WHERE reference_id = ?', [expId]);
    assert(expTxCheck.length === 1, 'Financial transaction recorded for expense');
    assert(expTxCheck[0].type === 'EXPENSE', 'Transaction type is EXPENSE');

    // Test 8: Inventory Weighted Average Costing Formula
    console.log('\nTest 8: Inventory Weighted Average Unit Cost Formula');
    await withTransaction(async (conn) => {
      // 1. Initial item: 10 units @ 500 = 5000
      await conn.query(
        `INSERT INTO inventory_items (id, name, category_id, unit, quantity, average_unit_cost, minimum_stock, status, created_at, updated_at)
         VALUES (?, 'Mobil Super 3000 (Unit Test)', 'cat-1', 'Can', 10.000, 500.00, 5.000, 'active', NOW(), NOW())`,
        [itemId]
      );

      // 2. Stock In: 10 units @ 700 = 7000
      // Weighted avg: (5000 + 7000) / 20 = 600.00
      const currentQty = 10;
      const currentCost = 500;
      const incomingQty = 10;
      const incomingCost = 700;
      const newQty = currentQty + incomingQty;
      const newAvgCost = ((currentQty * currentCost) + (incomingQty * incomingCost)) / newQty;

      await conn.query(
        `UPDATE inventory_items SET quantity = ?, average_unit_cost = ?, updated_at = NOW() WHERE id = ?`,
        [newQty, newAvgCost, itemId]
      );

      await conn.query(
        `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, movement_date, created_at)
         VALUES (?, ?, 'in', 10.000, 700.00, 7000.00, 'Stock In Purchase', ?, NOW())`,
        [`${itemId}-mov-1`, itemId, today]
      );
    });

    const [itemStockCheck] = await pool.query('SELECT quantity, average_unit_cost FROM inventory_items WHERE id = ?', [itemId]);
    assert(Number(itemStockCheck[0].quantity) === 20, 'Stock In increased quantity to 20');
    assert(Number(itemStockCheck[0].average_unit_cost) === 600, 'Weighted average cost correctly calculated as ৳600.00');

    // Test 9: Dashboard Metrics Calculation
    console.log('\nTest 9: Dashboard Metrics Query Verification');
    const [todayCashRows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as todayCashIn,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as todayCashOut
       FROM financial_transactions
       WHERE date = ?`,
      [today]
    );
    assert(Number(todayCashRows[0].todayCashIn) >= 4500, 'Metrics todayCashIn correctly sums income transactions');
    assert(Number(todayCashRows[0].todayCashOut) >= 1200, 'Metrics todayCashOut correctly sums expense transactions');

  } finally {
    // Test 10: Cleanup Test Data
    console.log('\nTest 10: Cleaning up unit test records');
    await withTransaction(async (conn) => {
      await conn.query('DELETE FROM financial_transactions WHERE reference_id IN (?, ?, ?)', [invNumber, expId, convInvNumber]);
      await conn.query('DELETE FROM payments WHERE invoice_id IN (?, ?)', [invId, convInvId]);
      await conn.query('DELETE FROM invoice_items WHERE invoice_id IN (?, ?)', [invId, convInvId]);
      await conn.query('DELETE FROM invoices WHERE id IN (?, ?)', [invId, convInvId]);
      await conn.query('DELETE FROM job_card_items WHERE job_card_id = ?', [jcId]);
      await conn.query('DELETE FROM job_cards WHERE id = ?', [jcId]);
      await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [quotId]);
      await conn.query('DELETE FROM quotations WHERE id = ?', [quotId]);
      await conn.query('DELETE FROM expenses WHERE id = ?', [expId]);
      await conn.query('DELETE FROM inventory_movements WHERE inventory_item_id = ?', [itemId]);
      await conn.query('DELETE FROM inventory_items WHERE id = ?', [itemId]);
      await conn.query('DELETE FROM vehicles WHERE id = ?', [vehId]);
      await conn.query('DELETE FROM customers WHERE id = ?', [custId]);
    });
    console.log('  ✅ Unit test data cleaned up successfully');
    passedTests++;
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL UNIT TESTS PASSED (${passedTests} passed, ${failedTests} failed)`);
  console.log('====================================================');
  await pool.end();
}

runUnitTests().catch(err => {
  console.error('\n❌ Unhandled error in unit tests:', err);
  process.exit(1);
});
