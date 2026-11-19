const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Purchases list
exports.getPurchases = async (req, res) => {
  try {
    const { supplier_id, status, payment_status } = req.query;
    const filter = {};

    if (supplier_id) {
      filter.supplier_id = Number(supplier_id);
    }
    if (status) {
      filter.status = status;
    }
    if (payment_status) {
      filter.payment_status = payment_status;
    }

    const purchasesCol = db.getCollection('purchases');
    const suppliersCol = db.getCollection('suppliers');
    const usersCol = db.getCollection('users');
    const itemsCol = db.getCollection('purchase_items');

    const purchases = await purchasesCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ order_date: -1, id: -1 })
      .toArray();

    const supplierIds = [...new Set(purchases.map(p => p.supplier_id).filter(Boolean))];
    const userIds = [...new Set(purchases.map(p => p.created_by).filter(Boolean))];

    const [suppliers, users, itemCounts] = await Promise.all([
      suppliersCol.find({ id: { $in: supplierIds } }, { projection: { id: 1, name: 1, phone: 1, _id: 0 } }).toArray(),
      usersCol.find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      itemsCol.aggregate([
        { $group: { _id: '$purchase_id', count: { $sum: 1 } } }
      ]).toArray()
    ]);

    const supMap = new Map(suppliers.map(s => [s.id, s]));
    const userMap = new Map(users.map(u => [u.id, u.name]));
    const countMap = new Map(itemCounts.map(i => [i._id, i.count]));

    const enriched = purchases.map(p => {
      const s = supMap.get(p.supplier_id) || {};
      return {
        ...p,
        supplier_name: s.name || '',
        supplier_phone: s.phone || '',
        created_by_name: userMap.get(p.created_by) || 'Staff',
        item_count: countMap.get(p.id) || 0
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve purchase orders' });
  }
};

// 2. Get Purchase Order Details
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchasesCol = db.getCollection('purchases');
    const suppliersCol = db.getCollection('suppliers');
    const usersCol = db.getCollection('users');
    const itemsCol = db.getCollection('purchase_items');
    const productsCol = db.getCollection('products');

    const numId = !isNaN(id) ? Number(id) : null;
    const po = await purchasesCol.findOne(
      { $or: [{ id: numId }, { po_number: id }] },
      { projection: { _id: 0 } }
    );

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const [supplier, user, items] = await Promise.all([
      suppliersCol.findOne({ id: po.supplier_id }, { projection: { _id: 0 } }),
      usersCol.findOne({ id: po.created_by }, { projection: { name: 1, _id: 0 } }),
      itemsCol.find({ purchase_id: po.id }, { projection: { _id: 0 } }).toArray()
    ]);

    const productIds = items.map(it => it.product_id);
    const products = await productsCol.find({ id: { $in: productIds } }, { projection: { id: 1, name: 1, sku: 1, quantity: 1, _id: 0 } }).toArray();
    const prodMap = new Map(products.map(p => [p.id, p]));

    const enrichedItems = items.map(it => {
      const p = prodMap.get(it.product_id) || {};
      return {
        ...it,
        product_name: p.name || '',
        sku: p.sku || '',
        current_stock: p.quantity != null ? p.quantity : 0
      };
    });

    res.json({
      success: true,
      data: {
        ...po,
        supplier_name: supplier ? supplier.name : '',
        supplier_company: supplier ? supplier.company_name : '',
        supplier_phone: supplier ? supplier.phone : '',
        supplier_email: supplier ? supplier.email : '',
        supplier_address: supplier ? supplier.address : '',
        created_by_name: user ? user.name : 'Staff',
        items: enrichedItems
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving purchase order' });
  }
};

// 3. Create Purchase Order
exports.createPurchase = async (req, res) => {
  try {
    const { supplier_id, order_date, expected_date, items, notes } = req.body;
    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and items required' });
    }

    const userId = req.user ? req.user.id : 1;
    let totalCost = 0;
    for (const it of items) {
      totalCost += (parseFloat(it.unit_cost) * parseInt(it.ordered_qty, 10));
    }

    const timestamp = Date.now().toString().slice(-6);
    const poNumber = `PO-2026-${timestamp}`;
    const poId = await db.getNextId('purchases');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newPo = {
      id: poId,
      po_number: poNumber,
      supplier_id: Number(supplier_id),
      order_date: order_date || now.substring(0, 10),
      expected_date: expected_date || null,
      received_date: null,
      status: 'ordered',
      subtotal: totalCost,
      tax_amount: 0,
      total_cost: totalCost,
      paid_amount: 0,
      payment_status: 'unpaid',
      notes: notes || null,
      created_by: userId,
      created_at: now,
      updated_at: now
    };

    await db.getCollection('purchases').insertOne(newPo);

    const itemsCol = db.getCollection('purchase_items');
    for (const it of items) {
      const itId = await db.getNextId('purchase_items');
      await itemsCol.insertOne({
        id: itId,
        purchase_id: poId,
        product_id: Number(it.product_id),
        ordered_qty: parseInt(it.ordered_qty, 10),
        received_qty: 0,
        unit_cost: parseFloat(it.unit_cost),
        total_cost: parseFloat(it.unit_cost) * parseInt(it.ordered_qty, 10)
      });
    }

    // Update supplier balance
    await db.getCollection('suppliers').updateOne(
      { id: Number(supplier_id) },
      {
        $inc: { outstanding_balance: totalCost },
        $set: { updated_at: now }
      }
    );

    const poResult = { poId, poNumber, totalCost };
    await logActivity(userId, 'PURCHASE_CREATE', 'Purchases', `Created PO ${poNumber} (KSh ${totalCost})`);

    res.status(201).json({ success: true, message: 'Purchase order created successfully', data: poResult });
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  }
};

// 4. Receive Purchased Goods
exports.receivePurchase = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { items } = req.body;
    const userId = req.user ? req.user.id : 1;

    const purchasesCol = db.getCollection('purchases');
    const itemsCol = db.getCollection('purchase_items');
    const productsCol = db.getCollection('products');
    const movementsCol = db.getCollection('stock_movements');

    const po = await purchasesCol.findOne({ id });
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (const item of items) {
      const qtyToReceive = parseInt(item.received_qty, 10);
      if (qtyToReceive > 0) {
        await itemsCol.updateOne(
          { id: Number(item.item_id), purchase_id: id },
          { $inc: { received_qty: qtyToReceive } }
        );

        const prod = await productsCol.findOne({ id: Number(item.product_id) });
        if (prod) {
          const currentStock = prod.quantity;
          const newStock = currentStock + qtyToReceive;

          await productsCol.updateOne(
            { id: prod.id },
            { $set: { quantity: newStock, updated_at: now } }
          );

          const movId = await db.getNextId('stock_movements');
          await movementsCol.insertOne({
            id: movId,
            product_id: prod.id,
            movement_type: 'purchase',
            quantity: qtyToReceive,
            previous_quantity: currentStock,
            new_quantity: newStock,
            unit_cost: prod.purchase_price,
            reference_type: 'purchase',
            reference_id: po.po_number,
            reason: 'Supplier PO delivery received',
            user_id: userId,
            created_at: now
          });
        }
      }
    }

    const allItems = await itemsCol.find({ purchase_id: id }).toArray();
    let totalOrdered = 0;
    let totalReceived = 0;
    for (const ci of allItems) {
      totalOrdered += ci.ordered_qty;
      totalReceived += ci.received_qty;
    }

    const finalStatus = totalReceived >= totalOrdered ? 'received' : (totalReceived > 0 ? 'partial' : 'ordered');
    const receivedDate = now.substring(0, 10);

    await purchasesCol.updateOne(
      { id },
      { $set: { status: finalStatus, received_date: receivedDate, updated_at: now } }
    );

    await logActivity(userId, 'PURCHASE_RECEIVE', 'Purchases', `Received items for PO ID ${id}`);
    res.json({ success: true, message: 'Stock successfully received and inventory updated' });
  } catch (err) {
    console.error('Error receiving purchase:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to receive purchase' });
  }
};
