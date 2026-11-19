const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Customer Online Order Checkout
exports.placeCustomerOrder = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      vehicle_reg_no,
      delivery_method = 'pickup',
      delivery_address,
      items,
      payment_method = 'mpesa',
      mpesa_phone,
      notes
    } = req.body;

    if (!customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and at least one order item are required.'
      });
    }

    const customersCol = db.getCollection('customers');
    const productsCol = db.getCollection('products');
    const salesCol = db.getCollection('sales');
    const saleItemsCol = db.getCollection('sale_items');
    const movementsCol = db.getCollection('stock_movements');
    const notifsCol = db.getCollection('notifications');
    const paymentsCol = db.getCollection('payments');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Find or create customer
    let customerId = null;
    const cleanPhone = customer_phone.trim();
    const existingCust = await customersCol.findOne({ phone: cleanPhone });

    if (existingCust) {
      customerId = existingCust.id;
      if (vehicle_reg_no) {
        await customersCol.updateOne(
          { id: customerId },
          { $set: { vehicle_reg_no: vehicle_reg_no.trim().toUpperCase(), updated_at: now } }
        );
      }
    } else {
      customerId = await db.getNextId('customers');
      await customersCol.insertOne({
        id: customerId,
        name: customer_name.trim(),
        phone: cleanPhone,
        email: customer_email ? customer_email.trim() : null,
        vehicle_reg_no: vehicle_reg_no ? vehicle_reg_no.trim().toUpperCase() : null,
        address: delivery_address || 'Customer Online Order',
        credit_limit: 0.00,
        outstanding_balance: 0.00,
        total_purchases: 0.00,
        created_at: now,
        updated_at: now
      });
    }

    // 2. Verify products & stock
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prod = await productsCol.findOne({ id: Number(item.product_id) });
      if (!prod) {
        throw new Error(`Product ID ${item.product_id} is no longer available.`);
      }
      if (prod.quantity < item.quantity) {
        throw new Error(`Item "${prod.name}" has only ${prod.quantity} units in stock. You requested ${item.quantity}.`);
      }

      const lineTotal = prod.selling_price * item.quantity;
      subtotal += lineTotal;

      verifiedItems.push({
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: item.quantity,
        unit_price: prod.selling_price,
        unit_cost: prod.purchase_price,
        subtotal: lineTotal,
        total: lineTotal,
        current_qty: prod.quantity,
        reorder_level: prod.reorder_level
      });
    }

    // 3. Calculate VAT & delivery fee
    const deliveryFee = delivery_method === 'delivery' ? 500 : 0;
    const vatRate = 16.00;
    const vatAmount = (subtotal * vatRate) / (100 + vatRate);
    const totalAmount = subtotal + deliveryFee;

    // 4. Generate order / invoice number
    const timestamp = Date.now().toString().slice(-5);
    const orderNumber = `ORD-${timestamp}`;
    const saleId = await db.getNextId('sales');

    const newSale = {
      id: saleId,
      invoice_number: orderNumber,
      customer_id: customerId,
      customer_name: customer_name.trim(),
      cashier_id: 1,
      sale_date: now,
      subtotal,
      discount_amount: 0.00,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      paid_amount: totalAmount,
      payment_method,
      payment_status: payment_method === 'mpesa' ? 'paid' : 'pending',
      status: 'completed',
      notes: `Online Customer Order (${delivery_method.toUpperCase()}). Address: ${delivery_address || 'Showroom Pickup'}. ${notes || ''}`,
      sync_status: 'synced',
      created_at: now,
      updated_at: now
    };

    await salesCol.insertOne(newSale);

    // 5. Insert sale items, deduct stock, and log stock movement
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
        reference_id: orderNumber,
        reason: 'Online customer web purchase',
        user_id: 1,
        created_at: now
      });

      if (newStock <= vi.reorder_level) {
        const notifId = await db.getNextId('notifications');
        await notifsCol.insertOne({
          id: notifId,
          title: `Low Stock: ${vi.name}`,
          message: `Item "${vi.name}" reached ${newStock} units left following online order ${orderNumber}`,
          type: 'low_stock',
          reference_id: vi.sku,
          is_read: 0,
          created_at: now
        });
      }
    }

    // 6. Record payment & notification
    const receiptCode = payment_method === 'mpesa' ? 'MSH' + Math.random().toString(36).substring(2, 9).toUpperCase() : null;
    const payId = await db.getNextId('payments');
    await paymentsCol.insertOne({
      id: payId,
      sale_id: saleId,
      customer_id: customerId,
      amount: totalAmount,
      payment_method,
      reference_code: receiptCode || `WEB-${orderNumber}`,
      mpesa_phone: mpesa_phone || customer_phone,
      mpesa_receipt: receiptCode,
      payment_date: now,
      received_by: 1,
      notes: 'Online storefront customer checkout'
    });

    // Update customer total purchases
    await customersCol.updateOne(
      { id: customerId },
      {
        $inc: { total_purchases: totalAmount },
        $set: { updated_at: now }
      }
    );

    // Notification for staff
    const notifId = await db.getNextId('notifications');
    await notifsCol.insertOne({
      id: notifId,
      title: `New Online Order: ${orderNumber}`,
      message: `Customer ${customer_name} placed order ${orderNumber} for KSh ${totalAmount.toLocaleString()} (${delivery_method})`,
      type: 'payment_received',
      reference_id: orderNumber,
      is_read: 0,
      created_at: now
    });

    const orderResult = {
      orderId: saleId,
      orderNumber,
      customerName: customer_name,
      customerPhone: customer_phone,
      deliveryMethod: delivery_method,
      deliveryAddress: delivery_address || 'Kirinyaga Road Showroom Pickup',
      subtotal,
      deliveryFee,
      vatAmount,
      totalAmount,
      paymentMethod: payment_method,
      mpesaReceipt: receiptCode,
      items: verifiedItems,
      placedAt: now
    };

    await logActivity(1, 'ONLINE_ORDER', 'Storefront', `New online order: ${orderNumber} for KSh ${totalAmount}`);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: orderResult
    });
  } catch (err) {
    console.error('Customer checkout error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to place order. Please check item stock.'
    });
  }
};

