import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '165.99.74.72',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'nextpostmedia_garage',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nextpostmedia_garage',
  multipleStatements: true,
};

async function migrate() {
  console.log('🔄 Connecting to MySQL server at', dbConfig.host, '...');
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!');

    // Read schema.sql
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8');
    console.log('🔄 Executing schema migrations...');
    await connection.query(schemaSql);
    console.log('✅ All relational tables created or verified successfully!');

    // Ensure all required columns exist on job_cards table
    const [existingCols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_cards'
    `);
    const colNames = existingCols.map(c => c.COLUMN_NAME);
    if (!colNames.includes('expected_delivery_date')) {
      await connection.query('ALTER TABLE job_cards ADD COLUMN expected_delivery_date DATE NULL AFTER date');
    }
    if (!colNames.includes('customer_complaint')) {
      await connection.query('ALTER TABLE job_cards ADD COLUMN customer_complaint TEXT NULL AFTER status');
    }
    if (!colNames.includes('vehicle_condition')) {
      await connection.query('ALTER TABLE job_cards ADD COLUMN vehicle_condition TEXT NULL AFTER customer_complaint');
    }
    if (!colNames.includes('assigned_to')) {
      await connection.query('ALTER TABLE job_cards ADD COLUMN assigned_to VARCHAR(191) NULL');
    }
    if (!colNames.includes('quotation_id')) {
      await connection.query('ALTER TABLE job_cards ADD COLUMN quotation_id VARCHAR(50) NULL');
    }
    if (!colNames.includes('invoice_id')) {
      await connection.query('ALTER TABLE job_cards ADD COLUMN invoice_id VARCHAR(50) NULL');
    }
    console.log('✅ job_cards table schema synchronized with all columns.');

    // Simplify job_cards.status down to just 'in_progress' / 'completed'
    const [statusColRows] = await connection.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_cards' AND COLUMN_NAME = 'status'
    `);
    const currentStatusType = statusColRows[0]?.COLUMN_TYPE || '';
    if (currentStatusType.includes('waiting') || currentStatusType.includes('delivered') || currentStatusType.includes('cancelled')) {
      console.log('🔄 Simplifying job_cards.status to In Progress / Completed...');
      await connection.query(`UPDATE job_cards SET status = 'in_progress' WHERE status IN ('waiting', 'cancelled')`);
      await connection.query(`UPDATE job_cards SET status = 'completed' WHERE status = 'delivered'`);
      await connection.query(`ALTER TABLE job_cards MODIFY COLUMN status ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress'`);
      console.log('✅ job_cards.status simplified.');
    }

    // Ensure leads table supports Facebook-sourced leads (no phone, has a PSID)
    const [leadCols] = await connection.query(`
      SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads'
    `);
    const leadColNames = leadCols.map(c => c.COLUMN_NAME);
    if (!leadColNames.includes('fb_psid')) {
      await connection.query('ALTER TABLE leads ADD COLUMN fb_psid VARCHAR(100) NULL AFTER status');
      await connection.query('ALTER TABLE leads ADD INDEX idx_leads_fb_psid (fb_psid)');
      console.log('✅ Added leads.fb_psid column.');
    }
    const phoneCol = leadCols.find(c => c.COLUMN_NAME === 'phone');
    if (phoneCol && phoneCol.IS_NULLABLE === 'NO') {
      await connection.query('ALTER TABLE leads MODIFY COLUMN phone VARCHAR(50) NULL');
      console.log('✅ Made leads.phone nullable (Facebook leads may have no phone).');
    }

    // Seed Settings
    console.log('🔄 Checking settings...');
    const defaultSettings = [
      ['business_name', 'Arshi Automobile & Car Hub'],
      ['phone', '01712110902'],
      ['alt_phone', '01712345678'],
      ['address', 'Bhadra Mor, Station Road, Rajshahi, Bangladesh'],
      ['email', 'arshi.autohub@gmail.com'],
      ['invoice_prefix', 'INV-'],
      ['quotation_prefix', 'QT-'],
      ['job_card_prefix', 'JC-'],
      ['default_footer_text', 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.'],
      ['currency_symbol', '৳'],
    ];
    for (const [key, val] of defaultSettings) {
      await connection.query(
        `INSERT INTO settings (id, setting_key, setting_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [`set_${key}`, key, val]
      );
    }
    console.log('✅ Business settings configured.');

    // Seed Expense Categories
    const expenseCategories = ['Salary', 'Purchase', 'Food', 'Rent', 'Loan Repayment', 'Other'];
    for (const cat of expenseCategories) {
      const id = `exp_cat_${cat.toLowerCase().replace(/\s+/g, '_')}`;
      await connection.query(
        `INSERT IGNORE INTO expense_categories (id, name, status) VALUES (?, ?, 'active')`,
        [id, cat]
      );
    }
    console.log('✅ Expense categories seeded.');

    // Seed Inventory Categories
    const invCategories = [
      'Engine Oil', 'Filters', 'Car Wash', 'Polish & Detailing',
      'Spare Parts', 'Electrical', 'Dent & Paint', 'Other'
    ];
    const catIdMap = {};
    for (let i = 0; i < invCategories.length; i++) {
      const cat = invCategories[i];
      const id = `cat-${i + 1}`;
      catIdMap[cat] = id;
      await connection.query(
        `INSERT IGNORE INTO inventory_categories (id, name, status) VALUES (?, ?, 'active')`,
        [id, cat]
      );
    }
    console.log('✅ Inventory categories seeded.');

    // Seed Services Catalog
    const initialServices = [
      { id: 'srv-1', name: 'Foam Wash', default_price: 500.00, category: 'Washing', description: 'High-pressure snow foam body wash & rinse' },
      { id: 'srv-2', name: 'Interior Cleaning', default_price: 800.00, category: 'Detailing', description: 'Deep dashboard, seat & carpet cleaning' },
      { id: 'srv-3', name: 'Vacuum Cleaning', default_price: 400.00, category: 'Washing', description: 'Interior vacuuming and dust removal' },
      { id: 'srv-4', name: 'Engine Room Cleaning', default_price: 600.00, category: 'Detailing', description: 'Engine bay degreasing and shine' },
      { id: 'srv-5', name: 'Tyre Shining & Polish', default_price: 200.00, category: 'Detailing', description: 'Tyre dressing & alloy wheel cleaning' },
      { id: 'srv-6', name: 'Full Car Polish & Wax', default_price: 2500.00, category: 'Detailing', description: 'Machine body polish with premium paste wax' },
      { id: 'srv-7', name: 'Dent & Paint Touchup', default_price: 4500.00, category: 'Bodywork', description: 'Body panel dent removal & color matching' },
      { id: 'srv-8', name: 'Engine Oil & Filter Change', default_price: 3200.00, category: 'Mechanical', description: 'Synthetic oil replacement & OEM oil filter' },
      { id: 'srv-9', name: 'Full Periodic Car Servicing', default_price: 5000.00, category: 'Mechanical', description: 'Comprehensive 40-point vehicle inspection & tune-up' },
      { id: 'srv-10', name: 'Brake Pad Servicing & Replacement', default_price: 1800.00, category: 'Mechanical', description: 'Front/rear brake caliper cleaning & pad replacement' },
      { id: 'srv-11', name: 'AC Master Servicing & Gas Top-up', default_price: 2800.00, category: 'AC & Cooling', description: 'Cooling coil wash, gas recharge & filter change' },
      { id: 'srv-12', name: 'Electrical Work & Wiring Check', default_price: 1500.00, category: 'Electrical', description: 'Fuse box, battery, alternator & lighting check' },
      { id: 'srv-13', name: 'Vehicle Inspection', default_price: 1000.00, category: 'General', description: 'Pre-purchase & fitness diagnostic check' },
      { id: 'srv-14', name: 'Other Custom Work', default_price: 1000.00, category: 'General', description: 'Custom repair or installation work' },
    ];
    for (const srv of initialServices) {
      await connection.query(
        `INSERT IGNORE INTO services (id, name, category, description, default_price, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [srv.id, srv.name, srv.category, srv.description, srv.default_price]
      );
    }
    console.log('✅ Services catalog seeded.');

    // Seed Demo Customers & Vehicles if table is empty
    const [custRows] = await connection.query('SELECT COUNT(*) as count FROM customers');
    if (custRows[0].count === 0) {
      console.log('🔄 Seeding initial customers and vehicles...');
      const demoCustomers = [
        {
          id: 'cust-1',
          name: 'Md. Rahim Uddin',
          phone: '01712-345678',
          address: 'Kazihata, Rajshahi',
          vehicles: [
            { id: 'veh-1', reg: 'Rajshahi Metro-Ga 11-4521', model: 'Toyota Axio 2017' }
          ]
        },
        {
          id: 'cust-2',
          name: 'Engr. Tariqul Islam',
          phone: '01819-876543',
          address: 'Uposhahar, Rajshahi',
          vehicles: [
            { id: 'veh-2', reg: 'Dhaka Metro-Gha 21-8930', model: 'Honda Vezel Hybrid' }
          ]
        },
        {
          id: 'cust-3',
          name: 'Dr. Anisur Rahman',
          phone: '01723-998877',
          address: 'Laxmipur, Rajshahi',
          vehicles: [
            { id: 'veh-3', reg: 'Rajshahi Metro-Kha 12-1044', model: 'Toyota Allion 2018' }
          ]
        },
        {
          id: 'cust-4',
          name: 'Farhan Ahmed',
          phone: '01911-554433',
          address: 'Talaimari, Rajshahi',
          vehicles: [
            { id: 'veh-4', reg: 'Dhaka Metro-Ga 33-7721', model: 'Toyota Premio 2019' }
          ]
        },
        {
          id: 'cust-5',
          name: 'Advocate Shamsul Huda',
          phone: '01715-667788',
          address: 'Alokar Mor, Rajshahi',
          vehicles: [
            { id: 'veh-5', reg: 'Rajshahi Metro-Ga 14-9902', model: 'Mitsubishi Outlander' }
          ]
        }
      ];

      for (const c of demoCustomers) {
        await connection.query(
          `INSERT INTO customers (id, name, phone, address, status, created_at)
           VALUES (?, ?, ?, ?, 'active', NOW())`,
          [c.id, c.name, c.phone, c.address]
        );
        for (const v of c.vehicles) {
          await connection.query(
            `INSERT INTO vehicles (id, customer_id, registration_number, model, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [v.id, c.id, v.reg, v.model]
          );
        }
      }
      console.log('✅ Demo customers and vehicles seeded.');
    }

    // Seed Demo Inventory Items if table is empty
    const [invRows] = await connection.query('SELECT COUNT(*) as count FROM inventory_items');
    if (invRows[0].count === 0) {
      console.log('🔄 Seeding demo inventory items and stock movements...');
      const demoItems = [
        { id: 'item-1', name: 'Mobil Super 2000 5W-30 (4L)', cat: 'Engine Oil', unit: 'Can', qty: 18, cost: 3200, min: 5 },
        { id: 'item-2', name: 'Castrol Magnatec 10W-40 (4L)', cat: 'Engine Oil', unit: 'Can', qty: 12, cost: 2800, min: 4 },
        { id: 'item-3', name: 'Toyota Genuine Oil Filter (90915-YZZE1)', cat: 'Filters', unit: 'Piece', qty: 35, cost: 450, min: 10 },
        { id: 'item-4', name: 'Honda Genuine Oil Filter', cat: 'Filters', unit: 'Piece', qty: 22, cost: 550, min: 8 },
        { id: 'item-5', name: '3M Car Wash Shampoo (20L Drum)', cat: 'Car Wash', unit: 'Drum', qty: 4, cost: 4200, min: 2 },
        { id: 'item-6', name: 'Meguiar\'s Ultimate Liquid Wax (473ml)', cat: 'Polish & Detailing', unit: 'Bottle', qty: 8, cost: 2200, min: 3 },
        { id: 'item-7', name: 'Toyota Axio Front Brake Pads (Set)', cat: 'Spare Parts', unit: 'Set', qty: 6, cost: 1600, min: 3 },
        { id: 'item-8', name: 'Osram H4 Night Breaker 12V 60/55W', cat: 'Electrical', unit: 'Pair', qty: 15, cost: 950, min: 5 }
      ];

      for (const item of demoItems) {
        const catId = catIdMap[item.cat] || 'cat-1';
        await connection.query(
          `INSERT INTO inventory_items (id, name, category_id, unit, quantity, average_unit_cost, minimum_stock, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [item.id, item.name, catId, item.unit, item.qty, item.cost, item.min]
        );
        // Initial stock movement
        await connection.query(
          `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date)
           VALUES (?, ?, 'in', ?, ?, ?, 'Initial Stock', 'Opening inventory balance', CURDATE())`,
          [`mov-init-${item.id}`, item.id, item.qty, item.cost, item.qty * item.cost]
        );
      }
      console.log('✅ Demo inventory items seeded.');
    }

    // Seed Super Admin & Staff Users
    console.log('🔄 Checking users (Super Admin & Staff)...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const staffPasswordHash = await bcrypt.hash('staff123', 10);

    await connection.query(
      `INSERT INTO users (id, name, username, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), password_hash = VALUES(password_hash), status = 'active'`,
      ['usr-superadmin', 'Super Admin', 'admin', adminPasswordHash, 'super_admin']
    );

    await connection.query(
      `INSERT INTO users (id, name, username, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), password_hash = VALUES(password_hash), status = 'active'`,
      ['usr-staff', 'Service Staff', 'staff', staffPasswordHash, 'staff']
    );
    console.log('✅ Seeded users: admin (super_admin) & staff (staff).');

    // Seed Technicians
    console.log('🔄 Checking technicians...');
    const defaultTechs = [
      { id: 'tech-1', name: 'Karim', specialty: 'Engine & Mechanical', phone: '01712-111222' },
      { id: 'tech-2', name: 'Sohel', specialty: 'Dent & Paint', phone: '01819-333444' },
      { id: 'tech-3', name: 'Jalal', specialty: 'Electrical & AC', phone: '01911-555666' }
    ];
    for (const t of defaultTechs) {
      await connection.query(
        `INSERT INTO technicians (id, name, specialty, phone, status, created_at)
         VALUES (?, ?, ?, ?, 'active', NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), specialty = VALUES(specialty), phone = VALUES(phone), status = 'active'`,
        [t.id, t.name, t.specialty, t.phone]
      );
    }
    console.log('✅ Technicians seeded.');

    // Seed real Leads (Facebook/phone inquiries) if table is empty
    const [leadRows] = await connection.query('SELECT COUNT(*) as count FROM leads');
    if (leadRows[0].count === 0) {
      console.log('🔄 Seeding leads...');
      const initialLeads = [
        { name: 'অস্পষ্ট', phone: '01303-843154', note: 'দেখা করবেন' },
        { name: 'ইমতিয়াজ', phone: '01712-183309', note: 'শোরুম দেখতে ওয়ার্কশপে আসবে' },
        { name: 'ড. মিজানুল', phone: '01718-184748', note: 'শোরুম দেখতে আসবে, ওয়ার্কশপে আসবে' },
        { name: 'ড. আমিন', phone: '01865-068309', note: 'পলিশিং কাজ, রাজশাহীতে আসলে ওয়ার্কশপে আসবে' },
        { name: 'অস্পষ্ট', phone: '01788-114867', note: 'সামনের কিছু মেরামত করাতে চান' },
        { name: 'অস্পষ্ট', phone: '01344-765011', note: 'ফোন ধরেনি' },
        { name: 'অস্পষ্ট', phone: '01635-512950', note: 'ফোন ধরেনি' },
        { name: 'অস্পষ্ট', phone: '01776-116194', note: 'প্রয়োজন মনে হলে পরে ফোন দিবে' },
        { name: 'অস্পষ্ট', phone: '01711-054062', note: 'গাড়ির কাজের জন্য ওয়ার্কশপে আসবে' },
        { name: 'আশিক রহমান', phone: '01723-066630', note: 'গাড়ির পলিশ করাতে চান' },
        { name: 'কুশল আহমেদ', phone: '01789-120360', note: 'হুইল অ্যালাইনমেন্টসহ অন্যান্য কাজ করাতে চান' },
        { name: 'মোঃ আলম মন্ডল', phone: '01711-318563', note: 'শোরুম দেখতে এবং সময় নিয়ে আসবেন' },
        { name: 'মাস্টার', phone: '01635-512950', note: 'ফোন ধরেনি' },
        { name: 'মাহের খান', phone: '01722-587336', note: 'গাড়ির সমস্যা থাকলে ওয়ার্কশপে আসবে' },
        { name: 'তাহের', phone: '01717-821405', note: 'শোরুম দেখতে এবং সময় নিয়ে আসবে' },
        { name: 'কামরুল হাসান', phone: '01797-845739', note: 'ফোন ধরেনি' },
        { name: 'অস্পষ্ট', phone: '01725-955084', note: '২০/০৮/২০২৫ তারিখে ওয়ার্কশপে আসতে দেখেছে' },
        { name: 'অস্পষ্ট', phone: '01776-714993', note: 'শোরুম দেখতে এবং ওয়ার্কশপে আসবে' },
        { name: 'অস্পষ্ট', phone: '01714-591635', note: 'শোরুম দেখতে এবং সময় নিয়ে আসবে' },
        { name: 'আশরাফুল হক', phone: '01711-203146', note: 'গাড়ির কাজ করাতে চান, ওয়ার্কশপে আসবেন' },
      ];
      for (let i = 0; i < initialLeads.length; i++) {
        const lead = initialLeads[i];
        const leadNumber = `LD-${String(i + 1).padStart(4, '0')}`;
        await connection.query(
          `INSERT INTO leads (id, lead_number, customer_name, phone, source, status, lead_date, notes, created_at)
           VALUES (?, ?, ?, ?, 'Phone', 'New', CURDATE(), ?, NOW())`,
          [`lead-${i + 1}`, leadNumber, lead.name, lead.phone, lead.note]
        );
      }
      console.log('✅ Leads seeded.');
    }

    console.log('🎉 Migration and initial seeding completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
