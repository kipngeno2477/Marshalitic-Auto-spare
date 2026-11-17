const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Barcode / Quick search for POS
exports.searchPosProducts = async (req, res) => {
  try {
    const { query, barcode } = req.query;
    let sql = `
      SELECT 
        p.id, p.product_code, p.name, p.sku, p.barcode, p.selling_price,
        p.purchase_price, p.quantity, p.reorder_level, p.image_url, p.shelf_location,
        c.name AS category_name,
        b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.status = 'active'
    `;
    const params = [];

    if (barcode) {
      sql += ` AND p.barcode = ?`;
      params.push(barcode.trim());
    } else if (query) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.product_code LIKE ?)`;
      const term = `%${query.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY p.name ASC LIMIT 24`;

    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'POS product search failed' });
  }
};

// 2. Validate Cart Stock
exports.validateCart = async (req, res) => {
  try {
    const { items } = req.body; // array of { product_id, quantity }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items required' });
    }

    const issues = [];
    for (const item of items) {
      const prodRes = await db.query('SELECT id, name, quantity FROM products WHERE id = ?', [item.product_id]);
      if (prodRes.rows.length === 0) {
        issues.push({ product_id: item.product_id, message: 'Product not found' });
      } else {
        const prod = prodRes.rows[0];
        if (prod.quantity < item.quantity) {
          issues.push({
            product_id: item.product_id,
            name: prod.name,
            available: prod.quantity,
            requested: item.quantity,
            message: `Insufficient stock for ${prod.name}. Available: ${prod.quantity}`
          });
        }
      }
    }

    if (issues.length > 0) {
      return res.status(400).json({ success: false, valid: false, issues });
    }

    res.json({ success: true, valid: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cart validation error' });
  }
};

// 3. Process POS Checkout (Atomic Transaction)
exports.checkout = async (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      items,
      payment_method,
      discount_amount = 0,
      vat_rate = 16.00,
      notes,
      payment_reference,
      mpesa_phone,
      mpesa_receipt
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty' });
    }

    const cashierId = req.user ? req.user.id : 1;

    // Run transaction
    const saleResult = await db.transaction(async (trx) => {
      // 1. Verify stock and calculate totals
      let subtotal = 0;
      let totalCost = 0;
      const verifiedItems = [];

      for (const item of items) {
        const prodRes = await trx('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (prodRes.rows.length === 0) {
          throw new Error(`Product ID ${item.product_id} does not exist`);
        }
        const prod = prodRes.rows[0];

        if (prod.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.quantity}, Requested: ${item.quantity}`);
        }

        const lineSubtotal = prod.selling_price * item.quantity;
        subtotal += lineSubtotal;
        totalCost += (prod.purchase_price * item.quantity);

        verifiedItems.push({
          product_id: prod.id,
          name: prod.name,
          sku: prod.sku,
          quantity: item.quantity,
          unit_price: prod.selling_price,
          unit_cost: prod.purchase_price,
          subtotal: lineSubtotal,
          total: lineSubtotal,
          current_qty: prod.quantity,
          reorder_level: prod.reorder_level
        });
      }

      // Calculate VAT & Final Total
      const discount = parseFloat(discount_amount || 0);
      const taxableAmount = Math.max(0, subtotal - discount);
      const vatRateNum = parseFloat(vat_rate || 16.00);
      // If price is VAT-inclusive or exclusive: Kenya standard is VAT included in retail price or calculated on subtotal
      const vatAmount = (taxableAmount * vatRateNum) / (100 + vatRateNum); // VAT component
      const totalAmount = taxableAmount;

      // Generate invoice number e.g. INV-1046
      const lastInvoiceRes = await trx(`SELECT id, invoice_number FROM sales ORDER BY id DESC LIMIT 1`);
      let nextNum = 1046;
      if (lastInvoiceRes.rows.length > 0) {
        const lastNum = parseInt(lastInvoiceRes.rows[0].invoice_number.replace(/\D/g, ''), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const invoiceNumber = `INV-${nextNum}`;

      // Insert Sale
      const saleInsert = await trx(`
        INSERT INTO sales (
          invoice_number, customer_id, customer_name, cashier_id, sale_date,
          subtotal, discount_amount, vat_rate, vat_amount, total_amount, paid_amount,
          payment_method, payment_status, status, notes
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?)
      `, [
        invoiceNumber,
        customer_id || null,
        customer_name || 'Walk-in Customer',
        cashierId,
        subtotal,
        discount,
        vatRateNum,
        vatAmount,
        totalAmount,
        totalAmount,
        payment_method || 'cash',
        notes || null
      ]);

      const saleId = saleInsert.insertId;

      // Insert Sale Items & Deduct Stock & Record Movement
      for (const vi of verifiedItems) {
        await trx(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, sku, quantity, unit_price, unit_cost, discount, tax_amount, subtotal, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `, [
          saleId, vi.product_id, vi.name, vi.sku, vi.quantity, vi.unit_price, vi.unit_cost, vi.subtotal, vi.total
        ]);

        const newStock = vi.current_qty - vi.quantity;
        await trx('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, vi.product_id]);

        await trx(`
          INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost,
            reference_type, reference_id, reason, user_id
          ) VALUES (?, 'sale', ?, ?, ?, ?, 'sale', ?, 'POS customer sale', ?)
        `, [
          vi.product_id, vi.quantity, vi.current_qty, newStock, vi.unit_cost, invoiceNumber, cashierId
        ]);

        // Trigger notification if low stock
        if (newStock <= vi.reorder_level) {
          await trx(`
            INSERT INTO notifications (title, message, type, reference_id)
            VALUES (?, ?, 'low_stock', ?)
          `, [
            `Low Stock Alert: ${vi.name}`,
            `Product "${vi.name}" is running low. Current stock: ${newStock} (Reorder level: ${vi.reorder_level})`,
            vi.sku
          ]);
        }
      }

      // Record Payment
      await trx(`
        INSERT INTO payments (
          sale_id, customer_id, amount, payment_method, reference_code, mpesa_phone, mpesa_receipt, received_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        saleId,
        customer_id || null,
        totalAmount,
        payment_method || 'cash',
        payment_reference || `PAY-${invoiceNumber}`,
        mpesa_phone || null,
        mpesa_receipt || null,
        cashierId,
        'Full checkout payment settled'
      ]);

      // If customer has account, update their total purchases
      if (customer_id) {
        await trx(`
          UPDATE customers 
          SET total_purchases = total_purchases + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [totalAmount, customer_id]);
      }

      return {
        saleId,
        invoiceNumber,
        subtotal,
        discount,
        vatAmount,
        totalAmount,
        itemCount: verifiedItems.length,
        items: verifiedItems
      };
    });

    await logActivity(cashierId, 'POS_SALE', 'Sales', `Completed sale ${saleResult.invoiceNumber} for KSh ${saleResult.totalAmount}`);

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: saleResult
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(400).json({ success: false, message: err.message || 'Checkout failed' });
  }
};
