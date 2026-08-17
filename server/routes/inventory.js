import express from 'express';
import pool, { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET Inventory Categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%d') as createdAt,
              DATE_FORMAT(updated_at, '%Y-%m-%d') as updatedAt
       FROM inventory_categories
       WHERE status = 'active'
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD Inventory Category
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmed = name.trim();
    const [existing] = await pool.query('SELECT * FROM inventory_categories WHERE LOWER(name) = ?', [trimmed.toLowerCase()]);
    if (existing.length > 0) {
      return res.json(existing[0]);
    }

    const id = `cat-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO inventory_categories (id, name, status, created_at, updated_at)
       VALUES (?, ?, 'active', NOW(), NOW())`,
      [id, trimmed]
    );

    res.status(201).json({ id, name: trimmed, createdAt: today, updatedAt: today });
  } catch (error) {
    console.error('Error adding inventory category:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Inventory Summary Metrics
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as totalItems,
        COALESCE(SUM(CASE WHEN quantity > 0 AND quantity <= minimum_stock THEN 1 ELSE 0 END), 0) as lowStockCount,
        COALESCE(SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END), 0) as outOfStockCount,
        COALESCE(SUM(quantity * average_unit_cost), 0) as totalInventoryValue
       FROM inventory_items
       WHERE status = 'active'`
    );

    const r = rows[0];
    res.json({
      totalItems: Number(r.totalItems) || 0,
      lowStockCount: Number(r.lowStockCount) || 0,
      outOfStockCount: Number(r.outOfStockCount) || 0,
      totalInventoryValue: Math.round(Number(r.totalInventoryValue) || 0)
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Inventory Items (with includeInactive query param)
router.get('/items', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    let query = `
      SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName,
             i.unit, i.quantity, i.average_unit_cost as averageUnitCost,
             i.minimum_stock as minimumStock, i.notes,
             (i.status = 'active') as isActive,
             DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
             DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
    `;
    if (!includeInactive) {
      query += ` WHERE i.status = 'active'`;
    }
    query += ` ORDER BY i.name ASC`;

    const [items] = await pool.query(query);
    const formatted = items.map(it => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      averageUnitCost: Number(it.averageUnitCost) || 0,
      minimumStock: Number(it.minimumStock) || 0,
      isActive: Boolean(it.isActive)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Inventory Item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName,
              i.unit, i.quantity, i.average_unit_cost as averageUnitCost,
              i.minimum_stock as minimumStock, i.notes,
              (i.status = 'active') as isActive,
              DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
              DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const it = rows[0];
    res.json({
      ...it,
      quantity: Number(it.quantity) || 0,
      averageUnitCost: Number(it.averageUnitCost) || 0,
      minimumStock: Number(it.minimumStock) || 0,
      isActive: Boolean(it.isActive)
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE Inventory Item
router.post('/items', async (req, res) => {
  try {
    const { name, categoryId, unit = 'Piece', initialQuantity = 0, unitCost = 0, minimumStock = 0, notes } = req.body;
    if (!name || !name.trim() || !categoryId) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const id = `inv-item-${Date.now()}`;
    const qty = Math.max(0, Number(initialQuantity) || 0);
    const cost = Math.max(0, Number(unitCost) || 0);
    const min = Math.max(0, Number(minimumStock) || 0);
    const today = new Date().toISOString().split('T')[0];

    const result = await withTransaction(async (conn) => {
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

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Inventory Item
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, unit, minimumStock, notes } = req.body;

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
    if (unit !== undefined) { updates.push('unit = ?'); params.push(unit.trim()); }
    if (minimumStock !== undefined) { updates.push('minimum_stock = ?'); params.push(Number(minimumStock)); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE inventory_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    }

    const [rows] = await pool.query(
      `SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName,
              i.unit, i.quantity, i.average_unit_cost as averageUnitCost,
              i.minimum_stock as minimumStock, i.notes,
              (i.status = 'active') as isActive,
              DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
              DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.id = ?`,
      [id]
    );

    res.json({
      ...rows[0],
      quantity: Number(rows[0].quantity) || 0,
      averageUnitCost: Number(rows[0].averageUnitCost) || 0,
      minimumStock: Number(rows[0].minimumStock) || 0,
      isActive: Boolean(rows[0].isActive)
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// STOCK IN (WEIGHTED AVERAGE UNIT COST FORMULA)
router.post('/items/:id/stock-in', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unitCost, date, reason = 'Received', note } = req.body;

    const qtyIn = Math.max(0, Number(quantity) || 0);
    const costIn = Math.max(0, Number(unitCost) || 0);
    if (qtyIn <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero.' });
    }

    const movementDate = date || new Date().toISOString().split('T')[0];

    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) throw new Error('Inventory item not found');

      const item = rows[0];
      const currentQty = Number(item.quantity) || 0;
      const currentAvgCost = Number(item.average_unit_cost) || 0;

      // Weighted Average Cost Formula: ((Q1 * C1) + (Q2 * C2)) / (Q1 + Q2)
      const existingValue = currentQty * currentAvgCost;
      const incomingValue = qtyIn * costIn;
      const newTotalQty = currentQty + qtyIn;
      const newAvgCost = newTotalQty > 0 ? (existingValue + incomingValue) / newTotalQty : costIn;
      const roundedAvgCost = Number(newAvgCost.toFixed(2));

      await conn.query(
        `UPDATE inventory_items SET quantity = ?, average_unit_cost = ?, updated_at = NOW() WHERE id = ?`,
        [newTotalQty, roundedAvgCost, id]
      );

      const movId = `mov-${Date.now()}`;
      await conn.query(
        `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
         VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, NOW())`,
        [movId, id, qtyIn, costIn, incomingValue, reason, note || null, movementDate]
      );

      const [updatedRows] = await conn.query(
        `SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName,
                i.unit, i.quantity, i.average_unit_cost as averageUnitCost,
                i.minimum_stock as minimumStock, i.notes,
                (i.status = 'active') as isActive,
                DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
                DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
         FROM inventory_items i
         LEFT JOIN inventory_categories c ON i.category_id = c.id
         WHERE i.id = ?`,
        [id]
      );

      const updatedItem = {
        ...updatedRows[0],
        quantity: newTotalQty,
        averageUnitCost: roundedAvgCost,
        minimumStock: Number(updatedRows[0].minimumStock) || 0,
        isActive: Boolean(updatedRows[0].isActive)
      };

      const movement = {
        id: movId,
        itemId: id,
        itemName: item.name,
        type: 'IN',
        quantity: qtyIn,
        unitCost: costIn,
        totalValue: incomingValue,
        reason,
        note,
        date: movementDate,
        createdAt: new Date().toISOString()
      };

      return { item: updatedItem, movement };
    });

    res.json(result);
  } catch (error) {
    console.error('Error during stock-in:', error);
    res.status(500).json({ error: error.message });
  }
});

// STOCK OUT
router.post('/items/:id/stock-out', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, date, reason = 'Used', note } = req.body;

    const qtyOut = Math.max(0, Number(quantity) || 0);
    if (qtyOut <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero.' });
    }

    const movementDate = date || new Date().toISOString().split('T')[0];

    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) throw new Error('Inventory item not found');

      const item = rows[0];
      const currentQty = Number(item.quantity) || 0;
      const currentAvgCost = Number(item.average_unit_cost) || 0;

      if (qtyOut > currentQty) {
        throw new Error(`Available stock is only ${currentQty}. You cannot remove ${qtyOut}.`);
      }

      const newTotalQty = currentQty - qtyOut;

      await conn.query(
        `UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE id = ?`,
        [newTotalQty, id]
      );

      const movId = `mov-${Date.now()}`;
      const totalVal = qtyOut * currentAvgCost;
      await conn.query(
        `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
         VALUES (?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
        [movId, id, -qtyOut, currentAvgCost, totalVal, reason, note || null, movementDate]
      );

      const [updatedRows] = await conn.query(
        `SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName,
                i.unit, i.quantity, i.average_unit_cost as averageUnitCost,
                i.minimum_stock as minimumStock, i.notes,
                (i.status = 'active') as isActive,
                DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
                DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
         FROM inventory_items i
         LEFT JOIN inventory_categories c ON i.category_id = c.id
         WHERE i.id = ?`,
        [id]
      );

      const updatedItem = {
        ...updatedRows[0],
        quantity: newTotalQty,
        averageUnitCost: currentAvgCost,
        minimumStock: Number(updatedRows[0].minimumStock) || 0,
        isActive: Boolean(updatedRows[0].isActive)
      };

      const movement = {
        id: movId,
        itemId: id,
        itemName: item.name,
        type: 'OUT',
        quantity: -qtyOut,
        unitCost: currentAvgCost,
        totalValue: totalVal,
        reason,
        note,
        date: movementDate,
        createdAt: new Date().toISOString()
      };

      return { item: updatedItem, movement };
    });

    res.json(result);
  } catch (error) {
    console.error('Error during stock-out:', error);
    res.status(400).json({ error: error.message });
  }
});

