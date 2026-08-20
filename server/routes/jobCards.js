import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to map DB status to frontend casing
const statusMapToFrontend = {
  in_progress: 'In Progress',
  completed: 'Completed'
};

const statusMapToDb = {
  'In Progress': 'in_progress',
  'Completed': 'completed'
};

// GET all Job Cards
router.get('/', async (req, res) => {
  try {
    const [jobCards] = await pool.query(
      `SELECT j.id, j.job_card_number as jobCardNumber, j.customer_id as customerId, j.vehicle_id as vehicleId,
              j.customer_name as customerName, j.customer_phone as customerPhone,
              j.vehicle_registration as vehicleRegistration, j.vehicle_model as vehicleModel,
              j.mileage, DATE_FORMAT(j.date, '%Y-%m-%d') as date,
              DATE_FORMAT(j.expected_delivery_date, '%Y-%m-%d') as expectedDeliveryDate,
              j.status, j.customer_complaint as customerComplaint, j.vehicle_condition as vehicleCondition,
              j.assigned_to as assignedTo, j.notes,
              j.quotation_id as quotationId, q.quotation_number as quotationNumber,
              j.invoice_id as invoiceId, i.invoice_number as invoiceNumber,
              j.created_at as createdAt, j.updated_at as updatedAt
       FROM job_cards j
       LEFT JOIN quotations q ON j.quotation_id = q.id
       LEFT JOIN invoices i ON j.invoice_id = i.id
       ORDER BY j.created_at DESC`
    );

    const [items] = await pool.query(
      `SELECT id, job_card_id as jobCardId, service_name as serviceName, description
       FROM job_card_items`
    );

    const [photos] = await pool.query(
      `SELECT id, job_card_id as jobCardId, photo_type as photoType, file_path as filePath
       FROM job_card_photos`
    );

    const itemMap = {};
    for (const item of items) {
      if (!itemMap[item.jobCardId]) itemMap[item.jobCardId] = [];
      itemMap[item.jobCardId].push(item);
    }

    const beforePhotosMap = {};
    const afterPhotosMap = {};
    for (const p of photos) {
      if (p.photoType === 'before') {
        if (!beforePhotosMap[p.jobCardId]) beforePhotosMap[p.jobCardId] = [];
        beforePhotosMap[p.jobCardId].push(p.filePath);
      } else {
        if (!afterPhotosMap[p.jobCardId]) afterPhotosMap[p.jobCardId] = [];
        afterPhotosMap[p.jobCardId].push(p.filePath);
      }
    }

    const formatted = jobCards.map(j => ({
      ...j,
      status: statusMapToFrontend[j.status] || 'In Progress',
      requiredWork: itemMap[j.id] || [],
      beforePhotos: beforePhotosMap[j.id] || [],
      afterPhotos: afterPhotosMap[j.id] || [],
      createdAt: typeof j.createdAt === 'string' ? j.createdAt : new Date(j.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching job cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Job Card by ID or Number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT j.id, j.job_card_number as jobCardNumber, j.customer_id as customerId, j.vehicle_id as vehicleId,
              j.customer_name as customerName, j.customer_phone as customerPhone,
              j.vehicle_registration as vehicleRegistration, j.vehicle_model as vehicleModel,
              j.mileage, DATE_FORMAT(j.date, '%Y-%m-%d') as date,
              DATE_FORMAT(j.expected_delivery_date, '%Y-%m-%d') as expectedDeliveryDate,
              j.status, j.customer_complaint as customerComplaint, j.vehicle_condition as vehicleCondition,
              j.assigned_to as assignedTo, j.notes,
              j.quotation_id as quotationId, q.quotation_number as quotationNumber,
              j.invoice_id as invoiceId, i.invoice_number as invoiceNumber,
              j.created_at as createdAt, j.updated_at as updatedAt
       FROM job_cards j
       LEFT JOIN quotations q ON j.quotation_id = q.id
       LEFT JOIN invoices i ON j.invoice_id = i.id
       WHERE j.id = ? OR j.job_card_number = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job Card not found' });
    }

    const jc = rows[0];
    const [items] = await pool.query(
      `SELECT id, job_card_id as jobCardId, service_name as serviceName, description
       FROM job_card_items WHERE job_card_id = ?`,
      [jc.id]
    );

    const [photos] = await pool.query(
      `SELECT id, job_card_id as jobCardId, photo_type as photoType, file_path as filePath
       FROM job_card_photos WHERE job_card_id = ?`,
      [jc.id]
    );

    res.json({
      ...jc,
      status: statusMapToFrontend[jc.status] || 'In Progress',
      requiredWork: items || [],
      beforePhotos: photos.filter(p => p.photoType === 'before').map(p => p.filePath),
      afterPhotos: photos.filter(p => p.photoType === 'after').map(p => p.filePath),
      createdAt: typeof jc.createdAt === 'string' ? jc.createdAt : new Date(jc.createdAt).toISOString()
    });
  } catch (error) {
    console.error('Error fetching job card:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Job Card
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const jcId = `jc-${Date.now()}`;
    const dbStatus = statusMapToDb[data.status] || 'in_progress';

    const result = await withTransaction(async (conn) => {
      // Auto find or create customer if needed
      let customerId = data.customerId;
      let vehicleId = data.vehicleId;

      if (!customerId && data.customerPhone) {
        const [existingCust] = await conn.query('SELECT id FROM customers WHERE phone = ?', [data.customerPhone]);
        if (existingCust.length > 0) {
          customerId = existingCust[0].id;
        } else if (data.customerName) {
          customerId = `cust-${Date.now()}`;
          await conn.query(
            `INSERT INTO customers (id, name, phone, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
            [customerId, data.customerName, data.customerPhone]
          );
        }
      }

      // Check/create vehicle
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

      // Insert Job Card
      await conn.query(
        `INSERT INTO job_cards (
          id, job_card_number, customer_id, vehicle_id, customer_name, customer_phone,
          vehicle_registration, vehicle_model, mileage, date, expected_delivery_date,
          status, customer_complaint, vehicle_condition, assigned_to, notes,
          quotation_id, invoice_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          jcId,
          data.jobCardNumber,
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
          data.invoiceId || null
        ]
      );

      // Insert Work items
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
            description: item.description
          });
        }
      }

      // Insert Photos
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
        customerId,
        vehicleId,
        status: data.status || 'In Progress',
        requiredWork: createdItems,
        beforePhotos: data.beforePhotos || [],
        afterPhotos: data.afterPhotos || [],
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating job card:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Job Card
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    await withTransaction(async (conn) => {
      const updates = [];
      const params = [];

      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(statusMapToDb[data.status] || data.status.toLowerCase());
      }
      if (data.customerName !== undefined) { updates.push('customer_name = ?'); params.push(data.customerName); }
      if (data.customerPhone !== undefined) { updates.push('customer_phone = ?'); params.push(data.customerPhone); }
      if (data.vehicleRegistration !== undefined) { updates.push('vehicle_registration = ?'); params.push(data.vehicleRegistration); }
      if (data.vehicleModel !== undefined) { updates.push('vehicle_model = ?'); params.push(data.vehicleModel); }
      if (data.mileage !== undefined) { updates.push('mileage = ?'); params.push(data.mileage); }
      if (data.expectedDeliveryDate !== undefined) { updates.push('expected_delivery_date = ?'); params.push(data.expectedDeliveryDate); }
      if (data.customerComplaint !== undefined) { updates.push('customer_complaint = ?'); params.push(data.customerComplaint); }
      if (data.vehicleCondition !== undefined) { updates.push('vehicle_condition = ?'); params.push(data.vehicleCondition); }
      if (data.assignedTo !== undefined) { updates.push('assigned_to = ?'); params.push(data.assignedTo); }
      if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes); }
      if (data.quotationId !== undefined) { updates.push('quotation_id = ?'); params.push(data.quotationId); }
      if (data.invoiceId !== undefined) { updates.push('invoice_id = ?'); params.push(data.invoiceId); }

      if (updates.length > 0) {
        params.push(id);
        await conn.query(`UPDATE job_cards SET ${updates.join(', ')} WHERE id = ?`, params);
      }
    });

    const [rows] = await pool.query('SELECT * FROM job_cards WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating job card:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const dbStatus = statusMapToDb[status] || status.toLowerCase();

    await pool.query('UPDATE job_cards SET status = ? WHERE id = ?', [dbStatus, id]);
    res.json({ id, status });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: error.message });
  }
});

// LINK Quotation
router.post('/:id/link-quotation', async (req, res) => {
  try {
    const { id } = req.params;
    const { quotationId } = req.body;
    await pool.query('UPDATE job_cards SET quotation_id = ? WHERE id = ?', [quotationId, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error linking quotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// LINK Invoice
router.post('/:id/link-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceId } = req.body;
    // Converting to an invoice means the workshop job is done
    await pool.query('UPDATE job_cards SET invoice_id = ?, status = ? WHERE id = ?', [invoiceId, 'completed', id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error linking invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Job Card
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete job cards.' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM job_cards WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job card:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
