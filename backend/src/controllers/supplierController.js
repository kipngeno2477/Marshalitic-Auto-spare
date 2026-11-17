const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) AS po_count,
        (SELECT COUNT(*) FROM products WHERE supplier_id = s.id) AS supplied_products_count
      FROM suppliers s
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (s.name LIKE ? OR s.company_name LIKE ? OR s.phone LIKE ? OR s.contact_person LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY s.name ASC`;
    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve suppliers' });
  }
};

// 2. Get Supplier Details
exports.getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supRes = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (supRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const posRes = await db.query('SELECT * FROM purchases WHERE supplier_id = ? ORDER BY order_date DESC', [id]);
    const prodsRes = await db.query('SELECT id, name, sku, purchase_price, quantity FROM products WHERE supplier_id = ?', [id]);

    res.json({
      success: true,
      data: {
        ...supRes.rows[0],
        purchaseOrders: posRes.rows,
        products: prodsRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching supplier details' });
  }
};

// 3. Create Supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, company_name, contact_person, phone, email, address, payment_terms } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Supplier name and phone are required' });
    }

    const result = await db.query(`
      INSERT INTO suppliers (name, company_name, contact_person, phone, email, address, payment_terms, outstanding_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0.00)
    `, [name, company_name || name, contact_person || '', phone, email || '', address || '', payment_terms || 'Net 30']);

    await logActivity(req.user ? req.user.id : 1, 'SUPPLIER_CREATE', 'Suppliers', `Created supplier: ${name}`);
    res.status(201).json({ success: true, supplierId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
};

// 4. Update Supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company_name, contact_person, phone, email, address, payment_terms } = req.body;

    await db.query(`
      UPDATE suppliers 
      SET name = ?, company_name = ?, contact_person = ?, phone = ?, email = ?, address = ?, payment_terms = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, company_name, contact_person, phone, email, address, payment_terms, id]);

    res.json({ success: true, message: 'Supplier updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
};
