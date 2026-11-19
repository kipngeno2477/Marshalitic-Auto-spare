const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Customers
exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { name: regex },
        { phone: regex },
        { vehicle_reg_no: regex },
        { email: regex }
      ];
    }

    const customersCol = db.getCollection('customers');
    const salesCol = db.getCollection('sales');

    const customers = await customersCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();

    // Attach sales_count and last_purchase_date
    const enriched = await Promise.all(
      customers.map(async (c) => {
        const sales = await salesCol
          .find({ customer_id: c.id }, { projection: { sale_date: 1, _id: 0 } })
          .sort({ sale_date: -1 })
          .toArray();

        return {
          ...c,
          sales_count: sales.length,
          last_purchase_date: sales.length > 0 ? sales[0].sale_date : null
        };
      })
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve customers' });
  }
};

// 2. Customer Statement & Ledger
exports.getCustomerById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customersCol = db.getCollection('customers');
    const salesCol = db.getCollection('sales');
    const paymentsCol = db.getCollection('payments');

    const customer = await customersCol.findOne({ id }, { projection: { _id: 0 } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const sales = await salesCol
      .find({ customer_id: id }, { projection: { _id: 0 } })
      .sort({ sale_date: -1 })
      .toArray();

    const payments = await paymentsCol
      .find({ customer_id: id }, { projection: { _id: 0 } })
      .sort({ payment_date: -1 })
      .toArray();

    res.json({
      success: true,
      data: {
        ...customer,
        sales,
        payments
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

    const id = await db.getNextId('customers');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newCustomer = {
      id,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      vehicle_reg_no: vehicle_reg_no ? vehicle_reg_no.trim().toUpperCase() : '',
      address: address ? address.trim() : '',
      credit_limit: parseFloat(credit_limit || 0),
      outstanding_balance: 0.00,
      total_purchases: 0.00,
      created_at: now,
      updated_at: now
    };

    await db.getCollection('customers').insertOne(newCustomer);
    await logActivity(req.user ? req.user.id : 1, 'CUSTOMER_CREATE', 'Customers', `Created customer: ${name} (${phone})`);

    res.status(201).json({ success: true, customerId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
};

// 4. Update Customer
exports.updateCustomer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, email, vehicle_reg_no, address, credit_limit } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.getCollection('customers').updateOne(
      { id },
      {
        $set: {
          name: name ? name.trim() : '',
          phone: phone ? phone.trim() : '',
          email: email ? email.trim() : '',
          vehicle_reg_no: vehicle_reg_no ? vehicle_reg_no.trim().toUpperCase() : '',
          address: address ? address.trim() : '',
          credit_limit: parseFloat(credit_limit || 0),
          updated_at: now
        }
      }
    );

    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
};
