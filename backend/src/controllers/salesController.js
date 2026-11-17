const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Sales list with filters
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, customer_id, payment_method, status, search } = req.query;
    let sql = `
      SELECT 
        s.*,
        u.name AS cashier_name,
        c.phone AS customer_phone,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS item_count
      FROM sales s
      JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ` AND DATE(s.sale_date) >= DATE(?)`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND DATE(s.sale_date) <= DATE(?)`;
      params.push(endDate);
    }
    if (customer_id) {
      sql += ` AND s.customer_id = ?`;
      params.push(customer_id);
    }
    if (payment_method) {
      sql += ` AND s.payment_method = ?`;
      params.push(payment_method);
    }
    if (status) {
      sql += ` AND s.status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (s.invoice_number LIKE ? OR s.customer_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    sql += ` ORDER BY s.sale_date DESC`;

    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve sales records' });
  }
};

// 2. Get Sale by ID / Invoice
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const saleRes = await db.query(`
      SELECT 
        s.*,
        u.name AS cashier_name,
        u.email AS cashier_email,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.vehicle_reg_no AS customer_vehicle
      FROM sales s
      JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ? OR s.invoice_number = ?
    `, [id, id]);

    if (saleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    const sale = saleRes.rows[0];

    const itemsRes = await db.query(`
      SELECT si.*, p.barcode, p.image_url
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [sale.id]);

    const paymentsRes = await db.query(`
      SELECT p.*, u.name AS receiver_name
      FROM payments p
      JOIN users u ON p.received_by = u.id
      WHERE p.sale_id = ?
    `, [sale.id]);

    const returnsRes = await db.query(`
      SELECT r.*, u.name AS approved_by_name
      FROM returns r
      JOIN users u ON r.approved_by = u.id
      WHERE r.sale_id = ?
    `, [sale.id]);

    res.json({
      success: true,
      data: {
        ...sale,
        items: itemsRes.rows,
        payments: paymentsRes.rows,
        returns: returnsRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving sale details' });
  }
};

// 3. Process Sale Return / Refund
exports.processReturn = async (req, res) => {
  try {
    const { sale_id, items, reason, refund_method } = req.body;
    // items: array of { product_id, quantity, condition: 'restockable'|'damaged', unit_price }

    if (!sale_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Return items and sale_id required' });
    }

    const approvedBy = req.user ? req.user.id : 1;

    const returnResult = await db.transaction(async (trx) => {
      const saleRes = await trx('SELECT * FROM sales WHERE id = ?', [sale_id]);
      if (saleRes.rows.length === 0) {
        throw new Error('Sale not found');
      }
      const sale = saleRes.rows[0];

      let totalRefund = 0;
      for (const item of items) {
        totalRefund += (item.unit_price * item.quantity);
      }

      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

      const retInsert = await trx(`
        INSERT INTO returns (
          return_number, sale_id, customer_id, return_date, total_refund_amount,
          refund_method, reason, status, approved_by
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, 'approved', ?)
      `, [
        returnNumber,
        sale.id,
        sale.customer_id,
        totalRefund,
        refund_method || 'cash',
        reason || 'Customer returned part',
        approvedBy
      ]);

      const returnId = retInsert.insertId;

      for (const item of items) {
        const restock = item.condition === 'restockable' ? 1 : 0;
        await trx(`
          INSERT INTO return_items (return_id, product_id, quantity, unit_price, condition, restocked)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [returnId, item.product_id, item.quantity, item.unit_price, item.condition || 'restockable', restock]);

        if (restock) {
          // Increase stock back
          const prodRes = await trx('SELECT quantity, purchase_price FROM products WHERE id = ?', [item.product_id]);
          if (prodRes.rows.length > 0) {
            const currentQty = prodRes.rows[0].quantity;
            const newQty = currentQty + item.quantity;
            await trx('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQty, item.product_id]);

            await trx(`
              INSERT INTO stock_movements (
                product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost,
                reference_type, reference_id, reason, user_id
              ) VALUES (?, 'return_in', ?, ?, ?, ?, 'return', ?, 'Customer return restocked', ?)
            `, [
              item.product_id, item.quantity, currentQty, newQty, prodRes.rows[0].purchase_price, returnNumber, approvedBy
            ]);
          }
        }
      }

      // Mark sale status if fully returned
      await trx(`UPDATE sales SET status = 'returned' WHERE id = ?`, [sale.id]);

      return { returnNumber, totalRefund };
    });

    await logActivity(approvedBy, 'SALE_RETURN', 'Sales', `Processed return ${returnResult.returnNumber} for KSh ${returnResult.totalRefund}`);

    res.json({ success: true, message: 'Return processed and stock updated', data: returnResult });
  } catch (err) {
    console.error('Error processing return:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to process return' });
  }
};
