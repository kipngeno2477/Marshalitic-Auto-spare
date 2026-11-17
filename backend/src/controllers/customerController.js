const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Customers
exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM sales WHERE customer_id = c.id) AS sales_count,
        (SELECT MAX(sale_date) FROM sales WHERE customer_id = c.id) AS last_purchase_date
      FROM customers c
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.vehicle_reg_no LIKE ? OR c.email LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY c.name ASC`;
    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve customers' });
  }
};

// 2. Customer Statement & Ledger
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const custRes = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const salesRes = await db.query(`
      SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date DESC
    `, [id]);

    const paymentsRes = await db.query(`
      SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...custRes.rows[0],
        sales: salesRes.rows,
        payments: paymentsRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching customer statement' });
  }
};

// 3. Create Customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, email, vehicle_reg_no, address, credit_limit } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const result = await db.query(`
      INSERT INTO customers (name, phone, email, vehicle_reg_no, address, credit_limit, outstanding_balance, total_purchases)
      VALUES (?, ?, ?, ?, ?, ?, 0.00, 0.00)
    `, [name, phone, email || '', vehicle_reg_no || '', address || '', parseFloat(credit_limit || 0)]);

    await logActivity(req.user ? req.user.id : 1, 'CUSTOMER_CREATE', 'Customers', `Created customer: ${name} (${phone})`);
    res.status(201).json({ success: true, customerId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
};

// 4. Update Customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, vehicle_reg_no, address, credit_limit } = req.body;

    await db.query(`
      UPDATE customers 
      SET name = ?, phone = ?, email = ?, vehicle_reg_no = ?, address = ?, credit_limit = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, phone, email, vehicle_reg_no, address, parseFloat(credit_limit || 0), id]);

    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
};
