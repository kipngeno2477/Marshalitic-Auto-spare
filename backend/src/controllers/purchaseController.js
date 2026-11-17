const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Purchases list
exports.getPurchases = async (req, res) => {
  try {
    const { supplier_id, status, payment_status } = req.query;
    let sql = `
      SELECT 
        p.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        u.name AS created_by_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) AS item_count
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id) {
      sql += ` AND p.supplier_id = ?`;
      params.push(supplier_id);
    }
    if (status) {
      sql += ` AND p.status = ?`;
      params.push(status);
    }
    if (payment_status) {
      sql += ` AND p.payment_status = ?`;
      params.push(payment_status);
    }

    sql += ` ORDER BY p.order_date DESC, p.id DESC`;

    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve purchase orders' });
  }
};

// 2. Get Purchase Order Details
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const poRes = await db.query(`
      SELECT 
        p.*,
        s.name AS supplier_name,
        s.company_name AS supplier_company,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        s.address AS supplier_address,
        u.name AS created_by_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON p.created_by = u.id
      WHERE p.id = ? OR p.po_number = ?
    `, [id, id]);

    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const po = poRes.rows[0];

    const itemsRes = await db.query(`
      SELECT pi.*, p.name AS product_name, p.sku, p.quantity AS current_stock
      FROM purchase_items pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.purchase_id = ?
    `, [po.id]);

    res.json({ success: true, data: { ...po, items: itemsRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving purchase order' });
  }
};

// 3. Create Purchase Order
exports.createPurchase = async (req, res) => {
  try {
    const { supplier_id, order_date, expected_date, items, notes } = req.body;
    // items: array of { product_id, ordered_qty, unit_cost }

    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and items required' });
    }

    const userId = req.user ? req.user.id : 1;

    const poResult = await db.transaction(async (trx) => {
      let totalCost = 0;
      for (const it of items) {
        totalCost += (it.unit_cost * it.ordered_qty);
      }

      const timestamp = Date.now().toString().slice(-6);
      const poNumber = `PO-2026-${timestamp}`;

      const insRes = await trx(`
        INSERT INTO purchases (
          po_number, supplier_id, order_date, expected_date, status,
          subtotal, tax_amount, total_cost, paid_amount, payment_status, notes, created_by
        ) VALUES (?, ?, ?, ?, 'ordered', ?, 0, ?, 0, 'unpaid', ?, ?)
      `, [
        poNumber, supplier_id, order_date || new Date().toISOString().substring(0, 10),
        expected_date || null, totalCost, totalCost, notes || null, userId
      ]);

      const poId = insRes.insertId;

      for (const it of items) {
        await trx(`
          INSERT INTO purchase_items (purchase_id, product_id, ordered_qty, received_qty, unit_cost, total_cost)
          VALUES (?, ?, ?, 0, ?, ?)
        `, [poId, it.product_id, it.ordered_qty, it.unit_cost, it.unit_cost * it.ordered_qty]);
      }

      // Update supplier balance
      await trx(`
        UPDATE suppliers 
        SET outstanding_balance = outstanding_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [totalCost, supplier_id]);

      return { poId, poNumber, totalCost };
    });

    await logActivity(userId, 'PURCHASE_CREATE', 'Purchases', `Created PO ${poResult.poNumber} (KSh ${poResult.totalCost})`);

    res.status(201).json({ success: true, message: 'Purchase order created successfully', data: poResult });
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  }
};

// 4. Receive Purchased Goods (Stock Inflow)
exports.receivePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // array of { item_id, product_id, received_qty }

    const userId = req.user ? req.user.id : 1;

    await db.transaction(async (trx) => {
      const poRes = await trx('SELECT * FROM purchases WHERE id = ?', [id]);
      if (poRes.rows.length === 0) throw new Error('Purchase order not found');
      const po = poRes.rows[0];

      let allReceived = true;

      for (const item of items) {
        const qtyToReceive = parseInt(item.received_qty, 10);
        if (qtyToReceive > 0) {
          // Update purchase item received qty
          await trx(`
            UPDATE purchase_items 
            SET received_qty = received_qty + ? 
            WHERE id = ? AND purchase_id = ?
          `, [qtyToReceive, item.item_id, id]);

          // Fetch product
          const prodRes = await trx('SELECT quantity, purchase_price, name FROM products WHERE id = ?', [item.product_id]);
          if (prodRes.rows.length > 0) {
            const currentStock = prodRes.rows[0].quantity;
            const newStock = currentStock + qtyToReceive;

            // Increment inventory stock
            await trx(`UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStock, item.product_id]);

            // Record stock movement
            await trx(`
              INSERT INTO stock_movements (
                product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost,
                reference_type, reference_id, reason, user_id
              ) VALUES (?, 'purchase', ?, ?, ?, ?, 'purchase', ?, 'Supplier PO delivery received', ?)
            `, [
              item.product_id, qtyToReceive, currentStock, newStock, prodRes.rows[0].purchase_price, po.po_number, userId
            ]);
          }
        }
      }

      // Check overall PO status
      const checkItems = await trx('SELECT ordered_qty, received_qty FROM purchase_items WHERE purchase_id = ?', [id]);
      let totalOrdered = 0;
      let totalReceived = 0;
      for (const ci of checkItems.rows) {
        totalOrdered += ci.ordered_qty;
        totalReceived += ci.received_qty;
      }

      const finalStatus = totalReceived >= totalOrdered ? 'received' : (totalReceived > 0 ? 'partial' : 'ordered');
      const receivedDate = new Date().toISOString().substring(0, 10);

      await trx(`
        UPDATE purchases 
        SET status = ?, received_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [finalStatus, receivedDate, id]);
    });

    await logActivity(userId, 'PURCHASE_RECEIVE', 'Purchases', `Received items for PO ID ${id}`);
    res.json({ success: true, message: 'Stock successfully received and inventory updated' });
  } catch (err) {
    console.error('Error receiving purchase:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to receive purchase' });
  }
};
