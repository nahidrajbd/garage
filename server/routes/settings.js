import express from 'express';
import pool from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET Settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settingsMap = {};
    for (const r of rows) {
      settingsMap[r.setting_key] = r.setting_value;
    }

    res.json({
      businessName: settingsMap['business_name'] || 'Arshi Automobile & Car Hub',
      phone: settingsMap['phone'] || '01712110902',
      altPhone: settingsMap['alt_phone'] || '01712345678',
      address: settingsMap['address'] || 'Bhadra Mor, Station Road, Rajshahi, Bangladesh',
      email: settingsMap['email'] || 'arshi.autohub@gmail.com',
      invoicePrefix: settingsMap['invoice_prefix'] || 'INV-',
      defaultFooterText: settingsMap['default_footer_text'] || 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.',
      currencySymbol: settingsMap['currency_symbol'] || '৳'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Settings
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    const mapping = {
      businessName: 'business_name',
      phone: 'phone',
      altPhone: 'alt_phone',
      address: 'address',
      email: 'email',
      invoicePrefix: 'invoice_prefix',
      defaultFooterText: 'default_footer_text',
      currencySymbol: 'currency_symbol'
    };

    for (const [key, val] of Object.entries(updates)) {
      const dbKey = mapping[key] || key;
      await pool.query(
        `INSERT INTO settings (id, setting_key, setting_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
        [`set_${dbKey}`, dbKey, String(val || '')]
      );
    }

    // Return current settings
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settingsMap = {};
    for (const r of rows) {
      settingsMap[r.setting_key] = r.setting_value;
    }

    res.json({
      businessName: settingsMap['business_name'] || 'Arshi Automobile & Car Hub',
      phone: settingsMap['phone'] || '01712110902',
      altPhone: settingsMap['alt_phone'] || '01712345678',
      address: settingsMap['address'] || 'Bhadra Mor, Station Road, Rajshahi, Bangladesh',
      email: settingsMap['email'] || 'arshi.autohub@gmail.com',
      invoicePrefix: settingsMap['invoice_prefix'] || 'INV-',
      defaultFooterText: settingsMap['default_footer_text'] || 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.',
      currencySymbol: settingsMap['currency_symbol'] || '৳'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Services Catalog
router.get('/services', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, category, description, default_price as defaultPrice
       FROM services
       WHERE status = 'active'
       ORDER BY name ASC`
    );
    res.json(rows.map(r => ({ ...r, defaultPrice: Number(r.defaultPrice) || 0 })));
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD Service
router.post('/services', async (req, res) => {
  try {
    const { name, defaultPrice = 0, category, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name is required' });

    const id = `srv-${Date.now()}`;
    const price = Number(defaultPrice) || 0;

    await pool.query(
      `INSERT INTO services (id, name, category, description, default_price, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [id, name.trim(), category || null, description || null, price]
    );

    res.status(201).json({
      id,
      name: name.trim(),
      category,
      description,
      defaultPrice: price
    });
  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Service
router.delete('/services/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete services.' });
    }
    const { id } = req.params;
    await pool.query('UPDATE services SET status = "inactive" WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
