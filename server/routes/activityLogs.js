import express from 'express';
import pool from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET activity logs (Super Admin only)
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only a Super Admin can view the activity log.' });
    }

    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));

    const [rows] = await pool.query(
      `SELECT id, user_id as userId, user_name as userName, user_role as userRole,
              action, entity_type as entityType, entity_id as entityId,
              entity_label as entityLabel, description, created_at as createdAt
       FROM activity_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
