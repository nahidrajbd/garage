import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All user management routes require Super Admin authentication
router.use(authenticate, requireSuperAdmin);

// GET all users
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, username, role, status,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as createdAt,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') as updatedAt
       FROM users
       ORDER BY role DESC, created_at ASC`
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE user
router.post('/', async (req, res) => {
  try {
    const { name, username, password, role = 'staff' } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username '${cleanUsername}' is already taken.` });
    }

    const validRole = role === 'super_admin' ? 'super_admin' : 'staff';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;

    await pool.query(
      `INSERT INTO users (id, name, username, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [userId, name.trim(), cleanUsername, hashedPassword, validRole]
    );

    res.status(201).json({
      id: userId,
      name: name.trim(),
      username: cleanUsername,
      role: validRole,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE user (name, role, status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (role !== undefined) {
      const validRole = role === 'super_admin' ? 'super_admin' : 'staff';
      updates.push('role = ?');
      params.push(validRole);
    }
    if (status !== undefined) {
      const validStatus = status === 'inactive' ? 'inactive' : 'active';
      updates.push('status = ?');
      params.push(validStatus);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    }

    const [rows] = await pool.query('SELECT id, name, username, role, status FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// RESET user password
router.put('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }

    const [superAdmins] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "super_admin" AND status = "active"');
    const [targetUser] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);

    if (targetUser.length > 0 && targetUser[0].role === 'super_admin' && superAdmins[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining active Super Admin.' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
