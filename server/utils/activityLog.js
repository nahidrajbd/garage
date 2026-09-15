import pool from '../db.js';

// Records one row in activity_logs. Never throws - a logging failure should
// never block the actual action (invoice save, job card update, etc).
export async function logActivity(conn, { user, action, entityType, entityId, entityLabel, description }) {
  try {
    const db = conn || pool;
    await db.query(
      `INSERT INTO activity_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, entity_label, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user?.id || null,
        user?.name || 'Unknown',
        user?.role || 'unknown',
        action,
        entityType,
        entityId || null,
        entityLabel || null,
        description
      ]
    );
  } catch (err) {
    console.error('Failed to record activity log:', err);
  }
}
