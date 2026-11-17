const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get all products with filters
exports.getProducts = async (req, res) => {
  try {
    const { category, brand, search, status, lowStock } = req.query;
    let sql = `
      SELECT 
        p.*,
        c.name AS category_name,
        b.name AS brand_name,
        s.name AS supplier_name,
        (SELECT COUNT(*) FROM product_vehicle_compatibility WHERE product_id = p.id) AS compatible_vehicles_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ` AND (p.category_id = ? OR c.slug = ?)`;
      params.push(category, category);
    }
    if (brand) {
      sql += ` AND p.brand_id = ?`;
      params.push(brand);
    }
    if (status) {
      sql += ` AND p.status = ?`;
      params.push(status);
    }
    if (lowStock === 'true') {
      sql += ` AND p.quantity <= p.reorder_level`;
    }
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.product_code LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY p.id ASC`;

    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve products' });
  }
};

// 2. Get product details + compatibility + movements
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const prodRes = await db.query(`
      SELECT 
        p.*,
        c.name AS category_name,
        b.name AS brand_name,
        s.name AS supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `, [id]);

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = prodRes.rows[0];

    // Get compatible vehicles
    const compRes = await db.query(`
      SELECT 
        v.*,
        pvc.notes AS compatibility_notes,
        pvc.id AS compatibility_id
      FROM product_vehicle_compatibility pvc
      JOIN vehicles v ON pvc.vehicle_id = v.id
      WHERE pvc.product_id = ?
      ORDER BY v.make ASC, v.model ASC
    `, [id]);

    // Get stock movements
    const movRes = await db.query(`
      SELECT 
        sm.*,
        u.name AS performed_by
      FROM stock_movements sm
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC
      LIMIT 20
    `, [id]);

    res.json({
      success: true,
      data: {
        ...product,
        compatibleVehicles: compRes.rows,
        stockMovements: movRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching product details' });
  }
};

// 3. Create Product
exports.createProduct = async (req, res) => {
  try {
    const {
      name, sku, barcode, category_id, brand_id, supplier_id,
      description, shelf_location, purchase_price, selling_price,
      quantity, reorder_level, image_url, compatible_vehicle_ids
    } = req.body;

    if (!name || !category_id || !brand_id || purchase_price == null || selling_price == null) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (name, category, brand, prices)' });
    }

    // Auto-generate SKU / Barcode / Code if omitted
    const timestamp = Date.now().toString().slice(-6);
    const finalSku = sku || `SKU-${timestamp}`;
    const finalBarcode = barcode || `600${timestamp}99`;
    const finalCode = `PRD-${timestamp}`;
    const initialQty = parseInt(quantity || 0, 10);

    const result = await db.transaction(async (trx) => {
      const insRes = await trx(
        `INSERT INTO products (
          product_code, name, sku, barcode, category_id, brand_id, supplier_id,
          description, shelf_location, purchase_price, selling_price,
          quantity, reorder_level, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          finalCode, name, finalSku, finalBarcode, category_id, brand_id, supplier_id || null,
          description || '', shelf_location || '', purchase_price, selling_price,
          initialQty, reorder_level || 5, image_url || null
        ]
      );

      const newId = insRes.insertId;

      // Record initial stock movement
      if (initialQty > 0) {
        await trx(
          `INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_quantity, new_quantity,
            unit_cost, reference_type, reference_id, reason, user_id
          ) VALUES (?, 'initial', ?, 0, ?, ?, 'initial', ?, 'Initial stock setup', ?)`,
          [newId, initialQty, initialQty, purchase_price, finalCode, req.user ? req.user.id : 1]
        );
      }

      // Link vehicle compatibility if provided
      if (Array.isArray(compatible_vehicle_ids)) {
        for (const vid of compatible_vehicle_ids) {
          await trx(
            `INSERT INTO product_vehicle_compatibility (product_id, vehicle_id, notes) VALUES (?, ?, 'Compatible OEM fitment')`,
            [newId, vid]
          );
        }
      }

      return newId;
    });

    await logActivity(req.user ? req.user.id : 1, 'PRODUCT_CREATE', 'Inventory', `Created product: ${name} (ID: ${result})`);

    res.status(201).json({ success: true, message: 'Product created successfully', productId: result });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: 'Failed to create product: ' + err.message });
  }
};

// 4. Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, sku, barcode, category_id, brand_id, supplier_id,
      description, shelf_location, purchase_price, selling_price,
      reorder_level, image_url, status
    } = req.body;

    await db.query(
      `UPDATE products SET 
        name = ?, sku = ?, barcode = ?, category_id = ?, brand_id = ?, supplier_id = ?,
        description = ?, shelf_location = ?, purchase_price = ?, selling_price = ?,
        reorder_level = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name, sku, barcode, category_id, brand_id, supplier_id || null,
        description, shelf_location, purchase_price, selling_price,
        reorder_level, image_url, status || 'active', id
      ]
    );

    await logActivity(req.user ? req.user.id : 1, 'PRODUCT_UPDATE', 'Inventory', `Updated product ID: ${id}`);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// 5. Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sales exist
    const salesCheck = await db.query('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?', [id]);
    if (salesCheck.rows[0].count > 0) {
      // Soft-delete / deactivate to preserve financial integrity
      await db.query(`UPDATE products SET status = 'discontinued' WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'Product has historical sales. Marked as discontinued.' });
    }

    await db.query('DELETE FROM products WHERE id = ?', [id]);
    await logActivity(req.user ? req.user.id : 1, 'PRODUCT_DELETE', 'Inventory', `Deleted product ID: ${id}`);
    res.json({ success: true, message: 'Product deleted permanently' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

// 6. Stock Adjustment (Add, Deduct, Damaged, Count correction)
exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, reason, notes } = req.body; // type: 'adjustment_add', 'adjustment_deduct', 'damaged'

    const numQty = parseInt(quantity, 10);
    if (!numQty || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity required' });
    }

    const prodRes = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = prodRes.rows[0];
    const prevQty = product.quantity;
    let newQty = prevQty;

    if (type === 'adjustment_add') {
      newQty = prevQty + numQty;
    } else if (type === 'adjustment_deduct' || type === 'damaged') {
      if (prevQty < numQty) {
        return res.status(400).json({ success: false, message: 'Cannot deduct more than available stock' });
      }
      newQty = prevQty - numQty;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid adjustment type' });
    }

    await db.transaction(async (trx) => {
      await trx('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQty, id]);
      await trx(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity, previous_quantity, new_quantity,
          unit_cost, reference_type, reference_id, reason, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'adjustment', ?, ?, ?)`,
        [id, type, numQty, prevQty, newQty, product.purchase_price, `ADJ-${Date.now().toString().slice(-6)}`, reason || notes || 'Manual inventory adjustment', req.user ? req.user.id : 1]
      );
    });

    await logActivity(req.user ? req.user.id : 1, 'STOCK_ADJUSTMENT', 'Inventory', `Adjusted product ${product.name} (${type}: ${numQty} units)`);

    res.json({ success: true, message: 'Stock adjusted successfully', previous_quantity: prevQty, new_quantity: newQty });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing stock adjustment' });
  }
};