// ADJUST STOCK
router.post('/items/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { physicalQuantity, date, reason = 'Physical Count', note } = req.body;

    const newPhysicalQty = Math.max(0, Number(physicalQuantity) || 0);
    const movementDate = date || new Date().toISOString().split('T')[0];

    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) throw new Error('Inventory item not found');

      const item = rows[0];
      const currentQty = Number(item.quantity) || 0;
      const currentAvgCost = Number(item.average_unit_cost) || 0;
      const delta = newPhysicalQty - currentQty;

      await conn.query(
        `UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE id = ?`,
        [newPhysicalQty, id]
      );

      let movement = null;
      if (delta !== 0) {
        const movId = `mov-${Date.now()}`;
        const totalVal = Math.abs(delta) * currentAvgCost;
        await conn.query(
          `INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity, unit_cost, total_value, reason, note, movement_date, created_at)
           VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?, ?, NOW())`,
          [movId, id, delta, currentAvgCost, totalVal, reason, note || null, movementDate]
        );

        movement = {
          id: movId,
          itemId: id,
          itemName: item.name,
          type: 'ADJUSTMENT',
          quantity: delta,
          unitCost: currentAvgCost,
          totalValue: totalVal,
          reason,
          note,
          date: movementDate,
          createdAt: new Date().toISOString()
        };
      }

      const [updatedRows] = await conn.query(
        `SELECT i.id, i.name, i.category_id as categoryId, c.name as categoryName,
                i.unit, i.quantity, i.average_unit_cost as averageUnitCost,
                i.minimum_stock as minimumStock, i.notes,
                (i.status = 'active') as isActive,
                DATE_FORMAT(i.created_at, '%Y-%m-%d') as createdAt,
                DATE_FORMAT(i.updated_at, '%Y-%m-%d') as updatedAt
         FROM inventory_items i
         LEFT JOIN inventory_categories c ON i.category_id = c.id
         WHERE i.id = ?`,
        [id]
      );

      const updatedItem = {
        ...updatedRows[0],
        quantity: newPhysicalQty,
        averageUnitCost: currentAvgCost,
        minimumStock: Number(updatedRows[0].minimumStock) || 0,
        isActive: Boolean(updatedRows[0].isActive)
      };

      return { item: updatedItem, movement };
    });

    res.json(result);
  } catch (error) {
    console.error('Error during stock adjustment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Stock History (All or by item)
router.get('/movements', async (req, res) => {
  try {
    const { itemId } = req.query;
    let query = `
      SELECT m.id, m.inventory_item_id as itemId, i.name as itemName,
             UPPER(m.movement_type) as type, m.quantity, m.unit_cost as unitCost,
             m.total_value as totalValue, m.reason, m.note,
             DATE_FORMAT(m.movement_date, '%Y-%m-%d') as date,
             m.created_at as createdAt
      FROM inventory_movements m
      LEFT JOIN inventory_items i ON m.inventory_item_id = i.id
    `;
    const params = [];
    if (itemId) {
      query += ` WHERE m.inventory_item_id = ?`;
      params.push(itemId);
    }
    query += ` ORDER BY m.movement_date DESC, m.created_at DESC`;

    const [rows] = await pool.query(query, params);
    const formatted = rows.map(r => ({
      ...r,
      quantity: Number(r.quantity) || 0,
      unitCost: Number(r.unitCost) || 0,
      totalValue: Number(r.totalValue) || 0,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEACTIVATE Item
router.patch('/items/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE inventory_items SET status = "inactive", updated_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating item:', error);
    res.status(500).json({ error: error.message });
  }
});

// REACTIVATE Item
router.patch('/items/:id/reactivate', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE inventory_items SET status = "active", updated_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reactivating item:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE Item
router.delete('/items/:id', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff users are not permitted to delete inventory items.' });
    }
    const { id } = req.params;
    const [movements] = await pool.query('SELECT * FROM inventory_movements WHERE inventory_item_id = ?', [id]);
    const operational = movements.filter(m => m.reason !== 'Initial Stock');
    if (operational.length > 0) {
      return res.json({
        success: false,
        message: 'Item has recorded movements and cannot be deleted. Deactivate it instead.'
      });
    }

    await pool.query('DELETE FROM inventory_movements WHERE inventory_item_id = ?', [id]);
    await pool.query('DELETE FROM inventory_items WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
