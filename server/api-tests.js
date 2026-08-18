import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './index.js';
import { pool, withTransaction } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✅ ${message}`);
    passed++;
  }
}

async function runApiTests() {
  console.log('====================================================');
  console.log('🌐 NEXTGARAGE HTTP API INTEGRATION TESTS');
  console.log('====================================================\n');

  const testPort = 5055;
  const server = app.listen(testPort);
  const baseUrl = `http://localhost:${testPort}/api`;

  const testSuffix = Date.now();
  const testPhone = `01712${String(testSuffix).slice(-6)}`;
  let createdInvoiceId = null;
  let createdQuotationId = null;
  let createdJobCardId = null;
  let createdExpenseId = null;
  let createdCashInId = null;

  try {
    // 1. Health check
    console.log('API Test 1: Health Check endpoint');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returned HTTP 200');
    assert(healthData.status === 'ok', 'Health status is ok');

    // 2. Create Invoice
    console.log('\nAPI Test 2: POST /api/invoices (Invoice saving test)');
    const invPayload = {
      invoiceNumber: `INV-API-${String(testSuffix).slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      customerName: 'API Test Customer',
      customerPhone: testPhone,
      vehicleRegistration: 'Rajshahi Metro-Test 44-55',
      vehicleModel: 'Toyota Premio 2021',
      items: [
        { serviceName: 'Engine Oil & Filter Change', price: 3200, quantity: 1 },
        { serviceName: 'Full Car Polish & Wax', price: 2500, quantity: 1 }
      ],
      subtotal: 5700,
      discount: 700,
      grandTotal: 5000,
      paid: 3000,
      due: 2000,
      status: 'Partial',
      paymentMethod: 'Cash',
      notes: 'API integration test invoice'
    };

    const invRes = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invPayload)
    });
    const invData = await invRes.json();
    assert(invRes.status === 201, `Invoice creation returned HTTP 201 (Got ${invRes.status})`);
    assert(invData.id && invData.id.startsWith('inv-'), 'Invoice ID returned');
    assert(invData.grandTotal === 5000, 'Invoice grandTotal matches 5000');
    assert(invData.paid === 3000, 'Invoice paid matches 3000');
    assert(invData.due === 2000, 'Invoice due matches 2000');
    assert(invData.status === 'Partial', 'Invoice status is Partial');
    assert(invData.items.length === 2, '2 invoice items created');
    createdInvoiceId = invData.id;

    // 3. Get Invoice by ID
    console.log('\nAPI Test 3: GET /api/invoices/:id');
    const getInvRes = await fetch(`${baseUrl}/invoices/${createdInvoiceId}`);
    const getInvData = await getInvRes.json();
    assert(getInvRes.status === 200, 'GET invoice returned HTTP 200');
    assert(getInvData.id === createdInvoiceId, 'Fetched correct invoice');
    assert(getInvData.items.length === 2, 'Fetched invoice items');

    // 4. Record Due Payment on Invoice
    console.log('\nAPI Test 4: POST /api/invoices/:id/payments');
    const payRes = await fetch(`${baseUrl}/invoices/${createdInvoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 2000,
        paymentMethod: 'bKash',
        note: 'Full settlement via bKash'
      })
    });
    const payData = await payRes.json();
    assert(payRes.status === 200, 'Payment recorded successfully with HTTP 200');
    assert(payData.paid === 5000, 'Invoice paid amount is now 5000');
    assert(payData.due === 0, 'Invoice due is now 0');
    assert(payData.status === 'Paid', 'Invoice status updated to Paid');

    // 5. Create Quotation & Convert to Invoice
    console.log('\nAPI Test 5: POST /api/quotations and Convert to Invoice');
    const quotRes = await fetch(`${baseUrl}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quotationNumber: `QT-API-${String(testSuffix).slice(-4)}`,
        customerName: 'API Test Customer',
        customerPhone: testPhone,
        vehicleRegistration: 'Rajshahi Metro-Test 44-55',
        vehicleModel: 'Toyota Premio 2021',
        items: [{ serviceName: 'AC Master Servicing & Gas Top-up', unitPrice: 2800, quantity: 1 }],
        subtotal: 2800,
        discount: 300,
        grandTotal: 2500,
        status: 'Draft'
      })
    });
    const quotData = await quotRes.json();
    assert(quotRes.status === 201, 'Quotation created successfully');
    createdQuotationId = quotData.id;

    const convRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const convData = await convRes.json();
    assert(convRes.status === 200, 'Quotation converted to invoice successfully');
    assert(convData.id && convData.id.startsWith('inv-'), 'Converted invoice generated');
    assert(convData.grandTotal === 2500, 'Converted invoice grandTotal is 2500');

    // 6. Create Job Card
    console.log('\nAPI Test 6: POST /api/job-cards');
    const jcRes = await fetch(`${baseUrl}/job-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobCardNumber: `JC-API-${String(testSuffix).slice(-4)}`,
        customerName: 'API Test Customer',
        customerPhone: testPhone,
        vehicleRegistration: 'Rajshahi Metro-Test 44-55',
        vehicleModel: 'Toyota Premio 2021',
        mileage: '32000 km',
        status: 'Waiting',
        customerComplaint: 'AC not cooling properly',
        vehicleCondition: 'Clean',
        assignedTo: 'Jalal',
        requiredWork: [{ serviceName: 'AC Master Servicing & Gas Top-up' }]
      })
    });
    const jcData = await jcRes.json();
    assert(jcRes.status === 201, 'Job card created successfully');
    createdJobCardId = jcData.id;

    // 7. Create Expense
    console.log('\nAPI Test 7: POST /api/expenses');
    const expRes = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Purchase',
        description: 'AC Gas Bottle 134a',
        paymentMethod: 'Cash',
        amount: 3500,
        recipient: 'Refrigerant Shop',
        note: 'Unit test API expense'
      })
    });
    const expData = await expRes.json();
    assert(expRes.status === 201, 'Expense created successfully');
    assert(expData.amount === 3500, 'Expense amount is 3500');
    createdExpenseId = expData.id;

    // 8. Create Cash In
    console.log('\nAPI Test 8: POST /api/transactions/cash-in');
    const cinRes = await fetch(`${baseUrl}/transactions/cash-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Other Income',
        description: 'Scrap battery sale',
        paymentMethod: 'Cash',
        amount: 800,
        reference: 'SCRAP-01'
      })
    });
    const cinData = await cinRes.json();
    assert(cinRes.status === 201, 'Cash In created successfully');
    assert(cinData.amount === 800, 'Cash In amount is 800');
    createdCashInId = cinData.id;

    // 9. Dashboard Metrics
    console.log('\nAPI Test 9: GET /api/metrics');
    const metricRes = await fetch(`${baseUrl}/metrics`);
    const metricData = await metricRes.json();
    assert(metricRes.status === 200, 'Metrics retrieved successfully');
    assert(typeof metricData.todayCashIn === 'number', 'Metrics has todayCashIn');
    assert(typeof metricData.todayCashOut === 'number', 'Metrics has todayCashOut');
    assert(typeof metricData.totalCustomers === 'number', 'Metrics has totalCustomers');

  } finally {
    // Cleanup API test data
    console.log('\nAPI Test 10: Cleaning up created API test records');
    await withTransaction(async (conn) => {
      if (createdCashInId) await conn.query('DELETE FROM financial_transactions WHERE id = ?', [createdCashInId]);
      if (createdExpenseId) {
        await conn.query('DELETE FROM expenses WHERE id = ?', [createdExpenseId]);
        await conn.query('DELETE FROM financial_transactions WHERE reference_id = ?', [createdExpenseId]);
      }
      if (createdJobCardId) {
        await conn.query('DELETE FROM job_card_items WHERE job_card_id = ?', [createdJobCardId]);
        await conn.query('DELETE FROM job_cards WHERE id = ?', [createdJobCardId]);
      }
      if (createdQuotationId) {
        await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [createdQuotationId]);
        await conn.query('DELETE FROM quotations WHERE id = ?', [createdQuotationId]);
      }
      if (createdInvoiceId) {
        await conn.query('DELETE FROM payments WHERE invoice_id = ?', [createdInvoiceId]);
        await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [createdInvoiceId]);
        await conn.query('DELETE FROM invoices WHERE id = ?', [createdInvoiceId]);
        await conn.query('DELETE FROM financial_transactions WHERE reference_id = ?', [`INV-API-${String(testSuffix).slice(-4)}`]);
      }
      await conn.query('DELETE FROM customers WHERE phone = ?', [testPhone]);
    });
    console.log('  ✅ API test data cleaned up');
    server.close();
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL HTTP API INTEGRATION TESTS PASSED (${passed} passed, ${failed} failed)`);
  console.log('====================================================');
  await pool.end();
  process.exit(0);
}

runApiTests().catch(err => {
  console.error('\n❌ Unhandled error in API tests:', err);
  process.exit(1);
});
