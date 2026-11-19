const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { name: regex },
        { company_name: regex },
        { phone: regex },
        { contact_person: regex }
      ];
    }

    const suppliersCol = db.getCollection('suppliers');
    const purchasesCol = db.getCollection('purchases');
    const productsCol = db.getCollection('products');

    const suppliers = await suppliersCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();

    const enriched = await Promise.all(
      suppliers.map(async (s) => {
        const po_count = await purchasesCol.countDocuments({ supplier_id: s.id });
        const supplied_products_count = await productsCol.countDocuments({ supplier_id: s.id });
        return {
          ...s,
          po_count,
          supplied_products_count
        };
      })
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve suppliers' });
  }
};

// 2. Get Supplier Details
exports.getSupplierById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const suppliersCol = db.getCollection('suppliers');
    const purchasesCol = db.getCollection('purchases');
    const productsCol = db.getCollection('products');

    const supplier = await suppliersCol.findOne({ id }, { projection: { _id: 0 } });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchaseOrders = await purchasesCol
      .find({ supplier_id: id }, { projection: { _id: 0 } })
      .sort({ order_date: -1 })
      .toArray();

    const products = await productsCol
      .find({ supplier_id: id }, { projection: { id: 1, name: 1, sku: 1, purchase_price: 1, quantity: 1, _id: 0 } })
      .toArray();

    res.json({
      success: true,
      data: {
        ...supplier,
        purchaseOrders,
        products
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

    const id = await db.getNextId('suppliers');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newSupplier = {
      id,
      name: name.trim(),
      company_name: company_name ? company_name.trim() : name.trim(),
      contact_person: contact_person ? contact_person.trim() : '',
      phone: phone.trim(),
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      payment_terms: payment_terms || 'Net 30',
      outstanding_balance: 0.00,
      created_at: now,
      updated_at: now
    };

    await db.getCollection('suppliers').insertOne(newSupplier);
    await logActivity(req.user ? req.user.id : 1, 'SUPPLIER_CREATE', 'Suppliers', `Created supplier: ${name}`);

    res.status(201).json({ success: true, supplierId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
};

// 4. Update Supplier
exports.updateSupplier = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, company_name, contact_person, phone, email, address, payment_terms } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.getCollection('suppliers').updateOne(
      { id },
      {
        $set: {
          name: name ? name.trim() : '',
          company_name: company_name ? company_name.trim() : '',
          contact_person: contact_person ? contact_person.trim() : '',
          phone: phone ? phone.trim() : '',
          email: email ? email.trim() : '',
          address: address ? address.trim() : '',
          payment_terms: payment_terms || 'Net 30',
          updated_at: now
        }
      }
    );

    res.json({ success: true, message: 'Supplier updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
};
