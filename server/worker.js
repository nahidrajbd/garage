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
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...corsHeaders,
    },
  });
}

const statusMapToFrontend = {
  in_progress: 'In Progress',
  completed: 'Completed',
};

const statusMapToDb = {
  'In Progress': 'in_progress',
  Completed: 'completed',
};

const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const formatMoney = (n) => `৳${(Number(n) || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function buildInvoiceEmailHtml({
  businessName, footerText, invoiceNumber, date, customerName,
  vehicleModel, vehicleRegistration, items, subtotal, discount, grandTotal, paid, due,
}) {
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px 4px; border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
      <td style="padding:8px 4px; border-bottom:1px solid #eee; text-align:center;">${it.quantity}</td>
      <td style="padding:8px 4px; border-bottom:1px solid #eee; text-align:right;">${formatMoney(it.total)}</td>
    </tr>`).join('');

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color:#1f2937;">
    <div style="background:#C1121F; padding:20px 24px; text-align:center; border-radius:8px 8px 0 0;">
      <h1 style="color:#fff; margin:0; font-size:20px;">${escapeHtml(businessName)}</h1>
    </div>
    <div style="padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
      <p style="margin-top:0;">Dear ${escapeHtml(customerName || 'Customer')},</p>
      <p>Thank you for choosing ${escapeHtml(businessName)}. Please find your invoice details below.</p>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <tr><td style="padding:4px 0; color:#6b7280;">Invoice No.</td><td style="text-align:right; font-weight:bold;">${escapeHtml(invoiceNumber)}</td></tr>
        <tr><td style="padding:4px 0; color:#6b7280;">Date</td><td style="text-align:right;">${escapeHtml(date)}</td></tr>
        ${vehicleModel ? `<tr><td style="padding:4px 0; color:#6b7280;">Vehicle</td><td style="text-align:right;">${escapeHtml(vehicleModel)}${vehicleRegistration ? ` (${escapeHtml(vehicleRegistration)})` : ''}</td></tr>` : ''}
      </table>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb; text-align:left; color:#6b7280;">
            <th style="padding:8px 4px;">Service</th>
            <th style="padding:8px 4px; text-align:center;">Qty</th>
            <th style="padding:8px 4px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <tr><td style="padding:4px 0; color:#6b7280;">Subtotal</td><td style="text-align:right;">${formatMoney(subtotal)}</td></tr>
        ${discount > 0 ? `<tr><td style="padding:4px 0; color:#b91c1c;">Discount</td><td style="text-align:right; color:#b91c1c;">- ${formatMoney(discount)}</td></tr>` : ''}
        <tr><td style="padding:8px 0; font-size:16px; font-weight:bold; border-top:2px solid #e5e7eb;">Grand Total</td><td style="padding:8px 0; text-align:right; font-size:16px; font-weight:bold; color:#C1121F; border-top:2px solid #e5e7eb;">${formatMoney(grandTotal)}</td></tr>
        <tr><td style="padding:4px 0; color:#047857;">Paid</td><td style="text-align:right; color:#047857;">${formatMoney(paid)}</td></tr>
        <tr><td style="padding:4px 0; font-weight:bold;">Due</td><td style="text-align:right; font-weight:bold; color:${due > 0 ? '#dc2626' : '#047857'};">${formatMoney(due)}</td></tr>
      </table>

      ${footerText ? `<p style="margin-top:24px; color:#6b7280; font-size:13px;">${escapeHtml(footerText)}</p>` : ''}
    </div>
  </div>`;
}

const DAILY_SUMMARY_RECIPIENTS = ['kamruzzamansumondon3@gmail.com'];

function buildDailySummaryEmailHtml({ businessName, date, incomeRows, expenseRows, totalIncome, totalExpenses }) {
  const incomeHtml = incomeRows.length
    ? incomeRows.map(r => `
      <tr>
        <td style="padding:6px 4px; border-bottom:1px solid #eee;">${escapeHtml(r.customerName || '-')}</td>
        <td style="padding:6px 4px; border-bottom:1px solid #eee;">${escapeHtml(r.customerPhone || '-')}</td>
        <td style="padding:6px 4px; border-bottom:1px solid #eee;">${escapeHtml(r.vehicleModel || '-')}${r.vehicleRegistration ? ` (${escapeHtml(r.vehicleRegistration)})` : ''}</td>
        <td style="padding:6px 4px; border-bottom:1px solid #eee; text-align:right;">${formatMoney(r.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:8px 4px; color:#6b7280;">No income recorded today.</td></tr>`;

  const expenseHtml = expenseRows.length
    ? expenseRows.map(r => `
      <tr>
        <td style="padding:6px 4px; border-bottom:1px solid #eee;">${escapeHtml(r.categoryName || '-')}</td>
        <td style="padding:6px 4px; border-bottom:1px solid #eee;">${escapeHtml(r.description || '-')}</td>
        <td style="padding:6px 4px; border-bottom:1px solid #eee; text-align:right;">${formatMoney(r.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="3" style="padding:8px 4px; color:#6b7280;">No expenses recorded today.</td></tr>`;

  const net = totalIncome - totalExpenses;

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color:#1f2937;">
    <div style="background:#C1121F; padding:20px 24px; text-align:center; border-radius:8px 8px 0 0;">
      <h1 style="color:#fff; margin:0; font-size:20px;">${escapeHtml(businessName)}</h1>
      <p style="color:#fff; margin:4px 0 0; font-size:13px; opacity:0.9;">Daily Summary — ${escapeHtml(date)}</p>
    </div>
    <div style="padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
      <h2 style="font-size:15px; margin:0 0 8px;">Income</h2>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb; text-align:left; color:#6b7280;">
            <th style="padding:6px 4px;">Customer</th>
            <th style="padding:6px 4px;">Phone</th>
            <th style="padding:6px 4px;">Vehicle</th>
            <th style="padding:6px 4px; text-align:right;">Paid</th>
          </tr>
        </thead>
        <tbody>${incomeHtml}</tbody>
      </table>
      <p style="text-align:right; font-weight:bold; margin:8px 0 20px; color:#047857;">Total Income: ${formatMoney(totalIncome)}</p>

      <h2 style="font-size:15px; margin:0 0 8px;">Expenses</h2>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb; text-align:left; color:#6b7280;">
            <th style="padding:6px 4px;">Category</th>
            <th style="padding:6px 4px;">Description</th>
            <th style="padding:6px 4px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${expenseHtml}</tbody>
      </table>
      <p style="text-align:right; font-weight:bold; margin:8px 0 20px; color:#b91c1c;">Total Expenses: ${formatMoney(totalExpenses)}</p>

      <p style="text-align:right; font-size:15px; font-weight:bold; border-top:2px solid #e5e7eb; padding-top:10px; margin:0;">
        Net: <span style="color:${net >= 0 ? '#047857' : '#b91c1c'};">${formatMoney(net)}</span>
      </p>
    </div>
  </div>`;
}

async function sendDailySummaryEmail(env) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

    const { incomeRows, expenseRows, settings } = await withDb(env, async (conn) => {
      const [incomeRows] = await conn.query(
        `SELECT p.amount, i.customer_name as customerName, i.customer_phone as customerPhone,
                i.vehicle_model as vehicleModel, i.vehicle_registration as vehicleRegistration
         FROM payments p
         JOIN invoices i ON p.invoice_id = i.id
         WHERE p.payment_date = ?
         ORDER BY p.created_at ASC`,
        [today]
      );
      const [expenseRows] = await conn.query(
        `SELECT category_name as categoryName, description, amount
         FROM expenses WHERE date = ? ORDER BY created_at ASC`,
        [today]
      );
      const [settingsRows] = await conn.query('SELECT setting_key, setting_value FROM settings');
      const settings = {};
      for (const row of settingsRows) settings[row.setting_key] = row.setting_value;
      return { incomeRows, expenseRows, settings };
    });

    const totalIncome = incomeRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalExpenses = expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const businessName = settings.business_name || 'NextGarage';

    const html = buildDailySummaryEmailHtml({
      businessName,
      date: today,
      incomeRows,
      expenseRows,
      totalIncome,
      totalExpenses,
    });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${businessName} <sales@arshicar.com>`,
        to: DAILY_SUMMARY_RECIPIENTS,
        subject: `Daily Summary — ${today}`,
        html,
      }),
    });
    if (!resendRes.ok) {
      const errData = await resendRes.json().catch(() => ({}));
      console.error('Daily summary email failed:', errData);
    }
  } catch (err) {
    console.error('Error sending daily summary email:', err);
  }
}

const REVIEW_SMS_TEMPLATE = '(Arshi Car) Dear Customer,\nShare your feedback about your recent service. Click to review: arshicar.com/review';