// 7. Inventory Valuation Summary
exports.getValuation = async (req, res) => {
  try {
    const valRes = await db.query(`
      SELECT 
        COUNT(id) AS total_skus,
        COALESCE(SUM(quantity), 0) AS total_units,
        COALESCE(SUM(quantity * purchase_price), 0) AS total_cost_value,
        COALESCE(SUM(quantity * selling_price), 0) AS total_retail_value,
        COALESCE(SUM(quantity * (selling_price - purchase_price)), 0) AS potential_profit
      FROM products
      WHERE status = 'active'
    `);

    res.json({ success: true, data: valRes.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error calculating inventory valuation' });
  }
};

// 8. Categories
exports.getCategories = async (req, res) => {
  try {
    const cats = await db.query(`
      SELECT c.*, COUNT(p.id) AS product_count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id 
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json({ success: true, data: cats.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await db.query(
      `INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)`,
      [name, slug, description || '', icon || 'Package']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// 9. Brands
exports.getBrands = async (req, res) => {
  try {
    const brands = await db.query(`
      SELECT b.*, COUNT(p.id) AS product_count 
      FROM brands b 
      LEFT JOIN products p ON b.id = p.brand_id 
      GROUP BY b.id
      ORDER BY b.name ASC
    `);
    res.json({ success: true, data: brands.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching brands' });
  }
};
