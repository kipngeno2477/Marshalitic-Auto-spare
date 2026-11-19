const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get all products with filters
exports.getProducts = async (req, res) => {
  try {
    const { category, brand, search, status, lowStock } = req.query;
    const filter = {};

    const productsCol = db.getCollection('products');
    const categoriesCol = db.getCollection('categories');
    const brandsCol = db.getCollection('brands');
    const suppliersCol = db.getCollection('suppliers');
    const pvcCol = db.getCollection('product_vehicle_compatibility');

    if (category) {
      if (!isNaN(category)) {
        filter.category_id = Number(category);
      } else {
        const cat = await categoriesCol.findOne({ slug: category });
        if (cat) {
          filter.category_id = cat.id;
        } else {
          return res.json({ success: true, count: 0, data: [] });
        }
      }
    }

    if (brand) {
      filter.brand_id = Number(brand);
    }

    if (status) {
      filter.status = status;
    }

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$reorder_level'] };
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { name: regex },
        { sku: regex },
        { barcode: regex },
        { product_code: regex }
      ];
    }

    const products = await productsCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();

    // Fetch supporting collections for fast map lookup
    const [categories, brands, suppliers, pvcCounts] = await Promise.all([
      categoriesCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      brandsCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      suppliersCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      pvcCol.aggregate([
        { $group: { _id: '$product_id', count: { $sum: 1 } } }
      ]).toArray()
    ]);

    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const brandMap = new Map(brands.map(b => [b.id, b.name]));
    const supMap = new Map(suppliers.map(s => [s.id, s.name]));
    const pvcMap = new Map(pvcCounts.map(p => [p._id, p.count]));

    const enriched = products.map(p => ({
      ...p,
      category_name: catMap.get(p.category_id) || '',
      brand_name: brandMap.get(p.brand_id) || '',
      supplier_name: supMap.get(p.supplier_id) || '',
      compatible_vehicles_count: pvcMap.get(p.id) || 0
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve products' });
  }
};

// 2. Get product details + compatibility + movements
exports.getProductById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const productsCol = db.getCollection('products');
    const categoriesCol = db.getCollection('categories');
    const brandsCol = db.getCollection('brands');
    const suppliersCol = db.getCollection('suppliers');
    const pvcCol = db.getCollection('product_vehicle_compatibility');
    const vehiclesCol = db.getCollection('vehicles');
    const movementsCol = db.getCollection('stock_movements');
    const usersCol = db.getCollection('users');

    const product = await productsCol.findOne({ id }, { projection: { _id: 0 } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const [category, brand, supplier, pvcRecords, movements, users] = await Promise.all([
      categoriesCol.findOne({ id: product.category_id }, { projection: { name: 1, _id: 0 } }),
      brandsCol.findOne({ id: product.brand_id }, { projection: { name: 1, _id: 0 } }),
      product.supplier_id ? suppliersCol.findOne({ id: product.supplier_id }, { projection: { name: 1, _id: 0 } }) : null,
      pvcCol.find({ product_id: id }, { projection: { _id: 0 } }).toArray(),
      movementsCol.find({ product_id: id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(20).toArray(),
      usersCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray()
    ]);

    // Compatible vehicles
    const vehicleIds = pvcRecords.map(p => p.vehicle_id);
    const vehicles = await vehiclesCol.find({ id: { $in: vehicleIds } }, { projection: { _id: 0 } }).toArray();
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    const compatibleVehicles = pvcRecords
      .map(pvc => {
        const v = vehicleMap.get(pvc.vehicle_id);
        if (!v) return null;
        return {
          ...v,
          compatibility_notes: pvc.notes,
          compatibility_id: pvc.id
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));

    // Movements
    const userMap = new Map(users.map(u => [u.id, u.name]));
    const stockMovements = movements.map(m => ({
      ...m,
      performed_by: userMap.get(m.user_id) || 'System'
    }));

    res.json({
      success: true,
      data: {
        ...product,
        category_name: category ? category.name : '',
        brand_name: brand ? brand.name : '',
        supplier_name: supplier ? supplier.name : '',
        compatibleVehicles,
        stockMovements
      }
    });
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ success: false, message: 'Error fetching product details' });
  }
};

// 3. Create Product
exports.createProduct = async (req, res) => {
  try {
    const {
      name, sku, barcode, category_id, brand_id, supplier_id,
      description, shelf_location, purchase_price, selling_price,
      quantity, reorder_level, image_url, compatible_vehicle_ids
    } = req.body;

    if (!name || !category_id || !brand_id || purchase_price == null || selling_price == null) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (name, category, brand, prices)' });
    }

    const timestamp = Date.now().toString().slice(-6);
    const finalSku = sku || `SKU-${timestamp}`;
    const finalBarcode = barcode || `600${timestamp}99`;
    const finalCode = `PRD-${timestamp}`;
    const initialQty = parseInt(quantity || 0, 10);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const productsCol = db.getCollection('products');
    const movementsCol = db.getCollection('stock_movements');
    const pvcCol = db.getCollection('product_vehicle_compatibility');

    const newId = await db.getNextId('products');

    const newProduct = {
      id: newId,
      product_code: finalCode,
      name: name.trim(),
      sku: finalSku,
      barcode: finalBarcode,
      category_id: Number(category_id),
      brand_id: Number(brand_id),
      supplier_id: supplier_id ? Number(supplier_id) : null,
      description: description || '',
      shelf_location: shelf_location || '',
      purchase_price: parseFloat(purchase_price),
      selling_price: parseFloat(selling_price),
      quantity: initialQty,
      reorder_level: parseInt(reorder_level || 5, 10),
      image_url: image_url || null,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    await productsCol.insertOne(newProduct);

    // Initial stock movement
    if (initialQty > 0) {
      const movId = await db.getNextId('stock_movements');
      await movementsCol.insertOne({
        id: movId,
        product_id: newId,
        movement_type: 'initial',
        quantity: initialQty,
        previous_quantity: 0,
        new_quantity: initialQty,
        unit_cost: parseFloat(purchase_price),
        reference_type: 'initial',
        reference_id: finalCode,
        reason: 'Initial stock setup',
        user_id: req.user ? req.user.id : 1,
        created_at: now
      });
    }

    // Vehicle compatibility
    if (Array.isArray(compatible_vehicle_ids)) {
      for (const vid of compatible_vehicle_ids) {
        const pvcId = await db.getNextId('product_vehicle_compatibility');
        await pvcCol.insertOne({
          id: pvcId,
          product_id: newId,
          vehicle_id: Number(vid),
          notes: 'Compatible OEM fitment',
          created_at: now
        });
      }
    }

    await logActivity(req.user ? req.user.id : 1, 'PRODUCT_CREATE', 'Inventory', `Created product: ${name} (ID: ${newId})`);

    res.status(201).json({ success: true, message: 'Product created successfully', productId: newId });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: 'Failed to create product: ' + err.message });
  }
};

