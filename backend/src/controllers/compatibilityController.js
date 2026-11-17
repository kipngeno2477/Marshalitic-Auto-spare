const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get all vehicle models
exports.getVehicles = async (req, res) => {
  try {
    const { make, search } = req.query;
    let sql = `SELECT * FROM vehicles WHERE 1=1`;
    const params = [];

    if (make) {
      sql += ` AND make = ?`;
      params.push(make);
    }
    if (search) {
      sql += ` AND (make LIKE ? OR model LIKE ? OR engine_type LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY make ASC, model ASC, year_from DESC`;
    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicles' });
  }
};

// 2. Get distinct vehicle makes
exports.getVehicleMakes = async (req, res) => {
  try {
    const result = await db.query(`SELECT DISTINCT make FROM vehicles ORDER BY make ASC`);
    const makes = result.rows.map(r => r.make);
    res.json({ success: true, data: makes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicle makes' });
  }
};

// 3. Search Spare Parts Compatible with Vehicle
exports.searchByVehicle = async (req, res) => {
  try {
    const { make, model, year, category_id, search } = req.query;

    let sql = `
      SELECT 
        p.*,
        c.name AS category_name,
        b.name AS brand_name,
        v.make AS matched_make,
        v.model AS matched_model,
        v.year_from,
        v.year_to,
        v.engine_type,
        v.engine_capacity,
        pvc.notes AS fitment_notes
      FROM product_vehicle_compatibility pvc
      JOIN products p ON pvc.product_id = p.id
      JOIN vehicles v ON pvc.vehicle_id = v.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.status = 'active'
    `;
    const params = [];

    if (make) {
      sql += ` AND v.make = ?`;
      params.push(make);
    }
    if (model) {
      sql += ` AND v.model = ?`;
      params.push(model);
    }
    if (year) {
      const yr = parseInt(year, 10);
      sql += ` AND ? >= v.year_from AND ? <= v.year_to`;
      params.push(yr, yr);
    }
    if (category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(category_id);
    }
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY p.name ASC`;

    const result = await db.query(sql, params);
    res.json({
      success: true,
      query: { make, model, year, category_id },
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error searching by vehicle:', err);
    res.status(500).json({ success: false, message: 'Vehicle compatibility search failed' });
  }
};

// 4. Add vehicle
exports.createVehicle = async (req, res) => {
  try {
    const { make, model, year_from, year_to, engine_type, engine_capacity, fuel_type } = req.body;
    if (!make || !model || !year_from || !year_to) {
      return res.status(400).json({ success: false, message: 'Make, model, and year range are required' });
    }

    const ins = await db.query(
      `INSERT INTO vehicles (make, model, year_from, year_to, engine_type, engine_capacity, fuel_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [make, model, year_from, year_to, engine_type || '', engine_capacity || '', fuel_type || 'Petrol']
    );

    res.status(201).json({ success: true, vehicleId: ins.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create vehicle record' });
  }
};

// 5. Link product to vehicle
exports.linkCompatibility = async (req, res) => {
  try {
    const { product_id, vehicle_id, notes } = req.body;
    if (!product_id || !vehicle_id) {
      return res.status(400).json({ success: false, message: 'product_id and vehicle_id are required' });
    }

    try {
      await db.query(
        `INSERT OR IGNORE INTO product_vehicle_compatibility (product_id, vehicle_id, notes) VALUES (?, ?, ?)`,
        [product_id, vehicle_id, notes || 'Direct OEM replacement']
      );
    } catch (e) {
      await db.query(
        `INSERT IGNORE INTO product_vehicle_compatibility (product_id, vehicle_id, notes) VALUES (?, ?, ?)`,
        [product_id, vehicle_id, notes || 'Direct OEM replacement']
      );
    }

    res.json({ success: true, message: 'Compatibility linked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to link compatibility' });
  }
};
