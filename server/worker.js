import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function withDb(env, fn) {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '165.99.74.72',
    port: parseInt(env.DB_PORT || '3306', 10),
    user: env.DB_USER || 'nextpostmedia',
    password: env.DB_PASSWORD || 'ycs-iymH3ybo',
    database: env.DB_NAME || 'nextpostmedia_garage',
    disableEval: true,
  });
  try {
    return await fn(conn);
  } finally {
    try {
      await conn.end();
    } catch {}
  }
}

async function withTransaction(env, fn) {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '165.99.74.72',
    port: parseInt(env.DB_PORT || '3306', 10),
    user: env.DB_USER || 'nextpostmedia',
    password: env.DB_PASSWORD || 'ycs-iymH3ybo',
    database: env.DB_NAME || 'nextpostmedia_garage',
    disableEval: true,
  });
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    try {
      await conn.end();
    } catch {}
  }
}

function getUser(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const secret = env.JWT_SECRET || 'nextgarage_super_secret_jwt_key_2026';
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function jsonResponse(data, status = 200, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

const statusMapToFrontend = {
  waiting: 'Waiting',
  in_progress: 'In Progress',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusMapToDb = {
  Waiting: 'waiting',
  'In Progress': 'in_progress',
  Completed: 'completed',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ----------------------------------------------------
    // HEALTH CHECK
    // ----------------------------------------------------
    if (path === '/api/health') {
      try {
        await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT 1 as connected');
          return rows;
        });
        return jsonResponse({ status: 'ok', mysql: 'connected', timestamp: new Date().toISOString() }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ status: 'error', message: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    if (path === '/api/auth/login' && method === 'POST') {
      try {
        const { username, password } = await request.json();
        if (!username || !password) {
          return jsonResponse({ error: 'Username and password are required' }, 400, corsHeaders);
        }

        const user = await withDb(env, async (conn) => {
          const [users] = await conn.query(
            'SELECT id, name, username, password_hash, role, status FROM users WHERE LOWER(username) = ?',
            [username.trim().toLowerCase()]
          );
          return users.length > 0 ? users[0] : null;
        });

        if (!user) {
          return jsonResponse({ error: 'Invalid username or password' }, 401, corsHeaders);
        }

        if (user.status !== 'active') {
          return jsonResponse({ error: 'Account is deactivated. Please contact Super Admin.' }, 403, corsHeaders);
        }

        let isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch && password === user.password_hash) {
          isMatch = true;
        }

        if (!isMatch) {
          return jsonResponse({ error: 'Invalid username or password' }, 401, corsHeaders);
        }

        const payload = {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };

        const secret = env.JWT_SECRET || 'nextgarage_super_secret_jwt_key_2026';
        const token = jwt.sign(payload, secret, { expiresIn: '7d' });

        return jsonResponse({ token, user: payload }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/auth/me' && method === 'GET') {
      const user = getUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
      try {
        const profile = await withDb(env, async (conn) => {
          const [users] = await conn.query('SELECT id, name, username, role, status, created_at FROM users WHERE id = ?', [user.id]);
          return users[0] || null;
        });
        if (!profile) return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
        return jsonResponse(profile, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // USER MANAGEMENT (Super Admin Only)
    // ----------------------------------------------------
    if (path === '/api/users' && method === 'GET') {
      const user = getUser(request, env);
      if (!user || user.role !== 'super_admin') {
        return jsonResponse({ error: 'Forbidden: Super Admin access required' }, 403, corsHeaders);
      }
      try {
        const users = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT id, name, username, role, status, created_at, updated_at FROM users ORDER BY created_at ASC');
          return rows;
        });
        return jsonResponse(users, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/users' && method === 'POST') {
      const user = getUser(request, env);
      if (!user || user.role !== 'super_admin') {
        return jsonResponse({ error: 'Forbidden: Super Admin access required' }, 403, corsHeaders);
      }
      try {
        const { name, username, password, role = 'staff' } = await request.json();
        if (!name || !username || !password) {
          return jsonResponse({ error: 'Name, username, and password are required' }, 400, corsHeaders);
        }
        const created = await withDb(env, async (conn) => {
          const [existing] = await conn.query('SELECT id FROM users WHERE LOWER(username) = ?', [username.trim().toLowerCase()]);
          if (existing.length > 0) throw new Error('Username is already in use');

          const id = `usr-${Date.now()}`;
          const hash = await bcrypt.hash(password, 10);
          await conn.query(
            'INSERT INTO users (id, name, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, "active", NOW())',
            [id, name.trim(), username.trim().toLowerCase(), hash, role === 'super_admin' ? 'super_admin' : 'staff']
          );
          return { id, name: name.trim(), username: username.trim().toLowerCase(), role, status: 'active' };
        });
        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // METRICS
    // ----------------------------------------------------
    if (path === '/api/metrics' && method === 'GET') {
      try {
        const metrics = await withDb(env, async (conn) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const monthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

          const [todayCashRows] = await conn.query(
            `SELECT 
              COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as todayCashIn,
              COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as todayCashOut
             FROM financial_transactions
             WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?`,
            [todayStr]
          );

          const [monthCashRows] = await conn.query(
            `SELECT 
              COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as monthIncome,
              COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as monthExpenses
             FROM financial_transactions
             WHERE DATE_FORMAT(date, '%Y-%m') = ?`,
            [monthPrefix]
          );

          const [custCount] = await conn.query('SELECT COUNT(*) as c FROM customers WHERE status = "active"');
          const [invCount] = await conn.query('SELECT COUNT(*) as c FROM invoices');
          const [quotRows] = await conn.query(
            `SELECT COUNT(*) as c FROM quotations WHERE status IN ('draft', 'sent', 'accepted')`
          );

          const [jcWaiting] = await conn.query(`SELECT COUNT(*) as c FROM job_cards WHERE status = 'waiting'`);
          const [jcProgress] = await conn.query(`SELECT COUNT(*) as c FROM job_cards WHERE status = 'in_progress'`);
          const [jcCompletedToday] = await conn.query(
            `SELECT COUNT(*) as c FROM job_cards WHERE status IN ('completed', 'delivered') AND DATE_FORMAT(date, '%Y-%m-%d') = ?`,
            [todayStr]
          );

          const [finRows] = await conn.query(`
            SELECT 
              COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalIncome,
              COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense
            FROM financial_transactions
          `);
          const [invSummary] = await conn.query(`
            SELECT 
              COALESCE(SUM(grand_total), 0) as totalBilled,
              COALESCE(SUM(paid), 0) as totalPaid,
              COALESCE(SUM(due), 0) as totalDue
            FROM invoices
          `);
          const [recentInvoices] = await conn.query(`
            SELECT id, invoice_number as invoiceNumber, customer_name as customerName, date, grand_total as grandTotal, paid, due, status, payment_method as paymentMethod
            FROM invoices ORDER BY date DESC, created_at DESC LIMIT 5
          `);
          const [recentJobCards] = await conn.query(`
            SELECT id, job_card_number as jobCardNumber, customer_name as customerName, vehicle_model as vehicleModel, vehicle_registration as vehicleRegistration, date, status
            FROM job_cards ORDER BY date DESC, created_at DESC LIMIT 5
          `);

          const todayCashIn = Number(todayCashRows[0]?.todayCashIn) || 0;
          const todayCashOut = Number(todayCashRows[0]?.todayCashOut) || 0;
          const todayNet = todayCashIn - todayCashOut;

          const monthIncome = Number(monthCashRows[0]?.monthIncome) || 0;
          const monthExpenses = Number(monthCashRows[0]?.monthExpenses) || 0;
          const monthNet = monthIncome - monthExpenses;

          const waitingJobCardsCount = Number(jcWaiting[0]?.c) || 0;
          const inProgressJobCardsCount = Number(jcProgress[0]?.c) || 0;
          const activeJobCardsCount = waitingJobCardsCount + inProgressJobCardsCount;
          const completedTodayJobCardsCount = Number(jcCompletedToday[0]?.c) || 0;

          const tIncome = Number(finRows[0]?.totalIncome) || 0;
          const tExpense = Number(finRows[0]?.totalExpense) || 0;

          return {
            todayCashIn,
            todayCashOut,
            todayNet,
            monthIncome,
            monthExpenses,
            monthNet,
            totalCustomers: custCount[0]?.c || 0,
            totalActiveInvoices: invCount[0]?.c || 0,
            totalInvoices: invCount[0]?.c || 0,
            pendingQuotationsCount: Number(quotRows[0]?.c) || 0,
            activeJobCardsCount,
            waitingJobCardsCount,
            inProgressJobCardsCount,
            completedTodayJobCardsCount,
            totalBilled: Number(invSummary[0]?.totalBilled) || 0,
            totalPaid: Number(invSummary[0]?.totalPaid) || 0,
            totalDue: Number(invSummary[0]?.totalDue) || 0,
            totalIncome: tIncome,
            totalExpense: tExpense,
            netProfit: tIncome - tExpense,
            recentInvoices: recentInvoices.map(r => ({ ...r, grandTotal: Number(r.grandTotal), paid: Number(r.paid), due: Number(r.due) })),
            recentJobCards: recentJobCards.map(r => ({ ...r, status: statusMapToFrontend[r.status] || 'Waiting' })),
          };
        });
        return jsonResponse(metrics, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // SETTINGS & SERVICES
    // ----------------------------------------------------
    if (path === '/api/settings' && method === 'GET') {
      try {
        const settings = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT setting_key, setting_value FROM settings');
          const map = {};
          rows.forEach(r => { map[r.setting_key] = r.setting_value; });
          return {
            businessName: map.business_name || 'Arshi Automobile & Car Hub',
            phone: map.phone || '01712110902',
            altPhone: map.alt_phone || '01712345678',
            address: map.address || 'Bhadra Mor, Station Road, Rajshahi, Bangladesh',
            email: map.email || 'arshi.autohub@gmail.com',
            invoicePrefix: map.invoice_prefix || 'INV-',
            quotationPrefix: map.quotation_prefix || 'QT-',
            jobCardPrefix: map.job_card_prefix || 'JC-',
            defaultFooterText: map.default_footer_text || 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.',
            currencySymbol: map.currency_symbol || '৳',
          };
        });
        return jsonResponse(settings, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/settings' && method === 'PUT') {
      try {
        const updates = await request.json();
        const mapping = {
          businessName: 'business_name',
          phone: 'phone',
          altPhone: 'alt_phone',
          address: 'address',
          email: 'email',
          invoicePrefix: 'invoice_prefix',
          quotationPrefix: 'quotation_prefix',
          jobCardPrefix: 'job_card_prefix',
          defaultFooterText: 'default_footer_text',
          currencySymbol: 'currency_symbol',
        };

        const result = await withDb(env, async (conn) => {
          for (const [key, val] of Object.entries(updates)) {
            const dbKey = mapping[key] || key;
            await conn.query(
              `INSERT INTO settings (id, setting_key, setting_value) 
               VALUES (?, ?, ?) 
               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
              [`set_${dbKey}`, dbKey, String(val || '')]
            );
          }

          const [rows] = await conn.query('SELECT setting_key, setting_value FROM settings');
          const map = {};
          rows.forEach(r => { map[r.setting_key] = r.setting_value; });
          return {
            businessName: map.business_name || 'Arshi Automobile & Car Hub',
            phone: map.phone || '01712110902',
            altPhone: map.alt_phone || '01712345678',
            address: map.address || 'Bhadra Mor, Station Road, Rajshahi, Bangladesh',
            email: map.email || 'arshi.autohub@gmail.com',
            invoicePrefix: map.invoice_prefix || 'INV-',
            quotationPrefix: map.quotation_prefix || 'QT-',
            jobCardPrefix: map.job_card_prefix || 'JC-',
            defaultFooterText: map.default_footer_text || 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.',
            currencySymbol: map.currency_symbol || '৳',
          };
        });
        return jsonResponse(result, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/settings/services' && method === 'GET') {
      try {
        const services = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT id, name, category, description, default_price as defaultPrice FROM services WHERE status = "active" ORDER BY name ASC');
          return rows.map(r => ({ ...r, defaultPrice: Number(r.defaultPrice) || 0 }));
        });
        return jsonResponse(services, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/settings/services' && method === 'POST') {
      try {
        const { name, defaultPrice = 0, category, description } = await request.json();
        if (!name) return jsonResponse({ error: 'Service name is required' }, 400, corsHeaders);
        const id = `srv-${Date.now()}`;
        const price = Number(defaultPrice) || 0;
        await withDb(env, async (conn) => {
          await conn.query(
            'INSERT INTO services (id, name, category, description, default_price, status) VALUES (?, ?, ?, ?, ?, "active")',
            [id, name.trim(), category || null, description || null, price]
          );
        });
        return jsonResponse({ id, name: name.trim(), category, description, defaultPrice: price }, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/settings\/services\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete services.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[4];
        await withDb(env, async (conn) => {
          await conn.query('UPDATE services SET status = "inactive" WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // TECHNICIANS (WORKSHOP STAFF)
    // ----------------------------------------------------
    if (path === '/api/technicians' && method === 'GET') {
      try {
        const technicians = await withDb(env, async (conn) => {
          const [rows] = await conn.query(
            'SELECT id, name, specialty, phone, status, created_at FROM technicians WHERE status = "active" ORDER BY name ASC'
          );
          return rows.map(r => ({
            id: r.id,
            name: r.name,
            specialty: r.specialty || '',
            phone: r.phone || '',
            status: r.status,
            createdAt: r.created_at,
          }));
        });
        return jsonResponse(technicians, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/technicians' && method === 'POST') {
      try {
        const { name, specialty, phone } = await request.json();
        if (!name || !name.trim()) return jsonResponse({ error: 'Technician name is required' }, 400, corsHeaders);
        const id = `tech-${Date.now()}`;
        const created = await withDb(env, async (conn) => {
          await conn.query(
            'INSERT INTO technicians (id, name, specialty, phone, status, created_at) VALUES (?, ?, ?, ?, "active", NOW())',
            [id, name.trim(), specialty?.trim() || null, phone?.trim() || null]
          );
          return { id, name: name.trim(), specialty: specialty?.trim() || '', phone: phone?.trim() || '', status: 'active' };
        });
        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/technicians\/[^/]+$/) && method === 'PUT') {
      try {
        const id = path.split('/')[3];
        const { name, specialty, phone } = await request.json();
        if (!name || !name.trim()) return jsonResponse({ error: 'Technician name is required' }, 400, corsHeaders);
        const updated = await withDb(env, async (conn) => {
          await conn.query(
            'UPDATE technicians SET name = ?, specialty = ?, phone = ?, updated_at = NOW() WHERE id = ?',
            [name.trim(), specialty?.trim() || null, phone?.trim() || null, id]
          );
          return { id, name: name.trim(), specialty: specialty?.trim() || '', phone: phone?.trim() || '', status: 'active' };
        });
        return jsonResponse(updated, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/technicians\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete technicians.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        await withDb(env, async (conn) => {
          await conn.query('UPDATE technicians SET status = "inactive", updated_at = NOW() WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true, message: 'Technician deleted successfully' }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // CUSTOMERS
    // ----------------------------------------------------
    if (path === '/api/customers' && method === 'GET') {
      try {
        const customers = await withDb(env, async (conn) => {
          const [custs] = await conn.query('SELECT * FROM customers WHERE status = "active" ORDER BY created_at DESC');
          const [vehs] = await conn.query('SELECT * FROM vehicles');
          const [invoices] = await conn.query('SELECT customer_id, date FROM invoices ORDER BY date DESC');

          return custs.map(c => {
            const cVehs = vehs.filter(v => v.customer_id === c.id).map(v => ({
              id: v.id,
              customerId: v.customer_id,
              registrationNumber: v.registration_number || '',
              regNo: v.registration_number || '',
              make: v.make || '',
              model: v.model || '',
              year: v.model_year || '',
              color: v.color || '',
            }));
            const cInvs = invoices.filter(i => i.customer_id === c.id);
            return {
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              address: c.address,
              notes: c.notes,
              vehicles: cVehs,
              totalVisits: cInvs.length,
              lastServiceDate: cInvs.length > 0 ? (typeof cInvs[0].date === 'string' ? cInvs[0].date : new Date(cInvs[0].date).toISOString().split('T')[0]) : (c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : ''),
              createdAt: typeof c.created_at === 'string' ? c.created_at : (c.created_at ? new Date(c.created_at).toISOString() : ''),
            };
          });
        });
        return jsonResponse(customers, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/customers\/[^/]+$/) && method === 'GET') {
      try {
        const id = path.split('/')[3];
        const customer = await withDb(env, async (conn) => {
          const [custs] = await conn.query('SELECT * FROM customers WHERE id = ?', [id]);
          if (custs.length === 0) return null;
          const c = custs[0];
          const [vehs] = await conn.query('SELECT * FROM vehicles WHERE customer_id = ?', [id]);
          const [invoices] = await conn.query('SELECT customer_id, date FROM invoices WHERE customer_id = ? ORDER BY date DESC', [id]);
          return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address,
            notes: c.notes,
            vehicles: vehs.map(v => ({
              id: v.id,
              customerId: v.customer_id,
              registrationNumber: v.registration_number || '',
              regNo: v.registration_number || '',
              make: v.make || '',
              model: v.model || '',
              year: v.model_year || '',
              color: v.color || '',
            })),
            totalVisits: invoices.length,
            lastServiceDate: invoices.length > 0 ? (typeof invoices[0].date === 'string' ? invoices[0].date : new Date(invoices[0].date).toISOString().split('T')[0]) : '',
            createdAt: c.created_at,
          };
        });
        if (!customer) return jsonResponse({ error: 'Customer not found' }, 404, corsHeaders);
        return jsonResponse(customer, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/customers' && method === 'POST') {
      try {
        const body = await request.json();
        const created = await withTransaction(env, async (conn) => {
          const custId = `cust-${Date.now()}`;
          await conn.query(
            'INSERT INTO customers (id, name, phone, email, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "active", NOW())',
            [custId, body.name.trim(), body.phone.trim(), body.email || null, body.address || null, body.notes || null]
          );

          const vehicles = [];
          if (body.vehicles && Array.isArray(body.vehicles)) {
            for (const v of body.vehicles) {
              const reg = (v.registrationNumber || v.regNo || '').trim();
              if (reg) {
                const vId = v.id || `veh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
                await conn.query(
                  'INSERT INTO vehicles (id, customer_id, registration_number, make, model, model_year, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                  [vId, custId, reg, v.make || null, (v.model || 'Vehicle').trim(), v.year || null, v.color || null]
                );
                vehicles.push({ id: vId, customerId: custId, registrationNumber: reg, regNo: reg, make: v.make, model: (v.model || 'Vehicle').trim(), year: v.year, color: v.color });
              }
            }
          }
          return {
            id: custId,
            name: body.name.trim(),
            phone: body.phone.trim(),
            email: body.email,
            address: body.address,
            vehicles,
            totalVisits: 0,
            lastServiceDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
          };
        });
        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/customers\/[^/]+$/) && method === 'PUT') {
      try {
        const id = path.split('/')[3];
        const body = await request.json();
        const updated = await withTransaction(env, async (conn) => {
          await conn.query(
            'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = NOW() WHERE id = ?',
            [body.name.trim(), body.phone.trim(), body.email || null, body.address || null, body.notes || null, id]
          );
          if (body.vehicles && Array.isArray(body.vehicles)) {
            await conn.query('DELETE FROM vehicles WHERE customer_id = ?', [id]);
            for (const v of body.vehicles) {
              const vId = v.id || `veh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
              await conn.query(
                'INSERT INTO vehicles (id, customer_id, registration_number, make, model, model_year, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [vId, id, v.regNo.trim(), v.make || null, v.model.trim(), v.year || null, v.color || null]
              );
            }
          }
          return { id, ...body };
        });
        return jsonResponse(updated, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/customers\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete customers.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        await withDb(env, async (conn) => {
          await conn.query('DELETE FROM customers WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // JOB CARDS
    // ----------------------------------------------------
    if (path === '/api/job-cards' && method === 'GET') {
      try {
        const cards = await withDb(env, async (conn) => {
          const [jcRows] = await conn.query(
            `SELECT j.id, j.job_card_number as jobCardNumber, j.customer_id as customerId, j.vehicle_id as vehicleId,
                    j.customer_name as customerName, j.customer_phone as customerPhone,
                    j.vehicle_registration as vehicleRegistration, j.vehicle_model as vehicleModel,
                    j.mileage, DATE_FORMAT(j.date, '%Y-%m-%d') as date,
                    DATE_FORMAT(j.expected_delivery_date, '%Y-%m-%d') as expectedDeliveryDate,
                    j.status, j.customer_complaint as customerComplaint, j.vehicle_condition as vehicleCondition,
                    j.assigned_to as assignedTo, j.notes,
                    j.quotation_id as quotationId, j.invoice_id as invoiceId,
                    j.created_at as createdAt, j.updated_at as updatedAt
             FROM job_cards j
             ORDER BY j.created_at DESC`
          );
          const [items] = await conn.query('SELECT id, job_card_id as jobCardId, service_name as serviceName, description FROM job_card_items');
          const [photos] = await conn.query('SELECT id, job_card_id as jobCardId, photo_type as photoType, file_path as filePath FROM job_card_photos');

          return jcRows.map((j) => ({
            ...j,
            status: statusMapToFrontend[j.status] || 'Waiting',
            requiredWork: items.filter((it) => it.jobCardId === j.id),
            beforePhotos: photos.filter((p) => p.jobCardId === j.id && p.photoType === 'before').map((p) => p.filePath),
            afterPhotos: photos.filter((p) => p.jobCardId === j.id && p.photoType === 'after').map((p) => p.filePath),
            createdAt: typeof j.createdAt === 'string' ? j.createdAt : new Date(j.createdAt).toISOString(),
          }));
        });
        return jsonResponse(cards, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/job-cards\/[^/]+$/) && method === 'GET') {
      try {
        const id = path.split('/')[3];
        const card = await withDb(env, async (conn) => {
          const [rows] = await conn.query(
            `SELECT j.id, j.job_card_number as jobCardNumber, j.customer_id as customerId, j.vehicle_id as vehicleId,
                    j.customer_name as customerName, j.customer_phone as customerPhone,
                    j.vehicle_registration as vehicleRegistration, j.vehicle_model as vehicleModel,
                    j.mileage, DATE_FORMAT(j.date, '%Y-%m-%d') as date,
                    DATE_FORMAT(j.expected_delivery_date, '%Y-%m-%d') as expectedDeliveryDate,
                    j.status, j.customer_complaint as customerComplaint, j.vehicle_condition as vehicleCondition,
                    j.assigned_to as assignedTo, j.notes,
                    j.quotation_id as quotationId, j.invoice_id as invoiceId,
                    j.created_at as createdAt, j.updated_at as updatedAt
             FROM job_cards j
             WHERE j.id = ? OR j.job_card_number = ?`,
            [id, id]
          );
          if (rows.length === 0) return null;
          const jc = rows[0];
          const [items] = await conn.query('SELECT id, job_card_id as jobCardId, service_name as serviceName, description FROM job_card_items WHERE job_card_id = ?', [jc.id]);
          const [photos] = await conn.query('SELECT id, job_card_id as jobCardId, photo_type as photoType, file_path as filePath FROM job_card_photos WHERE job_card_id = ?', [jc.id]);

          return {
            ...jc,
            status: statusMapToFrontend[jc.status] || 'Waiting',
            requiredWork: items || [],
            beforePhotos: photos.filter((p) => p.photoType === 'before').map((p) => p.filePath),
            afterPhotos: photos.filter((p) => p.photoType === 'after').map((p) => p.filePath),
            createdAt: typeof jc.createdAt === 'string' ? jc.createdAt : new Date(jc.createdAt).toISOString(),
          };
        });
        if (!card) return jsonResponse({ error: 'Job card not found' }, 404, corsHeaders);
        return jsonResponse(card, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/job-cards' && method === 'POST') {
      try {
        const data = await request.json();
        const jcId = `jc-${Date.now()}`;
        const dbStatus = statusMapToDb[data.status] || 'waiting';

        const result = await withTransaction(env, async (conn) => {
          let customerId = data.customerId;
          let vehicleId = data.vehicleId;

          if (!customerId && data.customerPhone) {
            const [existingCust] = await conn.query('SELECT id FROM customers WHERE phone = ?', [data.customerPhone]);
            if (existingCust.length > 0) {
              customerId = existingCust[0].id;
            } else if (data.customerName) {
              customerId = `cust-${Date.now()}`;
              await conn.query(`INSERT INTO customers (id, name, phone, status, created_at) VALUES (?, ?, ?, 'active', NOW())`, [
                customerId,
                data.customerName,
                data.customerPhone,
              ]);
            }
          }

          if (customerId && data.vehicleRegistration) {
            const [existingVeh] = await conn.query(
              'SELECT id FROM vehicles WHERE customer_id = ? AND registration_number = ?',
              [customerId, data.vehicleRegistration]
            );
            if (existingVeh.length > 0) {
              vehicleId = existingVeh[0].id;
            } else {
              vehicleId = `veh-${Date.now()}`;
              await conn.query(
                `INSERT INTO vehicles (id, customer_id, registration_number, model, mileage, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [vehicleId, customerId, data.vehicleRegistration, data.vehicleModel || 'Vehicle', data.mileage || null]
              );
            }
          }

          let jcNumber = data.jobCardNumber;
          if (!jcNumber) {
            const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "job_card_prefix"');
            const prefix = setRows[0]?.setting_value || 'JC-';
            const [countRows] = await conn.query('SELECT COUNT(*) as count FROM job_cards');
            const nextSeq = (countRows[0]?.count || 0) + 1;
            jcNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
          }

          await conn.query(
            `INSERT INTO job_cards (
              id, job_card_number, customer_id, vehicle_id, customer_name, customer_phone,
              vehicle_registration, vehicle_model, mileage, date, expected_delivery_date,
              status, customer_complaint, vehicle_condition, assigned_to, notes,
              quotation_id, invoice_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              jcId,
              jcNumber,
              customerId || null,
              vehicleId || null,
              data.customerName || null,
              data.customerPhone || null,
              data.vehicleRegistration || null,
              data.vehicleModel || null,
              data.mileage || null,
              data.date || new Date().toISOString().split('T')[0],
              data.expectedDeliveryDate || null,
              dbStatus,
              data.customerComplaint || null,
              data.vehicleCondition || null,
              data.assignedTo || null,
              data.notes || null,
              data.quotationId || null,
              data.invoiceId || null,
            ]
          );

          const createdItems = [];
          if (Array.isArray(data.requiredWork)) {
            for (let i = 0; i < data.requiredWork.length; i++) {
              const item = data.requiredWork[i];
              const itemId = `jci-${Date.now()}-${i}`;
              await conn.query(
                `INSERT INTO job_card_items (id, job_card_id, service_name, description, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [itemId, jcId, item.serviceName, item.description || null]
              );
              createdItems.push({
                id: itemId,
                jobCardId: jcId,
                serviceName: item.serviceName,
                description: item.description,
              });
            }
          }

          if (Array.isArray(data.beforePhotos)) {
            for (let i = 0; i < data.beforePhotos.length; i++) {
              const pId = `jcp-b-${Date.now()}-${i}`;
              await conn.query(
                `INSERT INTO job_card_photos (id, job_card_id, photo_type, file_path, created_at)
                 VALUES (?, ?, 'before', ?, NOW())`,
                [pId, jcId, data.beforePhotos[i]]
              );
            }
          }

          if (Array.isArray(data.afterPhotos)) {
            for (let i = 0; i < data.afterPhotos.length; i++) {
              const pId = `jcp-a-${Date.now()}-${i}`;
              await conn.query(
                `INSERT INTO job_card_photos (id, job_card_id, photo_type, file_path, created_at)
                 VALUES (?, ?, 'after', ?, NOW())`,
                [pId, jcId, data.afterPhotos[i]]
              );
            }
          }

          return {
            ...data,
            id: jcId,
            jobCardNumber: jcNumber,
            customerId,
            vehicleId,
            status: data.status || 'Waiting',
            requiredWork: createdItems,
            beforePhotos: data.beforePhotos || [],
            afterPhotos: data.afterPhotos || [],
            createdAt: new Date().toISOString(),
          };
        });

        return jsonResponse(result, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/job-cards\/[^/]+$/) && method === 'PUT') {
      try {
        const id = path.split('/')[3];
        const data = await request.json();
        const dbStatus = statusMapToDb[data.status] || 'waiting';

        const result = await withTransaction(env, async (conn) => {
          await conn.query(
            `UPDATE job_cards SET
              customer_name = ?, customer_phone = ?, vehicle_registration = ?, vehicle_model = ?,
              mileage = ?, date = ?, expected_delivery_date = ?, status = ?, customer_complaint = ?,
              vehicle_condition = ?, assigned_to = ?, notes = ?, quotation_id = ?, invoice_id = ?,
              updated_at = NOW()
             WHERE id = ?`,
            [
              data.customerName || null,
              data.customerPhone || null,
              data.vehicleRegistration || null,
              data.vehicleModel || null,
              data.mileage || null,
              data.date || new Date().toISOString().split('T')[0],
              data.expectedDeliveryDate || null,
              dbStatus,
              data.customerComplaint || null,
              data.vehicleCondition || null,
              data.assignedTo || null,
              data.notes || null,
              data.quotationId || null,
              data.invoiceId || null,
              id,
            ]
          );

          if (Array.isArray(data.requiredWork)) {
            await conn.query('DELETE FROM job_card_items WHERE job_card_id = ?', [id]);
            for (let i = 0; i < data.requiredWork.length; i++) {
              const item = data.requiredWork[i];
              const itemId = item.id || `jci-${Date.now()}-${i}`;
              await conn.query(
                `INSERT INTO job_card_items (id, job_card_id, service_name, description, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [itemId, id, item.serviceName, item.description || null]
              );
            }
          }

          return { ...data, id };
        });

        return jsonResponse(result, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/job-cards\/[^/]+\/status$/) && method === 'PATCH') {
      try {
        const id = path.split('/')[3];
        const { status } = await request.json();
        const dbStatus = statusMapToDb[status] || 'waiting';
        await withDb(env, async (conn) => {
          await conn.query('UPDATE job_cards SET status = ?, updated_at = NOW() WHERE id = ?', [dbStatus, id]);
        });
        return jsonResponse({ success: true, status }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/job-cards\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete job cards.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        await withDb(env, async (conn) => {
          await conn.query('DELETE FROM job_cards WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // INVOICES
    // ----------------------------------------------------
    if (path === '/api/invoices' && method === 'GET') {
      try {
        const invoices = await withDb(env, async (conn) => {
          const [invRows] = await conn.query('SELECT * FROM invoices ORDER BY date DESC, created_at DESC');
          const [itemRows] = await conn.query('SELECT * FROM invoice_items ORDER BY sort_order ASC');
          const [pmtRows] = await conn.query('SELECT * FROM payments ORDER BY payment_date ASC');

          return invRows.map((inv) => {
            const items = itemRows.filter((i) => i.invoice_id === inv.id).map((i) => ({
              id: i.id,
              serviceName: i.description || 'Service',
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
              total: Number(i.total),
            }));
            const payments = pmtRows.filter((p) => p.invoice_id === inv.id).map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              method: p.payment_method === 'bkash' ? 'bKash' : p.payment_method === 'bank' ? 'Bank' : 'Cash',
              date: p.payment_date,
              reference: p.reference,
              notes: p.note,
            }));

            return {
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              quotationId: inv.quotation_id,
              jobCardId: inv.job_card_id,
              customerId: inv.customer_id,
              customerName: inv.customer_name,
              customerPhone: inv.customer_phone,
              vehicleId: inv.vehicle_id,
              vehicleRegistration: inv.vehicle_registration,
              vehicleModel: inv.vehicle_model,
              date: inv.date,
              items,
              subtotal: Number(inv.subtotal),
              discount: Number(inv.discount),
              grandTotal: Number(inv.grand_total),
              paid: Number(inv.paid),
              due: Number(inv.due),
              status: inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Due',
              paymentMethod: inv.payment_method === 'bkash' ? 'bKash' : inv.payment_method === 'bank' ? 'Bank' : 'Cash',
              payments,
              notes: inv.notes,
              createdAt: inv.created_at,
            };
          });
        });
        return jsonResponse(invoices, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/invoices\/[^/]+$/) && method === 'GET') {
      try {
        const id = path.split('/')[3];
        const invoice = await withDb(env, async (conn) => {
          const [invRows] = await conn.query('SELECT * FROM invoices WHERE id = ?', [id]);
          if (invRows.length === 0) return null;
          const inv = invRows[0];
          const [items] = await conn.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC', [id]);
          const [payments] = await conn.query('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date ASC', [id]);

          return {
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            customerId: inv.customer_id,
            customerName: inv.customer_name,
            customerPhone: inv.customer_phone,
            vehicleRegistration: inv.vehicle_registration,
            vehicleModel: inv.vehicle_model,
            date: inv.date,
            subtotal: Number(inv.subtotal),
            discount: Number(inv.discount),
            grandTotal: Number(inv.grand_total),
            paid: Number(inv.paid),
            due: Number(inv.due),
            status: inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Due',
            paymentMethod: inv.payment_method,
            items: items.map((i) => ({
              id: i.id,
              serviceName: i.description || 'Service',
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
              total: Number(i.total),
            })),
            payments: payments.map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              method: p.payment_method === 'bkash' ? 'bKash' : p.payment_method === 'bank' ? 'Bank' : 'Cash',
              date: p.payment_date,
              reference: p.reference,
            })),
          };
        });
        if (!invoice) return jsonResponse({ error: 'Invoice not found' }, 404, corsHeaders);
        return jsonResponse(invoice, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/invoices' && method === 'POST') {
      try {
        const body = await request.json();
        const created = await withTransaction(env, async (conn) => {
          const invId = `inv-${Date.now()}`;
          const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "invoice_prefix"');
          const prefix = setRows[0]?.setting_value || 'INV-';
          const [countRows] = await conn.query('SELECT COUNT(*) as count FROM invoices');
          const nextSeq = (countRows[0]?.count || 0) + 1;
          const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

          const grandTotal = Number(body.grandTotal) || 0;
          const paid = Number(body.paid) || 0;
          const due = Math.max(0, grandTotal - paid);
          const status = due === 0 ? 'paid' : paid > 0 ? 'partial' : 'due';
          const pMethod = (body.paymentMethod || 'cash').toLowerCase();

          await conn.query(
            `INSERT INTO invoices (id, invoice_number, quotation_id, job_card_id, customer_id, vehicle_id, customer_name, customer_phone, vehicle_registration, vehicle_model, vehicle_color, date, subtotal, discount, grand_total, paid, due, status, payment_method, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              invId,
              invoiceNumber,
              body.quotationId || null,
              body.jobCardId || null,
              body.customerId || null,
              body.vehicleId || null,
              body.customerName.trim(),
              body.customerPhone.trim(),
              body.vehicleRegistration.trim(),
              body.vehicleModel.trim(),
              body.vehicleColor || null,
              body.date || new Date().toISOString().split('T')[0],
              body.subtotal || 0,
              body.discount || 0,
              grandTotal,
              paid,
              due,
              status,
              pMethod,
              body.notes || null,
            ]
          );

          if (body.items && Array.isArray(body.items)) {
            for (let i = 0; i < body.items.length; i++) {
              const itm = body.items[i];
              await conn.query(
                `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [`ii-${Date.now()}-${i}`, invId, itm.type || 'service', itm.description || itm.serviceName || 'Service', itm.quantity || 1, itm.unitPrice || 0, itm.total || 0, i]
              );
            }
          }

          if (paid > 0) {
            const pmtId = `pmt-${Date.now()}`;
            await conn.query(
              `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, reference, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [pmtId, invId, paid, pMethod, body.date || new Date().toISOString().split('T')[0], invoiceNumber, 'Initial Payment']
            );
            await conn.query(
              `INSERT INTO financial_transactions (id, date, time, type, category, description, payment_method, amount, reference_type, reference_id, notes, created_at)
               VALUES (?, ?, ?, 'INCOME', 'Service Payment', ?, ?, ?, 'invoice_payment', ?, ?, NOW())`,
              [`tx-${Date.now()}`, body.date || new Date().toISOString().split('T')[0], null, `Payment for invoice ${invoiceNumber}`, pMethod, paid, invoiceNumber, 'Initial payment received']
            );
          }

          return { id: invId, invoiceNumber, ...body, grandTotal, paid, due, status };
        });
        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/invoices\/[^/]+\/payments$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const body = await request.json();
        const paymentAmount = Number(body.amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          return jsonResponse({ error: 'Valid payment amount is required' }, 400, corsHeaders);
        }

        const updated = await withTransaction(env, async (conn) => {
          const [invRows] = await conn.query('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?', [id, id]);
          if (invRows.length === 0) throw new Error('Invoice not found');
          const inv = invRows[0];

          const currentPaid = Number(inv.paid) || 0;
          const grandTotal = Number(inv.grand_total) || 0;
          const newPaid = Math.min(grandTotal, currentPaid + paymentAmount);
          const newDue = Math.max(0, grandTotal - newPaid);
          const newStatus = newDue === 0 ? 'paid' : 'partial';
          const pMethod = (body.paymentMethod || 'cash').toLowerCase();
          const today = new Date().toISOString().split('T')[0];
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          await conn.query('UPDATE invoices SET paid = ?, due = ?, status = ? WHERE id = ?', [newPaid, newDue, newStatus, inv.id]);

          const paymentId = `pmt-${Date.now()}`;
          await conn.query(
            `INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date, reference, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [paymentId, inv.id, paymentAmount, pMethod, today, inv.invoice_number, body.note || `Due collection for invoice ${inv.invoice_number}`]
          );

          await conn.query(
            `INSERT INTO financial_transactions (id, date, time, type, category, description, payment_method, amount, reference_type, reference_id, notes, created_at)
             VALUES (?, ?, ?, 'INCOME', 'Service Payment', ?, ?, ?, 'invoice_payment', ?, ?, NOW())`,
            [`tx-${Date.now()}`, today, timeStr, `Due Collection - ${inv.customer_name || 'Customer'} (${inv.vehicle_model || 'Vehicle'})`, pMethod, paymentAmount, inv.invoice_number, body.note || `Due payment collection for ${inv.invoice_number}`]
          );

          return { ...inv, paid: newPaid, due: newDue, status: statusMapToFrontend[newStatus] || 'Paid' };
        });
        return jsonResponse(updated, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/invoices\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete invoices.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        await withTransaction(env, async (conn) => {
          const [rows] = await conn.query('SELECT invoice_number FROM invoices WHERE id = ?', [id]);
          if (rows.length > 0) {
            await conn.query('DELETE FROM financial_transactions WHERE reference_type = "invoice_payment" AND reference_id = ?', [rows[0].invoice_number]);
          }
          await conn.query('DELETE FROM invoices WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // QUOTATIONS
    // ----------------------------------------------------
    if (path === '/api/quotations' && method === 'GET') {
      try {
        const quotations = await withDb(env, async (conn) => {
          const [qtRows] = await conn.query('SELECT * FROM quotations ORDER BY quotation_date DESC, created_at DESC');
          const [items] = await conn.query('SELECT * FROM quotation_items ORDER BY sort_order ASC');
          return qtRows.map((qt) => ({
            id: qt.id,
            quotationNumber: qt.quotation_number,
            customerId: qt.customer_id,
            customerName: qt.customer_name,
            customerPhone: qt.customer_phone,
            vehicleRegistration: qt.vehicle_registration,
            vehicleModel: qt.vehicle_model,
            date: qt.quotation_date,
            validUntil: qt.valid_until,
            subtotal: Number(qt.subtotal),
            discount: Number(qt.discount),
            total: Number(qt.total),
            notes: qt.notes,
            status: qt.status.charAt(0).toUpperCase() + qt.status.slice(1),
            convertedInvoiceId: qt.converted_invoice_id,
            items: items.filter((i) => i.quotation_id === qt.id).map((i) => ({
              id: i.id,
              serviceName: i.description || 'Service',
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
              total: Number(i.total),
            })),
          }));
        });
        return jsonResponse(quotations, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // EXPENSES
    // ----------------------------------------------------
    if (path === '/api/expenses' && method === 'GET') {
      try {
        const expenses = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
          return rows.map((r) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            category: r.category_name,
            description: r.description,
            paymentMethod: r.payment_method === 'bkash' ? 'bKash' : r.payment_method === 'bank' ? 'Bank' : 'Cash',
            amount: Number(r.amount),
            recipient: r.recipient,
            note: r.note,
            createdAt: r.created_at,
          }));
        });
        return jsonResponse(expenses, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/expenses/categories' && method === 'GET') {
      try {
        const cats = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT name FROM expense_categories WHERE status = "active" ORDER BY name ASC');
          return rows.map((r) => r.name);
        });
        return jsonResponse(cats, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // TRANSACTIONS & CASH IN
    // ----------------------------------------------------
    if (path === '/api/transactions' && method === 'GET') {
      try {
        const txs = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date,
                   COALESCE(time, DATE_FORMAT(created_at, '%h:%i %p')) as time,
                   CASE type WHEN 'INCOME' THEN 'IN' ELSE 'OUT' END as flow,
                   category as type,
                   description,
                   reference_id as reference,
                   payment_method as paymentMethod,
                   amount,
                   reference_id as sourceId,
                   created_at
            FROM financial_transactions
            ORDER BY date DESC, created_at DESC
          `);
          return rows.map((r) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            flow: r.flow,
            type: r.type,
            description: r.description,
            reference: r.reference,
            paymentMethod: r.paymentMethod === 'bkash' ? 'bKash' : r.paymentMethod === 'bank' ? 'Bank' : 'Cash',
            amount: Number(r.amount) || 0,
            sourceId: r.sourceId,
          }));
        });
        return jsonResponse(txs, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/transactions/cash-in' && method === 'GET') {
      try {
        const cashIn = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date,
                   COALESCE(time, DATE_FORMAT(created_at, '%h:%i %p')) as time,
                   category as type,
                   description,
                   reference_id as reference,
                   payment_method as paymentMethod,
                   amount,
                   created_at as createdAt
            FROM financial_transactions
            WHERE type = 'INCOME'
            ORDER BY date DESC, created_at DESC
          `);
          return rows.map((r) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            type: r.type,
            description: r.description,
            reference: r.reference,
            paymentMethod: r.paymentMethod === 'bkash' ? 'bKash' : r.paymentMethod === 'bank' ? 'Bank' : 'Cash',
            amount: Number(r.amount) || 0,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString()
          }));
        });
        return jsonResponse(cashIn, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/transactions/cash-in' && method === 'POST') {
      try {
        const data = await request.json();
        const txId = `cin-${Date.now()}`;
        const date = data.date || new Date().toISOString().split('T')[0];
        const time = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const pMethod = (data.paymentMethod || 'cash').toLowerCase();

        const created = await withTransaction(env, async (conn) => {
          await conn.query(
            `INSERT INTO financial_transactions (
              id, date, time, type, category, description, payment_method,
              amount, reference_type, reference_id, notes, created_at
            ) VALUES (?, ?, ?, 'INCOME', ?, ?, ?, ?, 'direct_cash_in', ?, ?, NOW())`,
            [
              txId,
              date,
              time,
              data.type || 'Other Income',
              data.description,
              pMethod,
              Number(data.amount) || 0,
              data.reference || null,
              data.note || null
            ]
          );

          return {
            id: txId,
            date,
            time,
            type: data.type || 'Other Income',
            description: data.description,
            reference: data.reference,
            paymentMethod: pMethod === 'bkash' ? 'bKash' : pMethod === 'bank' ? 'Bank' : 'Cash',
            amount: Number(data.amount) || 0,
            note: data.note,
            customerName: data.customerName,
            vehicleInfo: data.vehicleInfo,
            createdAt: new Date().toISOString()
          };
        });

        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // INVENTORY
    // ----------------------------------------------------
    if (path === '/api/inventory/items' && method === 'GET') {
      try {
        const items = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT i.id, i.name, i.category_id as categoryId, c.name as category, i.unit,
                   i.quantity, i.average_unit_cost as averageUnitCost, i.selling_price as sellingPrice,
                   i.minimum_stock as minStock, i.status
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            ORDER BY i.name ASC
          `);
          return rows.map((r) => ({
            id: r.id,
            name: r.name,
            categoryId: r.categoryId,
            category: r.category || 'General',
            unit: r.unit,
            quantity: Number(r.quantity),
            averageUnitCost: Number(r.averageUnitCost),
            sellingPrice: r.sellingPrice ? Number(r.sellingPrice) : null,
            minStock: Number(r.minStock),
            totalValue: Number(r.quantity) * Number(r.averageUnitCost),
            status: Number(r.quantity) <= 0 ? 'Out of Stock' : Number(r.quantity) <= Number(r.minStock) ? 'Low Stock' : 'In Stock',
            isActive: r.status === 'active',
          }));
        });
        return jsonResponse(items, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/inventory/categories' && method === 'GET') {
      try {
        const cats = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT id, name FROM inventory_categories WHERE status = "active" ORDER BY name ASC');
          return rows;
        });
        return jsonResponse(cats, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/inventory/summary' && method === 'GET') {
      try {
        const summary = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT quantity, average_unit_cost, minimum_stock, status FROM inventory_items WHERE status = "active"');
          let totalItems = rows.length;
          let totalStockVal = 0;
          let lowStock = 0;
          let outOfStock = 0;
          rows.forEach((r) => {
            const q = Number(r.quantity) || 0;
            const c = Number(r.average_unit_cost) || 0;
            const min = Number(r.minimum_stock) || 0;
            totalStockVal += q * c;
            if (q <= 0) outOfStock++;
            else if (q <= min) lowStock++;
          });
          return {
            totalItems,
            totalInventoryValue: totalStockVal,
            lowStockCount: lowStock,
            outOfStockCount: outOfStock,
          };
        });
        return jsonResponse(summary, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // LOANS
    // ----------------------------------------------------
    if (path === '/api/loans' && method === 'GET') {
      try {
        const loanSummary = await withDb(env, async (conn) => {
          const [loans] = await conn.query('SELECT * FROM loans WHERE status = "active"');
          const [payments] = await conn.query('SELECT * FROM loan_payments ORDER BY payment_date DESC');
          let totalBorrowed = 0;
          let totalRepaid = 0;
          payments.forEach((p) => {
            const amt = Number(p.amount) || 0;
            if (p.payment_type === 'received') totalBorrowed += amt;
            else if (p.payment_type === 'repayment') totalRepaid += amt;
          });
          const history = payments.map((p) => ({
            id: p.id,
            date: p.payment_date,
            time: p.payment_time,
            type: p.payment_type === 'received' ? 'Loan from MD' : 'Repayment to MD',
            amount: Number(p.amount),
            paymentMethod: p.payment_method === 'bkash' ? 'bKash' : p.payment_method === 'bank' ? 'Bank' : 'Cash',
            reference: p.reference,
            note: p.notes,
          }));
          return {
            totalBorrowed,
            totalRepaid,
            currentBalance: totalBorrowed - totalRepaid,
            history,
          };
        });
        return jsonResponse(loanSummary, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // Static Assets Fallback
    return env.ASSETS.fetch(request);
  },
};
