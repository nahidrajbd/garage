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

    // Health check
    if (path === '/api/health') {
      try {
        const check = await withDb(env, async (conn) => {
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

    if (path.match(/^\/api\/users\/[^/]+\/reset-password$/) && method === 'PUT') {
      const user = getUser(request, env);
      if (!user || user.role !== 'super_admin') {
        return jsonResponse({ error: 'Forbidden: Super Admin access required' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        const { password } = await request.json();
        if (!password) return jsonResponse({ error: 'New password is required' }, 400, corsHeaders);
        const hash = await bcrypt.hash(password, 10);
        await withDb(env, async (conn) => {
          await conn.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, id]);
        });
        return jsonResponse({ success: true, message: 'Password updated successfully' }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (!user || user.role !== 'super_admin') {
        return jsonResponse({ error: 'Forbidden: Super Admin access required' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        if (user.id === id) return jsonResponse({ error: 'Cannot delete own active account' }, 400, corsHeaders);
        await withDb(env, async (conn) => {
          await conn.query('DELETE FROM users WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
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
          const [invCount] = await conn.query('SELECT COUNT(*) as c FROM invoices');
          const [custCount] = await conn.query('SELECT COUNT(*) as c FROM customers');
          const [jcActive] = await conn.query('SELECT COUNT(*) as c FROM job_cards WHERE status IN ("waiting", "in_progress")');
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

          const tIncome = Number(finRows[0]?.totalIncome) || 0;
          const tExpense = Number(finRows[0]?.totalExpense) || 0;

          return {
            totalCustomers: custCount[0]?.c || 0,
            activeJobCards: jcActive[0]?.c || 0,
            totalInvoices: invCount[0]?.c || 0,
            totalBilled: Number(invSummary[0]?.totalBilled) || 0,
            totalPaid: Number(invSummary[0]?.totalPaid) || 0,
            totalDue: Number(invSummary[0]?.totalDue) || 0,
            totalIncome: tIncome,
            totalExpense: tExpense,
            netProfit: tIncome - tExpense,
            recentInvoices: recentInvoices.map(r => ({ ...r, grandTotal: Number(r.grandTotal), paid: Number(r.paid), due: Number(r.due) })),
            recentJobCards,
          };
        });
        return jsonResponse(metrics, 200, corsHeaders);
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
              regNo: v.registration_number,
              make: v.make,
              model: v.model,
              year: v.model_year,
              color: v.color,
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
              lastServiceDate: cInvs.length > 0 ? cInvs[0].date : (c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : ''),
              createdAt: c.created_at,
            };
          });
        });
        return jsonResponse(customers, 200, corsHeaders);
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
              const vId = `veh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
              await conn.query(
                'INSERT INTO vehicles (id, customer_id, registration_number, make, model, model_year, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [vId, custId, v.regNo.trim(), v.make || null, v.model.trim(), v.year || null, v.color || null]
              );
              vehicles.push({ id: vId, regNo: v.regNo.trim(), make: v.make, model: v.model.trim(), year: v.year, color: v.color });
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
    // INVOICES
    // ----------------------------------------------------
    if (path === '/api/invoices' && method === 'GET') {
      try {
        const invoices = await withDb(env, async (conn) => {
          const [invRows] = await conn.query('SELECT * FROM invoices ORDER BY date DESC, created_at DESC');
          const [itemRows] = await conn.query('SELECT * FROM invoice_items ORDER BY sort_order ASC');
          const [pmtRows] = await conn.query('SELECT * FROM payments ORDER BY payment_date ASC');

          return invRows.map(inv => {
            const items = itemRows.filter(i => i.invoice_id === inv.id).map(i => ({
              id: i.id,
              type: i.item_type,
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
              total: Number(i.total),
            }));
            const payments = pmtRows.filter(p => p.invoice_id === inv.id).map(p => ({
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
              vehicleColor: inv.vehicle_color,
              date: inv.date,
              time: inv.time,
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
            vehicleColor: inv.vehicle_color,
            date: inv.date,
            subtotal: Number(inv.subtotal),
            discount: Number(inv.discount),
            grandTotal: Number(inv.grand_total),
            paid: Number(inv.paid),
            due: Number(inv.due),
            status: inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Due',
            paymentMethod: inv.payment_method === 'bkash' ? 'bKash' : inv.payment_method === 'bank' ? 'Bank' : 'Cash',
            items: items.map(i => ({
              id: i.id,
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
              total: Number(i.total),
            })),
            payments: payments.map(p => ({
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
    // EXPENSES
    // ----------------------------------------------------
    if (path === '/api/expenses' && method === 'GET') {
      try {
        const expenses = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
          return rows.map(r => ({
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
          return rows.map(r => r.name);
        });
        return jsonResponse(cats, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/expenses' && method === 'POST') {
      try {
        const body = await request.json();
        const created = await withTransaction(env, async (conn) => {
          const id = `exp-${Date.now()}`;
          const pMethod = (body.paymentMethod || 'cash').toLowerCase();
          await conn.query(
            'INSERT INTO expenses (id, date, time, category_name, description, payment_method, amount, recipient, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [id, body.date, body.time || null, body.category, body.description, pMethod, body.amount, body.recipient || null, body.note || null]
          );
          await conn.query(
            'INSERT INTO financial_transactions (id, date, time, type, category, description, payment_method, amount, reference_type, reference_id, notes, created_at) VALUES (?, ?, ?, "EXPENSE", ?, ?, ?, ?, "expense", ?, ?, NOW())',
            [`tx-exp-${Date.now()}`, body.date, body.time || null, body.category, body.description, pMethod, body.amount, id, body.note || null]
          );
          return { id, ...body };
        });
        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/expenses\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete expenses.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        await withTransaction(env, async (conn) => {
          await conn.query('DELETE FROM expenses WHERE id = ?', [id]);
          await conn.query('DELETE FROM financial_transactions WHERE reference_type = "expense" AND reference_id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
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
          const [rows] = await conn.query('SELECT * FROM financial_transactions ORDER BY date DESC, created_at DESC');
          return rows.map(r => ({
            id: r.id,
            date: r.date,
            time: r.time,
            type: r.type,
            category: r.category,
            description: r.description,
            paymentMethod: r.payment_method === 'bkash' ? 'bKash' : r.payment_method === 'bank' ? 'Bank' : 'Cash',
            amount: Number(r.amount),
            referenceType: r.reference_type,
            referenceId: r.reference_id,
            notes: r.notes,
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
          const [rows] = await conn.query('SELECT * FROM financial_transactions WHERE type = "INCOME" ORDER BY date DESC, created_at DESC');
          return rows.map(r => ({
            id: r.id,
            date: r.date,
            time: r.time,
            type: r.category,
            description: r.description,
            reference: r.reference_id,
            paymentMethod: r.payment_method === 'bkash' ? 'bKash' : r.payment_method === 'bank' ? 'Bank' : 'Cash',
            amount: Number(r.amount),
            note: r.notes,
          }));
        });
        return jsonResponse(cashIn, 200, corsHeaders);
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
          return rows.map(r => ({
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
          rows.forEach(r => {
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
    // JOB CARDS
    // ----------------------------------------------------
    if (path === '/api/job-cards' && method === 'GET') {
      try {
        const cards = await withDb(env, async (conn) => {
          const [jcRows] = await conn.query('SELECT * FROM job_cards ORDER BY date DESC, created_at DESC');
          const [tasks] = await conn.query('SELECT * FROM job_card_tasks ORDER BY sort_order ASC');
          return jcRows.map(jc => ({
            id: jc.id,
            jobCardNumber: jc.job_card_number,
            customerId: jc.customer_id,
            customerName: jc.customer_name,
            customerPhone: jc.customer_phone,
            vehicleId: jc.vehicle_id,
            vehicleRegistration: jc.vehicle_registration,
            vehicleModel: jc.vehicle_model,
            vehicleColor: jc.vehicle_color,
            mileage: jc.mileage,
            date: jc.date,
            time: jc.time,
            assignedTechnician: jc.assigned_technician,
            notes: jc.notes,
            status: jc.status === 'in_progress' ? 'In Progress' : jc.status.charAt(0).toUpperCase() + jc.status.slice(1),
            tasks: tasks.filter(t => t.job_card_id === jc.id).map(t => ({ id: t.id, description: t.description, isCompleted: !!t.is_completed })),
          }));
        });
        return jsonResponse(cards, 200, corsHeaders);
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
          return qtRows.map(qt => ({
            id: qt.id,
            quotationNumber: qt.quotation_number,
            customerId: qt.customer_id,
            customerName: qt.customer_name,
            customerPhone: qt.customer_phone,
            vehicleRegistration: qt.vehicle_registration,
            vehicleModel: qt.vehicle_model,
            vehicleColor: qt.vehicle_color,
            date: qt.quotation_date,
            validUntil: qt.valid_until,
            subtotal: Number(qt.subtotal),
            discount: Number(qt.discount),
            total: Number(qt.total),
            notes: qt.notes,
            status: qt.status.charAt(0).toUpperCase() + qt.status.slice(1),
            convertedInvoiceId: qt.converted_invoice_id,
            convertedInvoiceNumber: qt.converted_invoice_number,
            items: items.filter(i => i.quotation_id === qt.id).map(i => ({
              id: i.id,
              type: i.item_type,
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
    // LOANS
    // ----------------------------------------------------
    if (path === '/api/loans' && method === 'GET') {
      try {
        const loanSummary = await withDb(env, async (conn) => {
          const [loans] = await conn.query('SELECT * FROM loans WHERE status = "active"');
          const [payments] = await conn.query('SELECT * FROM loan_payments ORDER BY payment_date DESC');
          let totalBorrowed = 0;
          let totalRepaid = 0;
          payments.forEach(p => {
            const amt = Number(p.amount) || 0;
            if (p.payment_type === 'received') totalBorrowed += amt;
            else if (p.payment_type === 'repayment') totalRepaid += amt;
          });
          const history = payments.map(p => ({
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