// 2. Track Order Status by Order Number or Phone Number
exports.trackOrder = async (req, res) => {
  try {
    const { query } = req.params;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Provide an Order Number or Phone Number' });
    }

    const cleanQuery = query.trim();
    const regex = new RegExp(cleanQuery, 'i');

    const salesCol = db.getCollection('sales');
    const customersCol = db.getCollection('customers');
    const saleItemsCol = db.getCollection('sale_items');
    const productsCol = db.getCollection('products');

    // Find customers matching phone
    const matchedCustomers = await customersCol.find({ phone: regex }, { projection: { id: 1, phone: 1, vehicle_reg_no: 1, _id: 0 } }).toArray();
    const custMap = new Map(matchedCustomers.map(c => [c.id, c]));
    const matchedCustIds = matchedCustomers.map(c => c.id);

    const saleFilter = {
      $or: [
        { invoice_number: cleanQuery },
        { notes: regex }
      ]
    };
    if (matchedCustIds.length > 0) {
      saleFilter.$or.push({ customer_id: { $in: matchedCustIds } });
    }

    const sales = await salesCol
      .find(saleFilter, { projection: { _id: 0 } })
      .sort({ sale_date: -1 })
      .limit(10)
      .toArray();

    if (sales.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found matching this reference.' });
    }

    const allCustIds = [...new Set(sales.map(s => s.customer_id).filter(Boolean))];
    const allCusts = await customersCol.find({ id: { $in: allCustIds } }, { projection: { id: 1, phone: 1, vehicle_reg_no: 1, _id: 0 } }).toArray();
    const allCustMap = new Map(allCusts.map(c => [c.id, c]));

    const formattedSales = sales.map(s => {
      const c = allCustMap.get(s.customer_id) || {};
      return {
        id: s.id,
        order_number: s.invoice_number,
        customer_name: s.customer_name,
        sale_date: s.sale_date,
        subtotal: s.subtotal,
        vat_amount: s.vat_amount,
        total_amount: s.total_amount,
        payment_method: s.payment_method,
        payment_status: s.payment_status,
        order_status: s.status,
        notes: s.notes,
        customer_phone: c.phone || '',
        vehicle_reg_no: c.vehicle_reg_no || ''
      };
    });

    const mainOrder = formattedSales[0];
    const items = await saleItemsCol.find({ sale_id: mainOrder.id }, { projection: { _id: 0 } }).toArray();

    const productIds = items.map(it => it.product_id);
    const products = await productsCol.find({ id: { $in: productIds } }, { projection: { id: 1, image_url: 1, shelf_location: 1, _id: 0 } }).toArray();
    const prodMap = new Map(products.map(p => [p.id, p]));

    const enrichedItems = items.map(it => {
      const p = prodMap.get(it.product_id) || {};
      return {
        ...it,
        image_url: p.image_url || null,
        shelf_location: p.shelf_location || ''
      };
    });

    res.json({
      success: true,
      data: {
        ...mainOrder,
        items: enrichedItems,
        allMatches: formattedSales
      }
    });
  } catch (err) {
    console.error('Order tracking error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve order tracking info' });
  }
};
