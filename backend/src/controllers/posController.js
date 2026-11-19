const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Barcode / Quick search for POS
exports.searchPosProducts = async (req, res) => {
  try {
    const { query, barcode } = req.query;
    const filter = { status: 'active' };

    if (barcode && barcode.trim()) {
      filter.barcode = barcode.trim();
    } else if (query && query.trim()) {
      const term = query.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { name: regex },
        { sku: regex },
        { barcode: regex },
        { product_code: regex }
      ];
    }

    const productsCol = db.getCollection('products');
    const categoriesCol = db.getCollection('categories');
    const brandsCol = db.getCollection('brands');

    const products = await productsCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .limit(24)
      .toArray();

    const [categories, brands] = await Promise.all([
      categoriesCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      brandsCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray()
    ]);

    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const brandMap = new Map(brands.map(b => [b.id, b.name]));

    const enriched = products.map(p => ({
      ...p,
      category_name: catMap.get(p.category_id) || '',
      brand_name: brandMap.get(p.brand_id) || ''
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('POS product search error:', err);
    res.status(500).json({ success: false, message: 'POS product search failed' });
  }
};

// 2. Validate Cart Stock
exports.validateCart = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items required' });
    }

    const productsCol = db.getCollection('products');
    const issues = [];

    for (const item of items) {
      const prod = await productsCol.findOne({ id: Number(item.product_id) });
      if (!prod) {
        issues.push({ product_id: item.product_id, message: 'Product not found' });
      } else if (prod.quantity < item.quantity) {
        issues.push({
          product_id: item.product_id,
          name: prod.name,
          available: prod.quantity,
          requested: item.quantity,
          message: `Insufficient stock for ${prod.name}. Available: ${prod.quantity}`
        });
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

// 3. Process POS Checkout
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
    const productsCol = db.getCollection('products');
    const salesCol = db.getCollection('sales');
    const saleItemsCol = db.getCollection('sale_items');
    const movementsCol = db.getCollection('stock_movements');
    const notifsCol = db.getCollection('notifications');
    const paymentsCol = db.getCollection('payments');
    const customersCol = db.getCollection('customers');

    // 1. Verify stock and calculate totals
    let subtotal = 0;
    let totalCost = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prod = await productsCol.findOne({ id: Number(item.product_id) });
      if (!prod) {
        throw new Error(`Product ID ${item.product_id} does not exist`);
      }
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

    // Calculations
    const discount = parseFloat(discount_amount || 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const vatRateNum = parseFloat(vat_rate || 16.00);
    const vatAmount = (taxableAmount * vatRateNum) / (100 + vatRateNum);
    const totalAmount = taxableAmount;

    // Generate invoice number e.g. INV-1046
    const lastSale = await salesCol.find({}).sort({ id: -1 }).limit(1).toArray();
    let nextNum = 1046;
    if (lastSale.length > 0 && lastSale[0].invoice_number) {
      const lastNum = parseInt(lastSale[0].invoice_number.replace(/\D/g, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const invoiceNumber = `INV-${nextNum}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const saleId = await db.getNextId('sales');
    const newSale = {
      id: saleId,
      invoice_number: invoiceNumber,
      customer_id: customer_id ? Number(customer_id) : null,
      customer_name: customer_name || 'Walk-in Customer',
      cashier_id: cashierId,
      sale_date: now,
      subtotal,
      discount_amount: discount,
      vat_rate: vatRateNum,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      paid_amount: totalAmount,
      payment_method: payment_method || 'cash',
      payment_status: 'paid',
      status: 'completed',
      notes: notes || null,
      sync_status: 'synced',
      created_at: now,
      updated_at: now
    };

    await salesCol.insertOne(newSale);

    // Insert sale items & deduct stock & audit movement
    for (const vi of verifiedItems) {
      const saleItemId = await db.getNextId('sale_items');
      await saleItemsCol.insertOne({
        id: saleItemId,
        sale_id: saleId,
        product_id: vi.product_id,
        product_name: vi.name,
        sku: vi.sku,
        quantity: vi.quantity,
        unit_price: vi.unit_price,
        unit_cost: vi.unit_cost,
        discount: 0,
        tax_amount: 0,
        subtotal: vi.subtotal,
        total: vi.total
      });

      const newStock = vi.current_qty - vi.quantity;
      await productsCol.updateOne(
        { id: vi.product_id },
        { $set: { quantity: newStock, updated_at: now } }
      );

      const movId = await db.getNextId('stock_movements');
      await movementsCol.insertOne({
        id: movId,
        product_id: vi.product_id,
        movement_type: 'sale',
        quantity: vi.quantity,
        previous_quantity: vi.current_qty,
        new_quantity: newStock,
        unit_cost: vi.unit_cost,
        reference_type: 'sale',
        reference_id: invoiceNumber,
        reason: 'POS customer sale',
        user_id: cashierId,
        created_at: now
      });

      // Low stock notification
      if (newStock <= vi.reorder_level) {
        const notifId = await db.getNextId('notifications');
        await notifsCol.insertOne({
          id: notifId,
          title: `Low Stock Alert: ${vi.name}`,
          message: `Product "${vi.name}" is running low. Current stock: ${newStock} (Reorder level: ${vi.reorder_level})`,
          type: 'low_stock',
          reference_id: vi.sku,
          is_read: 0,
          created_at: now
        });
      }
    }

    // Payment record
    const paymentId = await db.getNextId('payments');
    await paymentsCol.insertOne({
      id: paymentId,
      sale_id: saleId,
      customer_id: customer_id ? Number(customer_id) : null,
      amount: totalAmount,
      payment_method: payment_method || 'cash',
      reference_code: payment_reference || `PAY-${invoiceNumber}`,
      mpesa_phone: mpesa_phone || null,
      mpesa_receipt: mpesa_receipt || null,
      payment_date: now,
      received_by: cashierId,
      notes: 'Full checkout payment settled'
    });

    // Update customer total purchases
    if (customer_id) {
      await customersCol.updateOne(
        { id: Number(customer_id) },
        {
          $inc: { total_purchases: totalAmount },
          $set: { updated_at: now }
        }
      );
    }

    const saleResult = {
      saleId,
      invoiceNumber,
      subtotal,
      discount,
      vatAmount,
      totalAmount,
      itemCount: verifiedItems.length,
      items: verifiedItems
    };

    await logActivity(cashierId, 'POS_SALE', 'Sales', `Completed sale ${invoiceNumber} for KSh ${totalAmount}`);

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
