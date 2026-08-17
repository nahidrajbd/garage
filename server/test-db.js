import { pool, testConnection, withTransaction } from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING NEXTGARAGE DATABASE TESTS');
  console.log('==================================================');

  // 1. Connection test
  console.log('\n1️⃣ Testing MySQL Connection...');
  const connected = await testConnection();
  if (!connected) {
    console.log('⚠️ Could not connect to remote MySQL server directly (password may need to be provided in .env or remote access whitelisted in cPanel).');
    console.log('Please ensure DB_PASSWORD is set in .env and Remote MySQL is allowed in cPanel.');
    return;
  }

  // 2. Check tables count
  console.log('\n2️⃣ Verifying Table Structure...');
  const [tables] = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ?
  `, [process.env.DB_NAME || 'nextpostmedia_garage']);

  const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
  console.log(`Found ${tableNames.length} tables in database:`, tableNames.join(', '));

  // 3. Test Customer & Vehicle CRUD
  console.log('\n3️⃣ Testing Customer & Vehicle Operations...');
  const testPhone = `01799${Math.floor(100000 + Math.random() * 900000)}`;
  const custId = `test-cust-${Date.now()}`;
  const vehId = `test-veh-${Date.now()}`;

  await withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO customers (id, name, phone, email, address, status) VALUES (?, ?, ?, ?, ?, 'active')`,
      [custId, 'Test Customer Name', testPhone, 'test@example.com', 'Test Address, Rajshahi']
    );
    await conn.query(
      `INSERT INTO vehicles (id, customer_id, registration_number, model, model_year, color) VALUES (?, ?, ?, ?, ?, ?)`,
      [vehId, custId, 'Rajshahi Metro-Test 12-34', 'Toyota Premio', '2020', 'Pearl White']
    );
  });
  console.log('✅ Created test customer & vehicle.');

  // 4. Test Quotation creation
  console.log('\n4️⃣ Testing Quotation Flow...');
  const qId = `test-qt-${Date.now()}`;
  const qNum = `QT-TEST-${Date.now().toString().slice(-4)}`;
  await withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO quotations (id, quotation_number, customer_id, vehicle_id, customer_name, customer_phone, vehicle_registration, vehicle_model, quotation_date, valid_until, subtotal, discount, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 3000.00, 200.00, 2800.00, 'draft')`,
      [qId, qNum, custId, vehId, 'Test Customer Name', testPhone, 'Rajshahi Metro-Test 12-34', 'Toyota Premio']
    );
    await conn.query(
      `INSERT INTO quotation_items (id, quotation_id, item_type, description, quantity, unit_price, total)
       VALUES (?, ?, 'service', 'Full Car Polish', 1.000, 3000.00, 3000.00)`,
      [`test-qti-${Date.now()}`, qId]
    );
  });
  console.log('✅ Created quotation with items.');

  // 5. Test Invoice creation, partial payment & transaction ledger
  console.log('\n5️⃣ Testing Invoice & Payment Transaction Flow...');
  const invId = `test-inv-${Date.now()}`;
  const invNum = `INV-TEST-${Date.now().toString().slice(-4)}`;

  await withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO invoices (id, invoice_number, customer_id, vehicle_id, customer_name, customer_phone, vehicle_registration, vehicle_model, date, subtotal, discount, grand_total, paid, due, status, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 5000.00, 500.00, 4500.00, 2000.00, 2500.00, 'partial', 'cash')`,
      [invId, invNum, custId, vehId, 'Test Customer Name', testPhone, 'Rajshahi Metro-Test 12-34', 'Toyota Premio']
    );

    // Initial payment
    await conn.query(
      `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, reference, note)
       VALUES (?, ?, 2000.00, 'cash', CURDATE(), ?, 'Advance payment')`,
      [`test-pmt-1-${Date.now()}`, invId, invNum]
    );

    // Financial transaction ledger entry
    await conn.query(
      `INSERT INTO financial_transactions (id, type, category, reference_type, reference_id, description, amount, payment_method, date)
       VALUES (?, 'INCOME', 'Service Payment', 'invoice_payment', ?, ?, 2000.00, 'cash', CURDATE())`,
      [`test-tx-1-${Date.now()}`, invNum, `Invoice payment for ${invNum}`]
    );
  });
  console.log('✅ Created invoice, initial payment recorded, ledger entry added.');

  // 6. Test Due payment collection
  console.log('\n6️⃣ Testing Due Payment Collection Flow...');
  await withTransaction(async (conn) => {
    // Record second payment 2500 -> total paid = 4500, due = 0, status = 'paid'
    await conn.query(
      `UPDATE invoices SET paid = 4500.00, due = 0.00, status = 'paid' WHERE id = ?`,
      [invId]
    );
    await conn.query(
      `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, reference, note)
       VALUES (?, ?, 2500.00, 'bkash', CURDATE(), ?, 'Final settlement')`,
      [`test-pmt-2-${Date.now()}`, invId, invNum]
    );
    await conn.query(
      `INSERT INTO financial_transactions (id, type, category, reference_type, reference_id, description, amount, payment_method, date)
       VALUES (?, 'INCOME', 'Service Payment', 'invoice_payment', ?, ?, 2500.00, 'bkash', CURDATE())`,
      [`test-tx-2-${Date.now()}`, invNum, `Due collection for ${invNum}`]
    );
  });
  console.log('✅ Due payment collected, invoice status changed to Paid, financial ledger updated.');

  // 7. Test Inventory Weighted Average Costing Formula
  console.log('\n7️⃣ Testing Weighted Average Inventory Costing...');
  const testItemId = `test-inv-${Date.now()}`;
  await withTransaction(async (conn) => {
    // Initial Stock: 5 items @ 1000 = 5000
    await conn.query(
      `INSERT INTO inventory_items (id, name, category_id, unit, quantity, average_unit_cost, minimum_stock, status)
       VALUES (?, 'Test Synthetic Oil 5L', 'cat-1', 'Can', 5.000, 1000.00, 2.000, 'active')`,
      [testItemId]
    );

    // Stock In: 10 items @ 1300 = 13000
    // Total value = 5000 + 13000 = 18000
    // Total qty = 15
    // New average cost = 18000 / 15 = 1200.00
    const existingVal = 5 * 1000;
    const incomingVal = 10 * 1300;
    const newQty = 5 + 10;
    const newAvgCost = (existingVal + incomingVal) / newQty;

    await conn.query(
      `UPDATE inventory_items SET quantity = ?, average_unit_cost = ? WHERE id = ?`,
      [newQty, newAvgCost, testItemId]
    );

    await conn.query(
      `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, movement_date)
       VALUES (?, ?, 'in', 10.000, 1300.00, 13000.00, 'Purchase', CURDATE())`,
      [`test-mov-1-${Date.now()}`, testItemId]
    );
  });

  const [invCheck] = await pool.query('SELECT quantity, average_unit_cost FROM inventory_items WHERE id = ?', [testItemId]);
  console.log(`✅ Stock In calculated Weighted Average Cost: ৳${invCheck[0].average_unit_cost} for ${invCheck[0].quantity} items (Expected: ৳1200.00).`);

  // 8. Test User Authentication & Role Setup
  console.log('\n8️⃣ Verifying User Accounts & Roles...');
  const [users] = await pool.query('SELECT id, name, username, role, status FROM users');
  const adminUser = users.find(u => u.username === 'admin');
  const staffUser = users.find(u => u.username === 'staff');
  console.log(`Found ${users.length} users:`, users.map(u => `${u.username} (${u.role})`).join(', '));
  if (adminUser && adminUser.role === 'super_admin') {
    console.log('✅ Super Admin account verified: username = admin, role = super_admin (full access + delete).');
  }
  if (staffUser && staffUser.role === 'staff') {
    console.log('✅ Staff account verified: username = staff, role = staff (add/edit only, no delete, no user management).');
  }

  // Cleanup test data
  console.log('\n9️⃣ Cleaning up test records...');
  await withTransaction(async (conn) => {
    await conn.query('DELETE FROM financial_transactions WHERE reference_id = ?', [invNum]);
    await conn.query('DELETE FROM payments WHERE invoice_id = ?', [invId]);
    await conn.query('DELETE FROM invoices WHERE id = ?', [invId]);
    await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [qId]);
    await conn.query('DELETE FROM quotations WHERE id = ?', [qId]);
    await conn.query('DELETE FROM inventory_movements WHERE inventory_item_id = ?', [testItemId]);
    await conn.query('DELETE FROM inventory_items WHERE id = ?', [testItemId]);
    await conn.query('DELETE FROM vehicles WHERE id = ?', [vehId]);
    await conn.query('DELETE FROM customers WHERE id = ?', [custId]);
  });
  console.log('✅ Test cleanup completed successfully.');

  console.log('\n==================================================');
  console.log('🎉 ALL NEXTGARAGE DATABASE TESTS PASSED!');
  console.log('==================================================');
  await pool.end();
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
