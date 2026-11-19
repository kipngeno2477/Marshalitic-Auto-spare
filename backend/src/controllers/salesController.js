const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Sales list with filters
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, customer_id, payment_method, status, search } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.sale_date = {};
      if (startDate) filter.sale_date.$gte = startDate;
      if (endDate) filter.sale_date.$lte = endDate + ' 23:59:59';
    }
    if (customer_id) {
      filter.customer_id = Number(customer_id);
    }
    if (payment_method) {
      filter.payment_method = payment_method;
    }
    if (status) {
      filter.status = status;
    }
    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { invoice_number: regex },
        { customer_name: regex }
      ];
    }

    const salesCol = db.getCollection('sales');
    const usersCol = db.getCollection('users');
    const customersCol = db.getCollection('customers');
    const saleItemsCol = db.getCollection('sale_items');

    const sales = await salesCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ sale_date: -1 })
      .toArray();

    // Map cashiers, customers, and item counts
    const userIds = [...new Set(sales.map(s => s.cashier_id).filter(Boolean))];
    const customerIds = [...new Set(sales.map(s => s.customer_id).filter(Boolean))];

    const [users, customers, itemCounts] = await Promise.all([
      usersCol.find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      customersCol.find({ id: { $in: customerIds } }, { projection: { id: 1, phone: 1, _id: 0 } }).toArray(),
      saleItemsCol.aggregate([
        { $group: { _id: '$sale_id', count: { $sum: 1 } } }
      ]).toArray()
    ]);

    const userMap = new Map(users.map(u => [u.id, u.name]));
    const custMap = new Map(customers.map(c => [c.id, c.phone]));
    const countMap = new Map(itemCounts.map(i => [i._id, i.count]));

    const enriched = sales.map(s => ({
      ...s,
      cashier_name: userMap.get(s.cashier_id) || 'Staff',
      customer_phone: custMap.get(s.customer_id) || '',
      item_count: countMap.get(s.id) || 0
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve sales records' });
  }
};

// 2. Get Sale by ID / Invoice
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const salesCol = db.getCollection('sales');
    const usersCol = db.getCollection('users');
    const customersCol = db.getCollection('customers');
    const saleItemsCol = db.getCollection('sale_items');
    const productsCol = db.getCollection('products');
    const paymentsCol = db.getCollection('payments');
    const returnsCol = db.getCollection('returns');

    const numId = !isNaN(id) ? Number(id) : null;
    const sale = await salesCol.findOne(
      { $or: [{ id: numId }, { invoice_number: id }] },
      { projection: { _id: 0 } }
    );

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    const [cashier, customer, saleItems, payments, returns, allUsers] = await Promise.all([
      usersCol.findOne({ id: sale.cashier_id }, { projection: { name: 1, email: 1, _id: 0 } }),
      sale.customer_id ? customersCol.findOne({ id: sale.customer_id }, { projection: { phone: 1, email: 1, vehicle_reg_no: 1, _id: 0 } }) : null,
      saleItemsCol.find({ sale_id: sale.id }, { projection: { _id: 0 } }).toArray(),
      paymentsCol.find({ sale_id: sale.id }, { projection: { _id: 0 } }).toArray(),
      returnsCol.find({ sale_id: sale.id }, { projection: { _id: 0 } }).toArray(),
      usersCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray()
    ]);

    const userMap = new Map(allUsers.map(u => [u.id, u.name]));

    // Enrich items with product barcode & image_url
    const productIds = saleItems.map(it => it.product_id);
    const products = await productsCol.find({ id: { $in: productIds } }, { projection: { id: 1, barcode: 1, image_url: 1, _id: 0 } }).toArray();
    const prodMap = new Map(products.map(p => [p.id, p]));

    const enrichedItems = saleItems.map(si => {
      const p = prodMap.get(si.product_id) || {};
      return {
        ...si,
        barcode: p.barcode || '',
        image_url: p.image_url || null
      };
    });

    // Enrich payments
    const enrichedPayments = payments.map(pm => ({
      ...pm,
      receiver_name: userMap.get(pm.received_by) || 'Staff'
    }));

    // Enrich returns
    const enrichedReturns = returns.map(r => ({
      ...r,
      approved_by_name: userMap.get(r.approved_by) || 'Admin'
    }));

    res.json({
      success: true,
      data: {
        ...sale,
        cashier_name: cashier ? cashier.name : 'Staff',
        cashier_email: cashier ? cashier.email : '',
        customer_phone: customer ? customer.phone : '',
        customer_email: customer ? customer.email : '',
        customer_vehicle: customer ? customer.vehicle_reg_no : '',
        items: enrichedItems,
        payments: enrichedPayments,
        returns: enrichedReturns
      }
    });
  } catch (err) {
    console.error('Error retrieving sale details:', err);
    res.status(500).json({ success: false, message: 'Error retrieving sale details' });
  }
};

// 3. Process Sale Return / Refund
exports.processReturn = async (req, res) => {
  try {
    const { sale_id, items, reason, refund_method } = req.body;
    if (!sale_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Return items and sale_id required' });
    }

    const approvedBy = req.user ? req.user.id : 1;
    const salesCol = db.getCollection('sales');
    const returnsCol = db.getCollection('returns');
    const returnItemsCol = db.getCollection('return_items');
    const productsCol = db.getCollection('products');
    const movementsCol = db.getCollection('stock_movements');

    const sale = await salesCol.findOne({ id: Number(sale_id) });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    let totalRefund = 0;
    for (const item of items) {
      totalRefund += (parseFloat(item.unit_price) * parseInt(item.quantity, 10));
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const returnId = await db.getNextId('returns');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await returnsCol.insertOne({
      id: returnId,
      return_number: returnNumber,
      sale_id: sale.id,
      customer_id: sale.customer_id,
      return_date: now,
      total_refund_amount: totalRefund,
      refund_method: refund_method || 'cash',
      reason: reason || 'Customer returned part',
      status: 'approved',
      approved_by: approvedBy,
      created_at: now
    });

    for (const item of items) {
      const restock = item.condition === 'restockable' ? 1 : 0;
      const retItemId = await db.getNextId('return_items');

      await returnItemsCol.insertOne({
        id: retItemId,
        return_id: returnId,
        product_id: Number(item.product_id),
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price),
        condition: item.condition || 'restockable',
        restocked: restock
      });

      if (restock) {
        const prod = await productsCol.findOne({ id: Number(item.product_id) });
        if (prod) {
          const currentQty = prod.quantity;
          const newQty = currentQty + parseInt(item.quantity, 10);
          await productsCol.updateOne(
            { id: prod.id },
            { $set: { quantity: newQty, updated_at: now } }
          );

          const movId = await db.getNextId('stock_movements');
          await movementsCol.insertOne({
            id: movId,
            product_id: prod.id,
            movement_type: 'return_in',
            quantity: parseInt(item.quantity, 10),
            previous_quantity: currentQty,
            new_quantity: newQty,
            unit_cost: prod.purchase_price,
            reference_type: 'return',
            reference_id: returnNumber,
            reason: 'Customer return restocked',
            user_id: approvedBy,
            created_at: now
          });
        }
      }
    }

    await salesCol.updateOne({ id: sale.id }, { $set: { status: 'returned', updated_at: now } });

    await logActivity(approvedBy, 'SALE_RETURN', 'Sales', `Processed return ${returnNumber} for KSh ${totalRefund}`);

    res.json({
      success: true,
      message: 'Return processed and stock updated',
      data: { returnNumber, totalRefund }
    });
  } catch (err) {
    console.error('Error processing return:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to process return' });
  }
};
