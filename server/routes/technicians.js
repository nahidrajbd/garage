import express from 'express';
import pool from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET all active technicians
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, specialty, phone, status, created_at FROM technicians WHERE status = "active" ORDER BY name ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE a technician
router.post('/', async (req, res) => {
  try {
    const { name, specialty, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    const id = `tech-${Date.now()}`;
    await pool.query(
      'INSERT INTO technicians (id, name, specialty, phone, status, created_at) VALUES (?, ?, ?, ?, "active", NOW())',
      [id, name.trim(), specialty?.trim() || null, phone?.trim() || null]
    );

    res.status(201).json({
      id,
      name: name.trim(),
      specialty: specialty?.trim() || '',
      phone: phone?.trim() || '',
      status: 'active',
    });
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a technician
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialty, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    await pool.query(
      'UPDATE technicians SET name = ?, specialty = ?, phone = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), specialty?.trim() || null, phone?.trim() || null, id]
    );

    res.json({
      id,
      name: name.trim(),
      specialty: specialty?.trim() || '',
      phone: phone?.trim() || '',
      status: 'active',
    });
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE / DEACTIVATE a technician
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete technicians.' });
    }
    const { id } = req.params;
    await pool.query('UPDATE technicians SET status = "inactive", updated_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true, message: 'Technician deleted successfully' });
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