// Queues a review-request SMS to fire 10 minutes after an invoice is fully paid.
// INSERT IGNORE against the (reference_type, reference_id) unique key makes
// re-triggering on an already-paid invoice a harmless no-op.
async function queueReviewSms(conn, invoice) {
  if (!invoice.customer_phone) return;
  const id = `sms-${invoice.id}`;
  await conn.query(
    `INSERT IGNORE INTO sms_queue (id, phone, message, reference_type, reference_id, send_after, status, created_at)
     VALUES (?, ?, ?, 'invoice_review', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 'pending', NOW())`,
    [id, invoice.customer_phone, REVIEW_SMS_TEMPLATE, invoice.id]
  );
}

// Converts a local Bangladeshi number (e.g. "01712-345678") into the
// country-code-prefixed format the SMS gateway expects ("8801712345678").
function normalizeBdPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

async function sendSms(env, phone, message) {
  const contacts = normalizeBdPhone(phone);
  if (!contacts) throw new Error('Invalid phone number');
  if (!env.SMS_API_KEY || !env.SMS_SENDER_ID) {
    throw new Error('SMS_API_KEY / SMS_SENDER_ID not configured');
  }
  const params = new URLSearchParams({
    api_key: env.SMS_API_KEY,
    type: 'text',
    contacts,
    senderid: env.SMS_SENDER_ID,
    msg: message,
    label: 'transactional',
  });
  const res = await fetch(`https://sms.mram.com.bd/smsapi?${params.toString()}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`SMS API error: ${res.status} ${text}`);
  return text;
}

// Processes any sms_queue rows whose 10-minute delay has elapsed.
async function processSmsQueue(env) {
  try {
    const due = await withDb(env, async (conn) => {
      const [rows] = await conn.query(
        `SELECT * FROM sms_queue WHERE status = 'pending' AND send_after <= NOW() ORDER BY send_after ASC LIMIT 20`
      );
      return rows;
    });

    for (const row of due) {
      try {
        await sendSms(env, row.phone, row.message);
        await withDb(env, async (conn) => {
          await conn.query(`UPDATE sms_queue SET status = 'sent', sent_at = NOW() WHERE id = ?`, [row.id]);
        });
      } catch (err) {
        await withDb(env, async (conn) => {
          await conn.query(
            `UPDATE sms_queue SET status = 'failed', error = ? WHERE id = ?`,
            [String(err.message || err).slice(0, 500), row.id]
          );
        });
        console.error(`Failed to send queued SMS ${row.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error processing SMS queue:', err);
  }
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

    if (path.match(/^\/api\/users\/[^/]+$/) && method === 'PUT') {
      const user = getUser(request, env);
      if (!user || user.role !== 'super_admin') {
        return jsonResponse({ error: 'Forbidden: Super Admin access required' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        const { name, role, status } = await request.json();
        const updated = await withDb(env, async (conn) => {
          const updates = [];
          const params = [];
          if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
          if (role !== undefined) { updates.push('role = ?'); params.push(role === 'super_admin' ? 'super_admin' : 'staff'); }
          if (status !== undefined) { updates.push('status = ?'); params.push(status === 'inactive' ? 'inactive' : 'active'); }
          if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
          }
          const [rows] = await conn.query('SELECT id, name, username, role, status FROM users WHERE id = ?', [id]);
          return rows[0] || null;
        });
        if (!updated) return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
        return jsonResponse(updated, 200, corsHeaders);
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
        if (!password || password.length < 4) {
          return jsonResponse({ error: 'Password must be at least 4 characters long' }, 400, corsHeaders);
        }
        const hash = await bcrypt.hash(password, 10);
        await withDb(env, async (conn) => {
          await conn.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, id]);
        });
        return jsonResponse({ success: true, message: 'Password reset successfully' }, 200, corsHeaders);
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
        if (user.id === id) {
          return jsonResponse({ error: 'You cannot delete your own account while logged in.' }, 400, corsHeaders);
        }
        await withDb(env, async (conn) => {
          const [superAdmins] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "super_admin" AND status = "active"');
          const [target] = await conn.query('SELECT role FROM users WHERE id = ?', [id]);
          if (target.length > 0 && target[0].role === 'super_admin' && superAdmins[0].count <= 1) {
            throw new Error('Cannot delete the only remaining active Super Admin.');
          }
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

          const [jcProgress] = await conn.query(`SELECT COUNT(*) as c FROM job_cards WHERE status = 'in_progress'`);
          const [jcCompletedToday] = await conn.query(
            `SELECT COUNT(*) as c FROM job_cards WHERE status = 'completed' AND DATE_FORMAT(date, '%Y-%m-%d') = ?`,
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

          const inProgressJobCardsCount = Number(jcProgress[0]?.c) || 0;
          const activeJobCardsCount = inProgressJobCardsCount;
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
            inProgressJobCardsCount,
            completedTodayJobCardsCount,
            totalBilled: Number(invSummary[0]?.totalBilled) || 0,
            totalPaid: Number(invSummary[0]?.totalPaid) || 0,
            totalDue: Number(invSummary[0]?.totalDue) || 0,
            totalIncome: tIncome,
            totalExpense: tExpense,
            netProfit: tIncome - tExpense,
            recentInvoices: recentInvoices.map(r => ({ ...r, grandTotal: Number(r.grandTotal), paid: Number(r.paid), due: Number(r.due) })),
            recentJobCards: recentJobCards.map(r => ({ ...r, status: statusMapToFrontend[r.status] || 'In Progress' })),
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
    // LEADS
    // ----------------------------------------------------
    const LEAD_TERMINAL_STATUSES = ['Service Taken', 'Not Interested', 'Lost'];

    const formatLeadRow = (l, followUps) => ({
      id: l.id,
      leadNumber: l.lead_number,
      customerName: l.customer_name,
      phone: l.phone,
      source: l.source,
      inquiry: l.inquiry || '',
      status: l.status,
      leadDate: typeof l.lead_date === 'string' ? l.lead_date : new Date(l.lead_date).toISOString().split('T')[0],
      lastContactDate: l.last_contact_date ? (typeof l.last_contact_date === 'string' ? l.last_contact_date : new Date(l.last_contact_date).toISOString().split('T')[0]) : undefined,
      nextFollowUpDate: l.next_follow_up_date ? (typeof l.next_follow_up_date === 'string' ? l.next_follow_up_date : new Date(l.next_follow_up_date).toISOString().split('T')[0]) : undefined,
      visitDate: l.visit_date ? (typeof l.visit_date === 'string' ? l.visit_date : new Date(l.visit_date).toISOString().split('T')[0]) : undefined,
      visitTime: l.visit_time || undefined,
      vehicleModel: l.vehicle_model || undefined,
      customerId: l.customer_id || undefined,
      vehicleId: l.vehicle_id || undefined,
      jobCardId: l.job_card_id || undefined,
      jobCardNumber: l.job_card_number || undefined,
      quotationId: l.quotation_id || undefined,
      quotationNumber: l.quotation_number || undefined,
      invoiceId: l.invoice_id || undefined,
      invoiceNumber: l.invoice_number || undefined,
      notes: l.notes || undefined,
      followUps: followUps || [],
      createdAt: typeof l.created_at === 'string' ? l.created_at : new Date(l.created_at).toISOString(),
      updatedAt: l.updated_at ? (typeof l.updated_at === 'string' ? l.updated_at : new Date(l.updated_at).toISOString()) : undefined,
    });

    const formatFollowUpRow = (fu) => ({
      id: fu.id,
      leadId: fu.lead_id,
      staffId: fu.staff_id,
      contactDate: typeof fu.contact_date === 'string' ? fu.contact_date : new Date(fu.contact_date).toISOString().split('T')[0],
      status: fu.status,
      note: fu.note || '',
      nextFollowUpDate: fu.next_follow_up_date ? (typeof fu.next_follow_up_date === 'string' ? fu.next_follow_up_date : new Date(fu.next_follow_up_date).toISOString().split('T')[0]) : undefined,
      createdAt: typeof fu.created_at === 'string' ? fu.created_at : new Date(fu.created_at).toISOString(),
    });

    if (path === '/api/leads' && method === 'GET') {
      try {
        const leads = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM leads ORDER BY created_at DESC');
          const [fus] = await conn.query('SELECT * FROM lead_follow_ups ORDER BY created_at ASC');
          const fuMap = {};
          for (const fu of fus) {
            if (!fuMap[fu.lead_id]) fuMap[fu.lead_id] = [];
            fuMap[fu.lead_id].push(formatFollowUpRow(fu));
          }
          return rows.map(l => formatLeadRow(l, fuMap[l.id]));
        });
        return jsonResponse(leads, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/leads\/[^/]+$/) && method === 'GET') {
      try {
        const id = path.split('/')[3];
        const lead = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM leads WHERE id = ? OR lead_number = ?', [id, id]);
          if (rows.length === 0) return null;
          const [fus] = await conn.query('SELECT * FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at ASC', [rows[0].id]);
          return formatLeadRow(rows[0], fus.map(formatFollowUpRow));
        });
        if (!lead) return jsonResponse({ error: 'Lead not found' }, 404, corsHeaders);
        return jsonResponse(lead, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/leads' && method === 'POST') {
      try {
        const body = await request.json();
        if (!body.customerName || !body.phone) {
          return jsonResponse({ error: 'Customer name and phone are required' }, 400, corsHeaders);
        }
        const lead = await withTransaction(env, async (conn) => {
          const id = `lead-${Date.now()}`;
          const [existing] = await conn.query('SELECT lead_number FROM leads');
          let maxSeq = 0;
          for (const r of existing) {
            const m = r.lead_number.match(/(\d+)$/);
            const seq = m ? parseInt(m[1], 10) : 0;
            if (seq > maxSeq) maxSeq = seq;
          }
          const leadNumber = `LD-${String(maxSeq + 1).padStart(4, '0')}`;
          const leadDate = body.leadDate || new Date().toISOString().split('T')[0];
          await conn.query(
            `INSERT INTO leads (id, lead_number, customer_name, phone, source, inquiry, status, lead_date,
                                 next_follow_up_date, vehicle_model, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?, ?, ?, NOW())`,
            [id, leadNumber, body.customerName.trim(), body.phone.trim(), body.source || 'Facebook',
             body.inquiry ? body.inquiry.trim() : null, leadDate, body.nextFollowUpDate || null,
             body.vehicleModel || null, body.notes || null]
          );
          const [rows] = await conn.query('SELECT * FROM leads WHERE id = ?', [id]);
          return formatLeadRow(rows[0], []);
        });
        return jsonResponse(lead, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/leads\/[^/]+$/) && method === 'PUT') {
      try {
        const id = path.split('/')[3];
        const body = await request.json();
        const fieldMap = {
          customerName: 'customer_name', phone: 'phone', source: 'source', inquiry: 'inquiry',
          status: 'status', leadDate: 'lead_date', lastContactDate: 'last_contact_date',
          nextFollowUpDate: 'next_follow_up_date', visitDate: 'visit_date', visitTime: 'visit_time',
          vehicleModel: 'vehicle_model', customerId: 'customer_id', vehicleId: 'vehicle_id',
          jobCardId: 'job_card_id', jobCardNumber: 'job_card_number', quotationId: 'quotation_id',
          quotationNumber: 'quotation_number', invoiceId: 'invoice_id', invoiceNumber: 'invoice_number',
          notes: 'notes',
        };
        const lead = await withDb(env, async (conn) => {
          const updates = [];
          const params = [];
          for (const [key, col] of Object.entries(fieldMap)) {
            if (body[key] !== undefined) {
              updates.push(`${col} = ?`);
              params.push(body[key] === '' ? null : body[key]);
            }
          }
          if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
          }
          const [rows] = await conn.query('SELECT * FROM leads WHERE id = ?', [id]);
          if (rows.length === 0) return null;
          const [fus] = await conn.query('SELECT * FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at ASC', [id]);
          return formatLeadRow(rows[0], fus.map(formatFollowUpRow));
        });
        if (!lead) return jsonResponse({ error: 'Lead not found' }, 404, corsHeaders);
        return jsonResponse(lead, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/leads\/[^/]+\/follow-ups$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const body = await request.json();
        if (!body.staffId || !body.status) {
          return jsonResponse({ error: 'staffId and status are required' }, 400, corsHeaders);
        }
        const contactDate = body.contactDate || new Date().toISOString().split('T')[0];
        const isTerminal = LEAD_TERMINAL_STATUSES.includes(body.status);
        const nextFollowUpDate = isTerminal ? null : (body.nextFollowUpDate || null);

        const lead = await withTransaction(env, async (conn) => {
          const fuId = `fu-${id}-${Date.now()}`;
          await conn.query(
            `INSERT INTO lead_follow_ups (id, lead_id, staff_id, contact_date, status, note, next_follow_up_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [fuId, id, body.staffId, contactDate, body.status, body.note ? body.note.trim() : null, nextFollowUpDate]
          );
          const updates = ['status = ?', 'last_contact_date = ?', 'next_follow_up_date = ?'];
          const params = [body.status, contactDate, nextFollowUpDate];
          if (body.visitDate) { updates.push('visit_date = ?'); params.push(body.visitDate); }
          if (body.visitTime) { updates.push('visit_time = ?'); params.push(body.visitTime); }
          params.push(id);
          await conn.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);

          const [rows] = await conn.query('SELECT * FROM leads WHERE id = ?', [id]);
          if (rows.length === 0) return null;
          const [fus] = await conn.query('SELECT * FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at ASC', [id]);
          return formatLeadRow(rows[0], fus.map(formatFollowUpRow));
        });
        if (!lead) return jsonResponse({ error: 'Lead not found' }, 404, corsHeaders);
        return jsonResponse(lead, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/leads\/[^/]+\/convert$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const customer = await withTransaction(env, async (conn) => {
          const [leadRows] = await conn.query('SELECT * FROM leads WHERE id = ?', [id]);
          if (leadRows.length === 0) return null;
          const lead = leadRows[0];

          if (lead.customer_id) {
            const [existing] = await conn.query('SELECT * FROM customers WHERE id = ?', [lead.customer_id]);
            if (existing.length > 0) return existing[0];
          }

          const customerId = `cust-${Date.now()}`;
          await conn.query(
            `INSERT INTO customers (id, name, phone, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
            [customerId, lead.customer_name, lead.phone]
          );
          await conn.query('UPDATE leads SET customer_id = ? WHERE id = ?', [customerId, id]);
          const [created] = await conn.query('SELECT * FROM customers WHERE id = ?', [customerId]);
          return created[0];
        });
        if (!customer) return jsonResponse({ error: 'Lead not found' }, 404, corsHeaders);
        return jsonResponse({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          address: customer.address || undefined,
          notes: customer.notes || undefined,
          vehicles: [],
          totalVisits: 0,
          lastServiceDate: new Date().toISOString().split('T')[0],
          createdAt: typeof customer.created_at === 'string' ? customer.created_at : new Date(customer.created_at).toISOString(),
        }, 200, corsHeaders);
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
            status: statusMapToFrontend[j.status] || 'In Progress',
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
            status: statusMapToFrontend[jc.status] || 'In Progress',
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
        const dbStatus = statusMapToDb[data.status] || 'in_progress';

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
            status: data.status || 'In Progress',
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
        const dbStatus = statusMapToDb[data.status] || 'in_progress';

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
        const dbStatus = statusMapToDb[status] || 'in_progress';
        const card = await withDb(env, async (conn) => {
          await conn.query('UPDATE job_cards SET status = ?, updated_at = NOW() WHERE id = ?', [dbStatus, id]);

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
             WHERE j.id = ?`,
            [id]
          );
          if (rows.length === 0) return null;
          const jc = rows[0];
          const [items] = await conn.query('SELECT id, job_card_id as jobCardId, service_name as serviceName, description FROM job_card_items WHERE job_card_id = ?', [jc.id]);
          const [photos] = await conn.query('SELECT id, job_card_id as jobCardId, photo_type as photoType, file_path as filePath FROM job_card_photos WHERE job_card_id = ?', [jc.id]);

          return {
            ...jc,
            status: statusMapToFrontend[jc.status] || 'In Progress',
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

    if (path.match(/^\/api\/job-cards\/[^/]+\/link-quotation$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const { quotationId } = await request.json();
        await withDb(env, async (conn) => {
          await conn.query('UPDATE job_cards SET quotation_id = ? WHERE id = ?', [quotationId, id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/job-cards\/[^/]+\/link-invoice$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const { invoiceId } = await request.json();
        await withDb(env, async (conn) => {
          // Converting to an invoice means the workshop job is done
          await conn.query('UPDATE job_cards SET invoice_id = ?, status = ? WHERE id = ?', [invoiceId, 'completed', id]);
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
              price: Number(i.unit_price),
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
              price: Number(i.unit_price),
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

          // Random 4-digit invoice number (e.g. INV-4821), retried on collision
          let invoiceNumber = null;
          for (let attempt = 0; attempt < 25; attempt++) {
            const candidate = `${prefix}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
            const [existingInv] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [candidate]);
            if (existingInv.length === 0) {
              invoiceNumber = candidate;
              break;
            }
          }
          if (!invoiceNumber) {
            invoiceNumber = `${prefix}${Date.now().toString().slice(-4)}`;
          }

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
              const itmQty = Number(itm.quantity) || 1;
              const itmPrice = Number(itm.price ?? itm.unitPrice) || 0;
              await conn.query(
                `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [`ii-${Date.now()}-${i}`, invId, itm.type || 'service', itm.description || itm.serviceName || 'Service', itmQty, itmPrice, itmQty * itmPrice, i]
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

          if (status === 'paid') {
            await queueReviewSms(conn, { id: invId, customer_phone: body.customerPhone });
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

          if (newStatus === 'paid' && inv.status !== 'paid') {
            await queueReviewSms(conn, inv);
          }

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

    if (path.match(/^\/api\/invoices\/[^/]+\/email$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const body = await request.json().catch(() => ({}));
        const emailResult = await withDb(env, async (conn) => {
          const [invRows] = await conn.query(
            `SELECT i.*, DATE_FORMAT(i.date, '%Y-%m-%d') as invDate FROM invoices i WHERE i.id = ? OR i.invoice_number = ?`,
            [id, id]
          );
          if (invRows.length === 0) return { status: 404, error: 'Invoice not found' };
          const inv = invRows[0];

          let targetEmail = body.email ? String(body.email).trim() : '';
          let customer = null;
          if (inv.customer_id) {
            const [custRows] = await conn.query('SELECT * FROM customers WHERE id = ?', [inv.customer_id]);
            customer = custRows[0] || null;
          }
          if (!targetEmail && customer?.email) targetEmail = customer.email;
          if (!targetEmail) return { status: 400, error: 'No email address provided for this customer' };
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) return { status: 400, error: 'Please provide a valid email address' };

          if (body.email && customer && !customer.email) {
            await conn.query('UPDATE customers SET email = ? WHERE id = ?', [targetEmail, customer.id]);
          }

          const [items] = await conn.query(
            `SELECT description as serviceName, description, quantity, unit_price as price, total
             FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC`,
            [inv.id]
          );

          const [settingsRows] = await conn.query('SELECT setting_key, setting_value FROM settings');
          const settings = {};
          for (const row of settingsRows) settings[row.setting_key] = row.setting_value;

          const html = buildInvoiceEmailHtml({
            businessName: settings.business_name || 'NextGarage',
            footerText: settings.default_footer_text || '',
            invoiceNumber: inv.invoice_number,
            date: inv.invDate,
            customerName: inv.customer_name,
            vehicleModel: inv.vehicle_model,
            vehicleRegistration: inv.vehicle_registration,
            items: items.map(it => ({
              name: it.serviceName || it.description || 'Service',
              quantity: Number(it.quantity) || 1,
              total: Number(it.total) || 0,
            })),
            subtotal: Number(inv.subtotal) || 0,
            discount: Number(inv.discount) || 0,
            grandTotal: Number(inv.grand_total) || 0,
            paid: Number(inv.paid) || 0,
            due: Number(inv.due) || 0,
          });

          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${settings.business_name || 'NextGarage'} <sales@arshicar.com>`,
              to: [targetEmail],
              reply_to: settings.email || undefined,
              subject: `Invoice ${inv.invoice_number} from ${settings.business_name || 'NextGarage'}`,
              html,
            }),
          });
          const resendData = await resendRes.json();
          if (!resendRes.ok) {
            return { status: 502, error: resendData.message || 'Failed to send email' };
          }
          return { status: 200, email: targetEmail };
        });

        if (emailResult.error) return jsonResponse({ error: emailResult.error }, emailResult.status, corsHeaders);
        return jsonResponse({ success: true, email: emailResult.email }, 200, corsHeaders);
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
          const [qtRows] = await conn.query(`
            SELECT q.id, q.quotation_number as quotationNumber, q.customer_id as customerId, q.vehicle_id as vehicleId,
                   q.customer_name as customerName, q.customer_phone as customerPhone,
                   q.vehicle_registration as vehicleRegistration, q.vehicle_model as vehicleModel,
                   jc.id as jobCardId, jc.job_card_number as jobCardNumber,
                   DATE_FORMAT(q.quotation_date, '%Y-%m-%d') as date,
                   DATE_FORMAT(q.valid_until, '%Y-%m-%d') as validUntil,
                   q.status, q.subtotal, q.discount, q.total as grandTotal,
                   q.notes, q.terms, q.converted_invoice_id as convertedInvoiceId,
                   COALESCE(q.converted_invoice_number, inv.invoice_number) as convertedInvoiceNumber,
                   q.created_at as createdAt, q.updated_at as updatedAt
            FROM quotations q
            LEFT JOIN job_cards jc ON jc.quotation_id = q.id
            LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
            ORDER BY q.created_at DESC
          `);

          const [items] = await conn.query(`
            SELECT id, quotation_id as quotationId, description as serviceName, description,
                   quantity, unit_price as unitPrice, total
            FROM quotation_items ORDER BY sort_order ASC, created_at ASC
          `);

          const itemMap = {};
          for (const item of items) {
            if (!itemMap[item.quotationId]) itemMap[item.quotationId] = [];
            itemMap[item.quotationId].push({
              id: item.id,
              serviceName: item.serviceName || item.description || 'Service',
              description: item.description,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice) || 0,
              total: Number(item.total) || 0
            });
          }

          const qStatusMap = {
            draft: 'Draft',
            sent: 'Sent',
            accepted: 'Accepted',
            rejected: 'Rejected',
            expired: 'Expired',
            converted: 'Converted'
          };

          return qtRows.map(q => ({
            ...q,
            status: qStatusMap[q.status] || 'Draft',
            subtotal: Number(q.subtotal) || 0,
            discount: Number(q.discount) || 0,
            grandTotal: Number(q.grandTotal) || 0,
            items: itemMap[q.id] || [],
            createdAt: typeof q.createdAt === 'string' ? q.createdAt : new Date(q.createdAt).toISOString()
          }));
        });
        return jsonResponse(quotations, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/quotations\/[^/]+$/) && method === 'GET') {
      try {
        const id = path.split('/')[3];
        const quotation = await withDb(env, async (conn) => {
          const [rows] = await conn.query(
            `SELECT q.id, q.quotation_number as quotationNumber, q.customer_id as customerId, q.vehicle_id as vehicleId,
                    q.customer_name as customerName, q.customer_phone as customerPhone,
                    q.vehicle_registration as vehicleRegistration, q.vehicle_model as vehicleModel,
                    jc.id as jobCardId, jc.job_card_number as jobCardNumber,
                    DATE_FORMAT(q.quotation_date, '%Y-%m-%d') as date,
                    DATE_FORMAT(q.valid_until, '%Y-%m-%d') as validUntil,
                    q.status, q.subtotal, q.discount, q.total as grandTotal,
                    q.notes, q.terms, q.converted_invoice_id as convertedInvoiceId,
                    COALESCE(q.converted_invoice_number, inv.invoice_number) as convertedInvoiceNumber,
                    q.created_at as createdAt, q.updated_at as updatedAt
             FROM quotations q
             LEFT JOIN job_cards jc ON jc.quotation_id = q.id
             LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
             WHERE q.id = ? OR q.quotation_number = ?`,
            [id, id]
          );

          if (rows.length === 0) return null;
          const q = rows[0];
          const [items] = await conn.query(
            `SELECT id, quotation_id as quotationId, description as serviceName, description,
                    quantity, unit_price as unitPrice, total
             FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, created_at ASC`,
            [q.id]
          );

          const qStatusMap = {
            draft: 'Draft',
            sent: 'Sent',
            accepted: 'Accepted',
            rejected: 'Rejected',
            expired: 'Expired',
            converted: 'Converted'
          };

          return {
            ...q,
            status: qStatusMap[q.status] || 'Draft',
            subtotal: Number(q.subtotal) || 0,
            discount: Number(q.discount) || 0,
            grandTotal: Number(q.grandTotal) || 0,
            items: items.map(it => ({
              id: it.id,
              serviceName: it.serviceName || it.description || 'Service',
              description: it.description,
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              total: Number(it.total) || 0
            })),
            createdAt: typeof q.createdAt === 'string' ? q.createdAt : new Date(q.createdAt).toISOString()
          };
        });

        if (!quotation) return jsonResponse({ error: 'Quotation not found' }, 404, corsHeaders);
        return jsonResponse(quotation, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/quotations' && method === 'POST') {
      try {
        const data = await request.json();
        const qId = `qt-${Date.now()}`;
        const dbStatus = (data.status || 'draft').toLowerCase();

        const result = await withTransaction(env, async (conn) => {
          let customerId = data.customerId;
          let vehicleId = data.vehicleId;

          // Auto-link customer if missing
          if (!customerId && data.customerPhone) {
            const [custs] = await conn.query('SELECT id FROM customers WHERE phone = ?', [data.customerPhone]);
            if (custs.length > 0) {
              customerId = custs[0].id;
            } else if (data.customerName) {
              customerId = `cust-${Date.now()}`;
              await conn.query(
                `INSERT INTO customers (id, name, phone, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
                [customerId, data.customerName, data.customerPhone]
              );
            }
          }

          // Auto-link vehicle if missing
          if (customerId && data.vehicleRegistration) {
            const [vehs] = await conn.query('SELECT id FROM vehicles WHERE customer_id = ? AND registration_number = ?', [customerId, data.vehicleRegistration]);
            if (vehs.length > 0) {
              vehicleId = vehs[0].id;
            } else {
              vehicleId = `veh-${Date.now()}`;
              await conn.query(
                `INSERT INTO vehicles (id, customer_id, registration_number, model, created_at) VALUES (?, ?, ?, ?, NOW())`,
                [vehicleId, customerId, data.vehicleRegistration, data.vehicleModel || 'Vehicle']
              );
            }
          }

          // Generate unique quotation number
          let qNumber = data.quotationNumber;
          if (!qNumber) {
            const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "quotation_prefix"');
            const prefix = setRows[0]?.setting_value || 'QT-';
            const [countRows] = await conn.query('SELECT COUNT(*) as count FROM quotations');
            const nextSeq = (countRows[0]?.count || 0) + 1;
            qNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
          }

          // Check for collision
          const [existingQ] = await conn.query('SELECT id FROM quotations WHERE quotation_number = ?', [qNumber]);
          if (existingQ.length > 0) {
            const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "quotation_prefix"');
            const prefix = setRows[0]?.setting_value || 'QT-';
            const [countRows] = await conn.query('SELECT COUNT(*) as count FROM quotations');
            const nextSeq = (countRows[0]?.count || 0) + 1;
            qNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
            const [stillCollides] = await conn.query('SELECT id FROM quotations WHERE quotation_number = ?', [qNumber]);
            if (stillCollides.length > 0) {
              qNumber = `${prefix}${Date.now().toString().slice(-4)}`;
            }
          }

          // Calculate totals
          let calculatedSubtotal = 0;
          if (Array.isArray(data.items)) {
            calculatedSubtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0)), 0);
          }
          const discount = Number(data.discount) || 0;
          const grandTotal = Math.max(0, calculatedSubtotal - discount);

          await conn.query(
            `INSERT INTO quotations (
              id, quotation_number, customer_id, vehicle_id, customer_name, customer_phone,
              vehicle_registration, vehicle_model, quotation_date, valid_until,
              status, subtotal, discount, total, notes, terms, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              qId,
              qNumber,
              customerId || null,
              vehicleId || null,
              data.customerName || 'Customer',
              data.customerPhone || 'N/A',
              data.vehicleRegistration || 'N/A',
              data.vehicleModel || 'Vehicle',
              data.date || new Date().toISOString().split('T')[0],
              data.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
              dbStatus,
              calculatedSubtotal,
              discount,
              grandTotal,
              data.notes || null,
              data.terms || null
            ]
          );

          if (data.jobCardId) {
            await conn.query('UPDATE job_cards SET quotation_id = ? WHERE id = ?', [qId, data.jobCardId]);
          }

          const createdItems = [];
          if (Array.isArray(data.items)) {
            for (let i = 0; i < data.items.length; i++) {
              const item = data.items[i];
              const itemId = `qti-${Date.now()}-${i}`;
              const qty = Number(item.quantity) || 1;
              const uPrice = Number(item.unitPrice || item.price) || 0;
              const tot = qty * uPrice;
              const serviceName = item.serviceName || item.description || 'Service';

              await conn.query(
                `INSERT INTO quotation_items (id, quotation_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
                 VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
                [itemId, qId, serviceName, qty, uPrice, tot, i]
              );

              createdItems.push({
                id: itemId,
                quotationId: qId,
                serviceName,
                description: item.description,
                quantity: qty,
                unitPrice: uPrice,
                total: tot
              });
            }
          }

          return {
            ...data,
            id: qId,
            quotationNumber: qNumber,
            customerId,
            vehicleId,
            subtotal: calculatedSubtotal,
            discount,
            grandTotal,
            items: createdItems,
            status: data.status || 'Draft',
            createdAt: new Date().toISOString()
          };
        });

        return jsonResponse(result, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/quotations\/[^/]+$/) && method === 'PUT') {
      try {
        const id = path.split('/')[3];
        const data = await request.json();

        const updated = await withTransaction(env, async (conn) => {
          const updates = [];
          const params = [];

          if (data.status !== undefined) {
            updates.push('status = ?');
            params.push((data.status || 'draft').toLowerCase());
          }
          if (data.customerName !== undefined) { updates.push('customer_name = ?'); params.push(data.customerName); }
          if (data.customerPhone !== undefined) { updates.push('customer_phone = ?'); params.push(data.customerPhone); }
          if (data.vehicleRegistration !== undefined) { updates.push('vehicle_registration = ?'); params.push(data.vehicleRegistration); }
          if (data.vehicleModel !== undefined) { updates.push('vehicle_model = ?'); params.push(data.vehicleModel); }
          if (data.date !== undefined) { updates.push('quotation_date = ?'); params.push(data.date); }
          if (data.validUntil !== undefined) { updates.push('valid_until = ?'); params.push(data.validUntil); }
          if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes); }
          if (data.terms !== undefined) { updates.push('terms = ?'); params.push(data.terms); }

          if (Array.isArray(data.items)) {
            const calculatedSubtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0)), 0);
            const discount = Number(data.discount !== undefined ? data.discount : 0);
            const grandTotal = Math.max(0, calculatedSubtotal - discount);

            updates.push('subtotal = ?'); params.push(calculatedSubtotal);
            updates.push('discount = ?'); params.push(discount);
            updates.push('total = ?'); params.push(grandTotal);

            await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
            for (let i = 0; i < data.items.length; i++) {
              const item = data.items[i];
              const itemId = `qti-${Date.now()}-${i}`;
              const qty = Number(item.quantity) || 1;
              const uPrice = Number(item.unitPrice || item.price) || 0;
              const tot = qty * uPrice;
              const sName = item.serviceName || item.description || 'Service';

              await conn.query(
                `INSERT INTO quotation_items (id, quotation_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
                 VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
                [itemId, id, sName, qty, uPrice, tot, i]
              );
            }
          }

          if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`, params);
          }

          return { ...data, id };
        });

        return jsonResponse(updated, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/quotations\/[^/]+\/status$/) && method === 'PATCH') {
      try {
        const id = path.split('/')[3];
        const { status } = await request.json();
        const dbStatus = (status || 'draft').toLowerCase();
        await withDb(env, async (conn) => {
          await conn.query('UPDATE quotations SET status = ?, updated_at = NOW() WHERE id = ?', [dbStatus, id]);
        });
        return jsonResponse({ success: true, id, status }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/quotations\/[^/]+\/convert$/) && method === 'POST') {
      try {
        const id = path.split('/')[3];
        const result = await withTransaction(env, async (conn) => {
          const [quotRows] = await conn.query('SELECT * FROM quotations WHERE id = ?', [id]);
          if (quotRows.length === 0) throw new Error('Quotation not found');
          const quotation = quotRows[0];

          if (quotation.status === 'converted' && quotation.converted_invoice_id) {
            const [existingInv] = await conn.query('SELECT * FROM invoices WHERE id = ?', [quotation.converted_invoice_id]);
            if (existingInv.length > 0) return existingInv[0];
          }

          const [jcRows] = await conn.query('SELECT id FROM job_cards WHERE quotation_id = ? LIMIT 1', [id]);
          const linkedJobCardId = jcRows.length > 0 ? jcRows[0].id : null;

          const [setRows] = await conn.query('SELECT setting_value FROM settings WHERE setting_key = "invoice_prefix"');
          const prefix = setRows[0]?.setting_value || 'INV-';
          const [countRows] = await conn.query('SELECT COUNT(*) as count FROM invoices');
          let nextSeq = (countRows[0]?.count || 0) + 1;
          let invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

          const [existingInvCheck] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
          if (existingInvCheck.length > 0) {
            const [maxRows] = await conn.query('SELECT invoice_number FROM invoices');
            let maxFound = nextSeq;
            for (const r of maxRows) {
              const match = r.invoice_number && r.invoice_number.match(/(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num >= maxFound) maxFound = num + 1;
              }
            }
            invoiceNumber = `${prefix}${String(maxFound).padStart(4, '0')}`;
            const [stillCollides] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
            if (stillCollides.length > 0) {
              invoiceNumber = `${prefix}${Date.now().toString().slice(-4)}`;
            }
          }

          const invoiceId = `inv-${Date.now()}`;
          const today = new Date().toISOString().split('T')[0];

          await conn.query(
            `INSERT INTO invoices (
              id, invoice_number, quotation_id, job_card_id, customer_id, vehicle_id,
              customer_name, customer_phone, vehicle_registration, vehicle_model,
              date, subtotal, discount, grand_total, paid, due, status,
              payment_method, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'due', 'cash', ?, NOW())`,
            [
              invoiceId,
              invoiceNumber,
              quotation.id,
              linkedJobCardId,
              quotation.customer_id,
              quotation.vehicle_id,
              quotation.customer_name,
              quotation.customer_phone,
              quotation.vehicle_registration,
              quotation.vehicle_model,
              today,
              quotation.subtotal,
              quotation.discount,
              quotation.total,
              quotation.total,
              `Created from quotation ${quotation.quotation_number}${quotation.notes ? ' | ' + quotation.notes : ''}`
            ]
          );

          const [qItems] = await conn.query('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, created_at ASC', [id]);
          const createdItems = [];
          for (let i = 0; i < qItems.length; i++) {
            const it = qItems[i];
            const itemId = `invi-${Date.now()}-${i}`;
            await conn.query(
              `INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, sort_order, created_at)
               VALUES (?, ?, 'service', ?, ?, ?, ?, ?, NOW())`,
              [itemId, invoiceId, it.description, it.quantity, it.unit_price, it.total, i]
            );
            createdItems.push({
              id: itemId,
              serviceName: it.description,
              price: Number(it.unit_price),
              quantity: Number(it.quantity)
            });
          }

          await conn.query(
            `UPDATE quotations SET status = 'converted', converted_invoice_id = ?, converted_invoice_number = ? WHERE id = ?`,
            [invoiceId, invoiceNumber, id]
          );

          if (linkedJobCardId) {
            await conn.query('UPDATE job_cards SET invoice_id = ?, status = ? WHERE id = ?', [invoiceId, 'completed', linkedJobCardId]);
          }

          return {
            id: invoiceId,
            invoiceNumber,
            date: today,
            customerId: quotation.customer_id,
            customerName: quotation.customer_name,
            customerPhone: quotation.customer_phone,
            vehicleRegistration: quotation.vehicle_registration,
            vehicleModel: quotation.vehicle_model,
            subtotal: Number(quotation.subtotal),
            discount: Number(quotation.discount),
            grandTotal: Number(quotation.total),
            paid: 0,
            due: Number(quotation.total),
            status: 'Due',
            paymentMethod: 'Cash',
            notes: `Created from quotation ${quotation.quotation_number}`,
            quotationId: quotation.id,
            quotationNumber: quotation.quotation_number,
            convertedFromQuotation: true,
            jobCardId: linkedJobCardId,
            items: createdItems,
            createdAt: new Date().toISOString()
          };
        });

        return jsonResponse(result, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/quotations\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete quotations.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[3];
        await withTransaction(env, async (conn) => {
          await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
          await conn.query('DELETE FROM quotations WHERE id = ?', [id]);
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
          const [rows] = await conn.query(`
            SELECT e.id, DATE_FORMAT(e.date, '%Y-%m-%d') as date,
                   COALESCE(e.time, DATE_FORMAT(e.created_at, '%h:%i %p')) as time,
                   COALESCE(ec.name, e.category_name) as category,
                   e.description,
                   e.payment_method as paymentMethod,
                   e.amount, e.note, e.recipient,
                   e.created_at as createdAt
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            ORDER BY e.date DESC, e.created_at DESC
          `);
          return rows.map((r) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            category: r.category,
            description: r.description,
            paymentMethod: r.paymentMethod === 'bkash' ? 'bKash' : r.paymentMethod === 'bank' ? 'Bank' : 'Cash',
            amount: Number(r.amount) || 0,
            recipient: r.recipient,
            note: r.note,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
          }));
        });
        return jsonResponse(expenses, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/expenses' && method === 'POST') {
      try {
        const data = await request.json();
        const expId = `exp-${Date.now()}`;
        const amount = Number(data.amount) || 0;
        const date = data.date || new Date().toISOString().split('T')[0];
        const time = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const pMethod = (data.paymentMethod || 'cash').toLowerCase();
        const categoryName = data.category || 'Other';

        const result = await withTransaction(env, async (conn) => {
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
            [expId, date, time, categoryId, categoryName, data.description, pMethod, amount, data.recipient || null, data.note || null]
          );

          await conn.query(
            `INSERT INTO financial_transactions (
              id, date, time, type, category, description, payment_method,
              amount, reference_type, reference_id, notes, created_at
            ) VALUES (?, ?, ?, 'EXPENSE', ?, ?, ?, ?, 'expense', ?, ?, NOW())`,
            [`tx-${Date.now()}`, date, time, categoryName, data.description, pMethod, amount, expId, data.note || null]
          );

          return {
            id: expId,
            date,
            time,
            category: categoryName,
            description: data.description,
            paymentMethod: pMethod === 'bkash' ? 'bKash' : pMethod === 'bank' ? 'Bank' : 'Cash',
            amount,
            recipient: data.recipient,
            note: data.note,
            createdAt: new Date().toISOString()
          };
        });

        return jsonResponse(result, 201, corsHeaders);
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
          await conn.query('DELETE FROM financial_transactions WHERE reference_type = "expense" AND reference_id = ?', [id]);
          await conn.query('DELETE FROM expenses WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
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

    if (path === '/api/expenses/categories' && method === 'POST') {
      try {
        const { name } = await request.json();
        if (!name || !name.trim()) return jsonResponse({ error: 'Category name is required' }, 400, corsHeaders);
        const cats = await withDb(env, async (conn) => {
          const [existing] = await conn.query('SELECT id FROM expense_categories WHERE LOWER(name) = ?', [name.trim().toLowerCase()]);
          if (existing.length === 0) {
            await conn.query('INSERT INTO expense_categories (id, name, status) VALUES (?, ?, "active")', [`exp_cat_${Date.now()}`, name.trim()]);
          }
          const [rows] = await conn.query('SELECT name FROM expense_categories WHERE status = "active" ORDER BY name ASC');
          return rows.map((r) => r.name);
        });
        return jsonResponse(cats, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/expenses\/categories\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete expense categories.' }, 403, corsHeaders);
      }
      try {
        const categoryName = decodeURIComponent(path.split('/')[4]);
        const cats = await withDb(env, async (conn) => {
          await conn.query('UPDATE expense_categories SET status = "inactive" WHERE LOWER(name) = ?', [categoryName.toLowerCase()]);
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
          const txType = data.type || 'Other Income';
          const refType = txType === 'Loan from MD' ? 'md_loan' : 'direct_cash_in';
          const amount = Number(data.amount) || 0;

          await conn.query(
            `INSERT INTO financial_transactions (
              id, date, time, type, category, description, payment_method,
              amount, reference_type, reference_id, notes, created_at
            ) VALUES (?, ?, ?, 'INCOME', ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              txId,
              date,
              time,
              txType,
              data.description,
              pMethod,
              amount,
              refType,
              data.reference || null,
              data.note || null
            ]
          );

          // If MD Loan received, mirror it into the loans/loan_payments tables
          // so it also shows up on the Loans tab, not just Cash In.
          if (txType === 'Loan from MD') {
            const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
            let loanId = loanRows.length > 0 ? loanRows[0].id : null;
            if (!loanId) {
              loanId = 'loan-md-default';
              await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
            }

            await conn.query(
              `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
               VALUES (?, ?, 'received', ?, ?, ?, ?, ?, ?, NOW())`,
              [
                `lp-${Date.now()}`,
                loanId,
                amount,
                date,
                time,
                pMethod,
                data.reference || null,
                data.note || data.description || 'Loan Received from MD'
              ]
            );
          }

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

    if (path.match(/^\/api\/transactions\/cash-in\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete cash-in transactions.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[4];
        await withDb(env, async (conn) => {
          await conn.query('DELETE FROM financial_transactions WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // INVENTORY
    // ----------------------------------------------------
    if (path === '/api/inventory/categories' && method === 'GET') {
      try {
        const cats = await withDb(env, async (conn) => {
          const [rows] = await conn.query('SELECT id, name, DATE_FORMAT(created_at, "%Y-%m-%d") as createdAt, DATE_FORMAT(updated_at, "%Y-%m-%d") as updatedAt FROM inventory_categories WHERE status = "active" ORDER BY name ASC');
          return rows;
        });
        return jsonResponse(cats, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/inventory/categories' && method === 'POST') {
      try {
        const { name } = await request.json();
        if (!name || !name.trim()) return jsonResponse({ error: 'Category name is required' }, 400, corsHeaders);
        const created = await withDb(env, async (conn) => {
          const trimmed = name.trim();
          const [existing] = await conn.query('SELECT * FROM inventory_categories WHERE LOWER(name) = ?', [trimmed.toLowerCase()]);
          if (existing.length > 0) return existing[0];
          const id = `cat-${Date.now()}`;
          const today = new Date().toISOString().split('T')[0];
          await conn.query('INSERT INTO inventory_categories (id, name, status, created_at, updated_at) VALUES (?, ?, "active", NOW(), NOW())', [id, trimmed]);
          return { id, name: trimmed, createdAt: today, updatedAt: today };
        });
        return jsonResponse(created, 201, corsHeaders);
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
            totalInventoryValue: Math.round(totalStockVal),
            lowStockCount: lowStock,
            outOfStockCount: outOfStock,
          };
        });
        return jsonResponse(summary, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/inventory/items' && method === 'GET') {
      try {
        const includeInactive = url.searchParams.get('includeInactive') === 'true';
        const items = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName, i.unit,
                   i.quantity, i.average_unit_cost as averageUnitCost, i.minimum_stock as minimumStock, i.notes,
                   (i.status = 'active') as isActive,
                   DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
                   DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            ${includeInactive ? '' : `WHERE i.status = 'active'`}
            ORDER BY i.name ASC
          `);
          return rows.map((r) => ({
            id: r.id,
            name: r.name,
            categoryId: r.categoryId,
            categoryName: r.categoryName || 'General',
            unit: r.unit,
            quantity: Number(r.quantity) || 0,
            averageUnitCost: Number(r.averageUnitCost) || 0,
            minimumStock: Number(r.minimumStock) || 0,
            notes: r.notes,
            isActive: Boolean(r.isActive),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
          }));
        });
        return jsonResponse(items, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+$/) && method === 'GET') {
      try {
        const id = path.split('/')[4];
        const item = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName, i.unit,
                   i.quantity, i.average_unit_cost as averageUnitCost, i.minimum_stock as minimumStock, i.notes,
                   (i.status = 'active') as isActive,
                   DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
                   DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            WHERE i.id = ?
          `, [id]);
          if (rows.length === 0) return null;
          const r = rows[0];
          return {
            id: r.id,
            name: r.name,
            categoryId: r.categoryId,
            categoryName: r.categoryName || 'General',
            unit: r.unit,
            quantity: Number(r.quantity) || 0,
            averageUnitCost: Number(r.averageUnitCost) || 0,
            minimumStock: Number(r.minimumStock) || 0,
            notes: r.notes,
            isActive: Boolean(r.isActive),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
          };
        });
        if (!item) return jsonResponse({ error: 'Inventory item not found' }, 404, corsHeaders);
        return jsonResponse(item, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+\/deactivate$/) && method === 'PATCH') {
      try {
        const id = path.split('/')[4];
        await withDb(env, async (conn) => {
          await conn.query('UPDATE inventory_items SET status = "inactive", updated_at = NOW() WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+\/reactivate$/) && method === 'PATCH') {
      try {
        const id = path.split('/')[4];
        await withDb(env, async (conn) => {
          await conn.query('UPDATE inventory_items SET status = "active", updated_at = NOW() WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/inventory/items' && method === 'POST') {
      try {
        const { name, categoryId, unit = 'Piece', initialQuantity = 0, unitCost = 0, minimumStock = 0, notes } = await request.json();
        if (!name || !name.trim() || !categoryId) {
          return jsonResponse({ error: 'Name and category are required' }, 400, corsHeaders);
        }
        const id = `inv-item-${Date.now()}`;
        const qty = Math.max(0, Number(initialQuantity) || 0);
        const cost = Math.max(0, Number(unitCost) || 0);
        const min = Math.max(0, Number(minimumStock) || 0);
        const today = new Date().toISOString().split('T')[0];

        const created = await withTransaction(env, async (conn) => {
          await conn.query(
            `INSERT INTO inventory_items (id, name, category_id, unit, quantity, average_unit_cost, minimum_stock, notes, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
            [id, name.trim(), categoryId, unit.trim() || 'Piece', qty, cost, min, notes || null]
          );

          if (qty > 0) {
            await conn.query(
              `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
               VALUES (?, ?, 'in', ?, ?, ?, 'Initial Stock', 'Opening inventory balance', ?, NOW())`,
              [`mov-${Date.now()}`, id, qty, cost, qty * cost, today]
            );
          }

          const [cats] = await conn.query('SELECT name FROM inventory_categories WHERE id = ?', [categoryId]);
          const categoryName = cats.length > 0 ? cats[0].name : 'Other';

          return {
            id,
            name: name.trim(),
            categoryId,
            categoryName,
            unit: unit.trim() || 'Piece',
            quantity: qty,
            averageUnitCost: cost,
            minimumStock: min,
            notes: notes || undefined,
            isActive: true,
            createdAt: today,
            updatedAt: today
          };
        });

        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+$/) && method === 'PUT') {
      try {
        const id = path.split('/')[4];
        const { name, categoryId, unit, minimumStock, notes } = await request.json();
        const updated = await withDb(env, async (conn) => {
          const updates = [];
          const params = [];
          if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
          if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
          if (unit !== undefined) { updates.push('unit = ?'); params.push(unit.trim()); }
          if (minimumStock !== undefined) { updates.push('minimum_stock = ?'); params.push(Number(minimumStock)); }
          if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
          if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE inventory_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
          }
          const [rows] = await conn.query(`
            SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName, i.unit,
                   i.quantity, i.average_unit_cost as averageUnitCost, i.minimum_stock as minimumStock, i.notes,
                   (i.status = 'active') as isActive,
                   DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
                   DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            WHERE i.id = ?
          `, [id]);
          return rows[0] || null;
        });
        if (!updated) return jsonResponse({ error: 'Inventory item not found' }, 404, corsHeaders);
        return jsonResponse(updated, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete inventory items.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[4];
        await withDb(env, async (conn) => {
          await conn.query('UPDATE inventory_items SET status = "inactive", updated_at = NOW() WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+\/stock-in$/) && method === 'POST') {
      try {
        const id = path.split('/')[4];
        const { quantity, unitCost, date, reason = 'Received', note } = await request.json();
        const qtyIn = Math.max(0, Number(quantity) || 0);
        const costIn = Math.max(0, Number(unitCost) || 0);
        if (qtyIn <= 0) return jsonResponse({ error: 'Quantity must be greater than zero.' }, 400, corsHeaders);
        const movementDate = date || new Date().toISOString().split('T')[0];

        const result = await withTransaction(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
          if (rows.length === 0) throw new Error('Inventory item not found');
          const item = rows[0];
          const currentQty = Number(item.quantity) || 0;
          const currentAvgCost = Number(item.average_unit_cost) || 0;
          const existingValue = currentQty * currentAvgCost;
          const incomingValue = qtyIn * costIn;
          const newTotalQty = currentQty + qtyIn;
          const newAvgCost = newTotalQty > 0 ? (existingValue + incomingValue) / newTotalQty : costIn;
          const roundedAvgCost = Number(newAvgCost.toFixed(2));

          await conn.query('UPDATE inventory_items SET quantity = ?, average_unit_cost = ?, updated_at = NOW() WHERE id = ?', [newTotalQty, roundedAvgCost, id]);

          const movId = `mov-${Date.now()}`;
          await conn.query(
            `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
             VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, NOW())`,
            [movId, id, qtyIn, costIn, incomingValue, reason, note || null, movementDate]
          );

          return {
            item: {
              ...item,
              quantity: newTotalQty,
              averageUnitCost: roundedAvgCost
            },
            movement: {
              id: movId,
              itemId: id,
              itemName: item.name,
              type: 'IN',
              quantity: qtyIn,
              unitCost: costIn,
              totalValue: incomingValue,
              reason,
              note,
              date: movementDate
            }
          };
        });

        return jsonResponse(result, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+\/stock-out$/) && method === 'POST') {
      try {
        const id = path.split('/')[4];
        const { quantity, date, reason = 'Used', note } = await request.json();
        const qtyOut = Math.max(0, Number(quantity) || 0);
        if (qtyOut <= 0) return jsonResponse({ error: 'Quantity must be greater than zero.' }, 400, corsHeaders);
        const movementDate = date || new Date().toISOString().split('T')[0];

        const result = await withTransaction(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
          if (rows.length === 0) throw new Error('Inventory item not found');
          const item = rows[0];
          const currentQty = Number(item.quantity) || 0;
          if (currentQty < qtyOut) throw new Error(`Insufficient stock. Available: ${currentQty}, Requested: ${qtyOut}`);

          const currentAvgCost = Number(item.average_unit_cost) || 0;
          const newTotalQty = currentQty - qtyOut;
          const totalVal = qtyOut * currentAvgCost;

          await conn.query('UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE id = ?', [newTotalQty, id]);

          const movId = `mov-${Date.now()}`;
          await conn.query(
            `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
             VALUES (?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
            [movId, id, qtyOut, currentAvgCost, totalVal, reason, note || null, movementDate]
          );

          return {
            item: {
              ...item,
              quantity: newTotalQty
            },
            movement: {
              id: movId,
              itemId: id,
              itemName: item.name,
              type: 'OUT',
              quantity: qtyOut,
              unitCost: currentAvgCost,
              totalValue: totalVal,
              reason,
              note,
              date: movementDate
            }
          };
        });

        return jsonResponse(result, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/inventory\/items\/[^/]+\/adjust$/) && method === 'POST') {
      try {
        const id = path.split('/')[4];
        const { actualQuantity, date, reason = 'Audit Correction', note } = await request.json();
        const targetQty = Math.max(0, Number(actualQuantity) || 0);
        const movementDate = date || new Date().toISOString().split('T')[0];

        const result = await withTransaction(env, async (conn) => {
          const [rows] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
          if (rows.length === 0) throw new Error('Inventory item not found');
          const item = rows[0];
          const currentQty = Number(item.quantity) || 0;
          const diff = targetQty - currentQty;
          const currentAvgCost = Number(item.average_unit_cost) || 0;

          await conn.query('UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE id = ?', [targetQty, id]);

          const movId = `mov-${Date.now()}`;
          await conn.query(
            `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
             VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?, ?, NOW())`,
            [movId, id, diff, currentAvgCost, Math.abs(diff) * currentAvgCost, reason, note || null, movementDate]
          );

          return {
            item: { ...item, quantity: targetQty },
            movement: { id: movId, itemId: id, itemName: item.name, type: 'ADJUSTMENT', quantity: diff, date: movementDate }
          };
        });

        return jsonResponse(result, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/inventory/movements' && method === 'GET') {
      try {
        const movements = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT m.id, m.inventory_item_id as itemId, i.name as itemName,
                   CASE m.movement_type WHEN 'in' THEN 'IN' WHEN 'out' THEN 'OUT' ELSE 'ADJUSTMENT' END as type,
                   m.quantity, m.unit_cost as unitCost, m.total_value as totalValue,
                   m.reason, m.note,
                   DATE_FORMAT(m.movement_date, '%Y-%m-%d') as date,
                   DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i') as createdAt
            FROM inventory_movements m
            LEFT JOIN inventory_items i ON m.inventory_item_id = i.id
            ORDER BY m.movement_date DESC, m.created_at DESC
          `);
          return rows.map((r) => ({
            ...r,
            quantity: Number(r.quantity) || 0,
            unitCost: Number(r.unitCost) || 0,
            totalValue: Number(r.totalValue) || 0,
          }));
        });
        return jsonResponse(movements, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // ----------------------------------------------------
    // LOANS
    // ----------------------------------------------------
    if ((path === '/api/loans' || path === '/api/loans/summary') && method === 'GET') {
      try {
        const loanSummary = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT 
              COALESCE(SUM(CASE WHEN payment_type = 'received' THEN amount ELSE 0 END), 0) as totalReceived,
              COALESCE(SUM(CASE WHEN payment_type = 'repayment' THEN amount ELSE 0 END), 0) as totalRepaid
            FROM loan_payments
          `);
          const totalReceived = Number(rows[0]?.totalReceived) || 0;
          const totalRepaid = Number(rows[0]?.totalRepaid) || 0;
          return {
            totalReceived,
            totalRepaid,
            remaining: Math.max(0, totalReceived - totalRepaid),
            totalBorrowed: totalReceived,
            currentBalance: Math.max(0, totalReceived - totalRepaid),
          };
        });
        return jsonResponse(loanSummary, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/loans/records' && method === 'GET') {
      try {
        const records = await withDb(env, async (conn) => {
          const [rows] = await conn.query(`
            SELECT id, DATE_FORMAT(payment_date, '%Y-%m-%d') as date,
                   COALESCE(payment_time, DATE_FORMAT(created_at, '%h:%i %p')) as time,
                   CASE payment_type WHEN 'received' THEN 'Received' ELSE 'Repayment' END as type,
                   amount,
                   payment_method as paymentMethod,
                   notes as note,
                   created_at as createdAt
            FROM loan_payments
            ORDER BY payment_date DESC, created_at DESC
          `);
          return rows.map((r) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            type: r.type,
            amount: Number(r.amount) || 0,
            paymentMethod: r.paymentMethod === 'bkash' ? 'bKash' : r.paymentMethod === 'bank' ? 'Bank' : 'Cash',
            note: r.note,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString()
          }));
        });
        return jsonResponse(records, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path === '/api/loans/records' && method === 'POST') {
      try {
        const data = await request.json();
        const isReceived = String(data.type).toLowerCase() === 'received';
        const pType = isReceived ? 'received' : 'repayment';
        const amount = Number(data.amount) || 0;
        const date = data.date || new Date().toISOString().split('T')[0];
        const time = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const pMethod = (data.paymentMethod || 'cash').toLowerCase();
        const id = `lp-${Date.now()}`;

        const created = await withTransaction(env, async (conn) => {
          const [loanRows] = await conn.query('SELECT id FROM loans LIMIT 1');
          let loanId = loanRows.length > 0 ? loanRows[0].id : null;
          if (!loanId) {
            loanId = 'loan-md-default';
            await conn.query('INSERT INTO loans (id, name, loan_type, total_amount, status) VALUES (?, "MD Loan", "md_loan", 0.00, "active")', [loanId]);
          }

          await conn.query(
            `INSERT INTO loan_payments (id, loan_id, payment_type, amount, payment_date, payment_time, payment_method, reference, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [id, loanId, pType, amount, date, time, pMethod, data.reference || null, data.note || null]
          );

          const txType = isReceived ? 'INCOME' : 'EXPENSE';
          const txCategory = isReceived ? 'Loan from MD' : 'Loan Repayment';
          const txDesc = isReceived ? `Loan Received from MD (${data.note || 'Cash flow support'})` : `Loan Repayment to MD (${data.note || 'Loan settlement'})`;

          await conn.query(
            `INSERT INTO financial_transactions (id, date, time, type, category, description, payment_method, amount, reference_type, reference_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'loan', ?, ?, NOW())`,
            [`tx-${Date.now()}`, date, time, txType, txCategory, txDesc, pMethod, amount, id, data.note || null]
          );

          return {
            id,
            date,
            time,
            type: isReceived ? 'Received' : 'Repayment',
            amount,
            paymentMethod: pMethod === 'bkash' ? 'bKash' : pMethod === 'bank' ? 'Bank' : 'Cash',
            note: data.note,
            createdAt: new Date().toISOString()
          };
        });

        return jsonResponse(created, 201, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    if (path.match(/^\/api\/loans\/records\/[^/]+$/) && method === 'DELETE') {
      const user = getUser(request, env);
      if (user && user.role === 'staff') {
        return jsonResponse({ error: 'Staff users are not permitted to delete loan records.' }, 403, corsHeaders);
      }
      try {
        const id = path.split('/')[4];
        await withTransaction(env, async (conn) => {
          await conn.query('DELETE FROM financial_transactions WHERE reference_type = "loan" AND reference_id = ?', [id]);
          await conn.query('DELETE FROM loan_payments WHERE id = ?', [id]);
        });
        return jsonResponse({ success: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, corsHeaders);
      }
    }

    // Static Assets Fallback
    const assetRes = await env.ASSETS.fetch(request);
    if (path === '/' || path.endsWith('.html') || !path.includes('.')) {
      const newHeaders = new Headers(assetRes.headers);
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');
      return new Response(assetRes.body, {
        status: assetRes.status,
        statusText: assetRes.statusText,
        headers: newHeaders,
      });
    }
    return assetRes;
  },

  async scheduled(event, env, ctx) {
    if (event.cron === '0 17 * * *') {
      ctx.waitUntil(sendDailySummaryEmail(env));
    } else {
      ctx.waitUntil(processSmsQueue(env));
    }
  },
};
