import express from 'express';
import pool from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const SELECT_COLUMNS = `id, name, specialty, phone, email, facebook_link as facebookLink, photo, blood_group as bloodGroup,
  nid_or_birth_cert as nidOrBirthCert, identification_mark as identificationMark, reference,
  present_address as presentAddress, permanent_address as permanentAddress,
  emergency_contact_name as emergencyContactName, emergency_contact_phone as emergencyContactPhone,
  status, created_at`;

// GET all active technicians
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM technicians WHERE status = "active" ORDER BY name ASC`
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
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    const id = `tech-${Date.now()}`;
    await pool.query(
      `INSERT INTO technicians (
        id, name, specialty, phone, email, facebook_link, photo, blood_group,
        nid_or_birth_cert, identification_mark, reference, present_address, permanent_address,
        emergency_contact_name, emergency_contact_phone, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "active", NOW())`,
      [
        id,
        data.name.trim(),
        data.specialty?.trim() || null,
        data.phone?.trim() || null,
        data.email?.trim() || null,
        data.facebookLink?.trim() || null,
        data.photo || null,
        data.bloodGroup?.trim() || null,
        data.nidOrBirthCert?.trim() || null,
        data.identificationMark?.trim() || null,
        data.reference?.trim() || null,
        data.presentAddress?.trim() || null,
        data.permanentAddress?.trim() || null,
        data.emergencyContactName?.trim() || null,
        data.emergencyContactPhone?.trim() || null,
      ]
    );

    res.status(201).json({ ...data, id, status: 'active' });
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a technician
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    await pool.query(
      `UPDATE technicians SET
        name = ?, specialty = ?, phone = ?, email = ?, facebook_link = ?, photo = ?, blood_group = ?,
        nid_or_birth_cert = ?, identification_mark = ?, reference = ?, present_address = ?, permanent_address = ?,
        emergency_contact_name = ?, emergency_contact_phone = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        data.name.trim(),
        data.specialty?.trim() || null,
        data.phone?.trim() || null,
        data.email?.trim() || null,
        data.facebookLink?.trim() || null,
        data.photo || null,
        data.bloodGroup?.trim() || null,
        data.nidOrBirthCert?.trim() || null,
        data.identificationMark?.trim() || null,
        data.reference?.trim() || null,
        data.presentAddress?.trim() || null,
        data.permanentAddress?.trim() || null,
        data.emergencyContactName?.trim() || null,
        data.emergencyContactPhone?.trim() || null,
        id,
      ]
    );

    res.json({ ...data, id, status: 'active' });
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