// 4. Update Product
exports.updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name, sku, barcode, category_id, brand_id, supplier_id,
      description, shelf_location, purchase_price, selling_price,
      reorder_level, image_url, status
    } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.getCollection('products').updateOne(
      { id },
      {
        $set: {
          name,
          sku,
          barcode,
          category_id: Number(category_id),
          brand_id: Number(brand_id),
          supplier_id: supplier_id ? Number(supplier_id) : null,
          description: description || '',
          shelf_location: shelf_location || '',
          purchase_price: parseFloat(purchase_price),
          selling_price: parseFloat(selling_price),
          reorder_level: parseInt(reorder_level || 5, 10),
          image_url: image_url || null,
          status: status || 'active',
          updated_at: now
        }
      }
    );

    await logActivity(req.user ? req.user.id : 1, 'PRODUCT_UPDATE', 'Inventory', `Updated product ID: ${id}`);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// 5. Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const salesCheck = await db.getCollection('sale_items').countDocuments({ product_id: id });
    if (salesCheck > 0) {
      await db.getCollection('products').updateOne({ id }, { $set: { status: 'discontinued' } });
      return res.json({ success: true, message: 'Product has historical sales. Marked as discontinued.' });
    }

    await db.getCollection('products').deleteOne({ id });
    await logActivity(req.user ? req.user.id : 1, 'PRODUCT_DELETE', 'Inventory', `Deleted product ID: ${id}`);
    res.json({ success: true, message: 'Product deleted permanently' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

// 6. Stock Adjustment
exports.adjustStock = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { type, quantity, reason, notes } = req.body;

    const numQty = parseInt(quantity, 10);
    if (!numQty || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity required' });
    }

    const productsCol = db.getCollection('products');
    const product = await productsCol.findOne({ id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prevQty = product.quantity;
    let newQty = prevQty;

    if (type === 'adjustment_add') {
      newQty = prevQty + numQty;
    } else if (type === 'adjustment_deduct' || type === 'damaged') {
      if (prevQty < numQty) {
        return res.status(400).json({ success: false, message: 'Cannot deduct more than available stock' });
      }
      newQty = prevQty - numQty;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid adjustment type' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await productsCol.updateOne({ id }, { $set: { quantity: newQty, updated_at: now } });

    const movId = await db.getNextId('stock_movements');
    await db.getCollection('stock_movements').insertOne({
      id: movId,
      product_id: id,
      movement_type: type,
      quantity: numQty,
      previous_quantity: prevQty,
      new_quantity: newQty,
      unit_cost: product.purchase_price,
      reference_type: 'adjustment',
      reference_id: `ADJ-${Date.now().toString().slice(-6)}`,
      reason: reason || notes || 'Manual inventory adjustment',
      user_id: req.user ? req.user.id : 1,
      created_at: now
    });

    await logActivity(req.user ? req.user.id : 1, 'STOCK_ADJUSTMENT', 'Inventory', `Adjusted product ${product.name} (${type}: ${numQty} units)`);

    res.json({ success: true, message: 'Stock adjusted successfully', previous_quantity: prevQty, new_quantity: newQty });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing stock adjustment' });
  }
};

// 7. Inventory Valuation Summary
exports.getValuation = async (req, res) => {
  try {
    const productsCol = db.getCollection('products');
    const result = await productsCol.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          total_skus: { $sum: 1 },
          total_units: { $sum: '$quantity' },
          total_cost_value: { $sum: { $multiply: ['$quantity', '$purchase_price'] } },
          total_retail_value: { $sum: { $multiply: ['$quantity', '$selling_price'] } },
          potential_profit: {
            $sum: { $multiply: ['$quantity', { $subtract: ['$selling_price', '$purchase_price'] }] }
          }
        }
      }
    ]).toArray();

    const data = result.length > 0 ? result[0] : {
      total_skus: 0,
      total_units: 0,
      total_cost_value: 0,
      total_retail_value: 0,
      potential_profit: 0
    };

    delete data._id;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error calculating inventory valuation' });
  }
};

