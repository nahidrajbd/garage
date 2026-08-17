import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET all customers with vehicles & visit stats
router.get('/', async (req, res) => {
  try {
    const [customers] = await pool.query(
      `SELECT c.id, c.name, c.phone, c.email, c.address, c.notes, c.status,
              c.created_at as createdAt,
              (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id OR i.customer_phone = c.phone) +
              (SELECT COUNT(*) FROM job_cards j WHERE j.customer_id = c.id OR j.customer_phone = c.phone) as totalVisits,
              COALESCE(
                (SELECT MAX(date) FROM invoices i WHERE i.customer_id = c.id OR i.customer_phone = c.phone),
                (SELECT MAX(date) FROM job_cards j WHERE j.customer_id = c.id OR j.customer_phone = c.phone),
                DATE_FORMAT(c.created_at, '%Y-%m-%d')
              ) as lastServiceDate
       FROM customers c
       ORDER BY c.created_at DESC`
    );

    const [vehicles] = await pool.query(
      `SELECT id, customer_id as customerId, registration_number as registrationNumber,
              make, model, model_year as year, color, mileage, notes
       FROM vehicles`
    );

    const vehicleMap = {};
    for (const v of vehicles) {
      if (!vehicleMap[v.customerId]) {
        vehicleMap[v.customerId] = [];
      }
      vehicleMap[v.customerId].push(v);
    }

    const formatted = customers.map(c => ({
      ...c,
      vehicles: vehicleMap[c.id] || [],
      totalVisits: Math.max(1, parseInt(c.totalVisits, 10) || 1),
      lastServiceDate: c.lastServiceDate || new Date().toISOString().split('T')[0],
      createdAt: typeof c.createdAt === 'string' ? c.createdAt.split('T')[0] : new Date(c.createdAt).toISOString().split('T')[0]
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.phone, c.email, c.address, c.notes, c.status,
              c.created_at as createdAt,
              (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id) as totalVisits,
              COALESCE(
                (SELECT MAX(date) FROM invoices i WHERE i.customer_id = c.id),
                DATE_FORMAT(c.created_at, '%Y-%m-%d')
              ) as lastServiceDate
       FROM customers c
       WHERE c.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [vehicles] = await pool.query(
      `SELECT id, customer_id as customerId, registration_number as registrationNumber,
              make, model, model_year as year, color, mileage, notes
       FROM vehicles WHERE customer_id = ?`,
      [id]
    );

    const cust = rows[0];
    res.json({
      ...cust,
      vehicles: vehicles || [],
      totalVisits: Math.max(1, parseInt(cust.totalVisits, 10) || 1),
      createdAt: typeof cust.createdAt === 'string' ? cust.createdAt.split('T')[0] : new Date(cust.createdAt).toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, email, notes, vehicles = [] } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const customerId = `cust-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    const result = await withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO customers (id, name, phone, email, address, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [customerId, name.trim(), phone.trim(), email || null, address || null, notes || null]
      );

      const createdVehicles = [];
      for (const v of vehicles) {
        const vId = v.id || `veh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await conn.query(
          `INSERT INTO vehicles (id, customer_id, registration_number, make, model, model_year, color, mileage, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [vId, customerId, v.registrationNumber, v.make || null, v.model || 'Vehicle', v.year || null, v.color || null, v.mileage || null, v.notes || null]
        );
        createdVehicles.push({
          id: vId,
          customerId,
          registrationNumber: v.registrationNumber,
          model: v.model || 'Vehicle',
          year: v.year,
          color: v.color,
          mileage: v.mileage
        });
      }

      return {
        id: customerId,
        name: name.trim(),
        phone: phone.trim(),
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
        vehicles: createdVehicles,
        totalVisits: 1,
        lastServiceDate: today,
        createdAt: today
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, email, notes, vehicles } = req.body;

    await withTransaction(async (conn) => {
      const updates = [];
      const params = [];

      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
      if (address !== undefined) { updates.push('address = ?'); params.push(address); }
      if (email !== undefined) { updates.push('email = ?'); params.push(email); }
      if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

      if (updates.length > 0) {
        params.push(id);
        await conn.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      // If vehicles provided, add any new vehicles
      if (Array.isArray(vehicles)) {
        for (const v of vehicles) {
          if (!v.id || v.id.startsWith('new-') || v.id.startsWith('temp-')) {
            const vId = `veh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await conn.query(
              `INSERT INTO vehicles (id, customer_id, registration_number, make, model, model_year, color, mileage, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [vId, id, v.registrationNumber, v.make || null, v.model || 'Vehicle', v.year || null, v.color || null, v.mileage || null]
            );
          } else {
            await conn.query(
              `UPDATE vehicles SET registration_number = ?, model = ?, model_year = ?, color = ?, mileage = ?
               WHERE id = ? AND customer_id = ?`,
              [v.registrationNumber, v.model, v.year || null, v.color || null, v.mileage || null, v.id, id]
            );
          }
        }
      }
    });

    // Return updated customer
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    const [custVehicles] = await pool.query('SELECT id, customer_id as customerId, registration_number as registrationNumber, model, model_year as year, color, mileage FROM vehicles WHERE customer_id = ?', [id]);

    res.json({
      ...rows[0],
      vehicles: custVehicles
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Customer
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete customers.' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