// 8. Categories
exports.getCategories = async (req, res) => {
  try {
    const categoriesCol = db.getCollection('categories');
    const productsCol = db.getCollection('products');

    const categories = await categoriesCol.find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
    const productCounts = await productsCol.aggregate([
      { $group: { _id: '$category_id', count: { $sum: 1 } } }
    ]).toArray();
    const countMap = new Map(productCounts.map(p => [p._id, p.count]));

    const enriched = categories.map(c => ({
      ...c,
      product_count: countMap.get(c.id) || 0
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = await db.getNextId('categories');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.getCollection('categories').insertOne({
      id,
      name: name.trim(),
      slug,
      description: description || '',
      icon: icon || 'Package',
      created_at: now
    });

    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// 9. Brands
exports.getBrands = async (req, res) => {
  try {
    const brandsCol = db.getCollection('brands');
    const productsCol = db.getCollection('products');

    const brands = await brandsCol.find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
    const productCounts = await productsCol.aggregate([
      { $group: { _id: '$brand_id', count: { $sum: 1 } } }
    ]).toArray();
    const countMap = new Map(productCounts.map(p => [p._id, p.count]));

    const enriched = brands.map(b => ({
      ...b,
      product_count: countMap.get(b.id) || 0
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching brands' });
  }
};
