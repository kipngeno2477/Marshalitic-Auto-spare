const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get all vehicle models
exports.getVehicles = async (req, res) => {
  try {
    const { make, search } = req.query;
    const filter = {};

    if (make) {
      filter.make = make;
    }
    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { make: regex },
        { model: regex },
        { engine_type: regex }
      ];
    }

    const vehiclesCol = db.getCollection('vehicles');
    const vehicles = await vehiclesCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ make: 1, model: 1, year_from: -1 })
      .toArray();

    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicles' });
  }
};

// 2. Get distinct vehicle makes
exports.getVehicleMakes = async (req, res) => {
  try {
    const vehiclesCol = db.getCollection('vehicles');
    const makes = await vehiclesCol.distinct('make');
    makes.sort((a, b) => a.localeCompare(b));
    res.json({ success: true, data: makes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicle makes' });
  }
};

// 3. Search Spare Parts Compatible with Vehicle
exports.searchByVehicle = async (req, res) => {
  try {
    const { make, model, year, category_id, search } = req.query;

    const vehiclesCol = db.getCollection('vehicles');
    const pvcCol = db.getCollection('product_vehicle_compatibility');
    const productsCol = db.getCollection('products');
    const categoriesCol = db.getCollection('categories');
    const brandsCol = db.getCollection('brands');

    // 1. Filter vehicles
    const vehicleFilter = {};
    if (make) vehicleFilter.make = make;
    if (model) vehicleFilter.model = model;
    if (year) {
      const yr = parseInt(year, 10);
      vehicleFilter.year_from = { $lte: yr };
      vehicleFilter.year_to = { $gte: yr };
    }

    const matchedVehicles = await vehiclesCol.find(vehicleFilter, { projection: { _id: 0 } }).toArray();
    const vehicleMap = new Map(matchedVehicles.map(v => [v.id, v]));
    const vehicleIds = matchedVehicles.map(v => v.id);

    // If vehicle search was specified and no vehicles match, return empty
    if ((make || model || year) && vehicleIds.length === 0) {
      return res.json({
        success: true,
        query: { make, model, year, category_id },
        count: 0,
        data: []
      });
    }

    // 2. Find compatibility records
    const pvcFilter = vehicleIds.length > 0 ? { vehicle_id: { $in: vehicleIds } } : {};
    const pvcRecords = await pvcCol.find(pvcFilter, { projection: { _id: 0 } }).toArray();
    const pvcMap = new Map(pvcRecords.map(p => [p.product_id, p]));
    const productIds = pvcRecords.map(p => p.product_id);

    // 3. Find products
    const productFilter = { status: 'active' };
    if (pvcRecords.length > 0) {
      productFilter.id = { $in: productIds };
    } else if (make || model || year) {
      // Vehicle specified but no compatibility records found
      return res.json({
        success: true,
        query: { make, model, year, category_id },
        count: 0,
        data: []
      });
    }

    if (category_id) {
      productFilter.category_id = Number(category_id);
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      productFilter.$or = [
        { name: regex },
        { sku: regex },
        { description: regex }
      ];
    }

    const products = await productsCol.find(productFilter, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();

    // Attach category, brand, and vehicle details
    const categories = await categoriesCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray();
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const brands = await brandsCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray();
    const brandMap = new Map(brands.map(b => [b.id, b.name]));

    const enriched = products.map(p => {
      const pvc = pvcMap.get(p.id) || {};
      const v = vehicleMap.get(pvc.vehicle_id) || {};
      return {
        ...p,
        category_name: catMap.get(p.category_id) || '',
        brand_name: brandMap.get(p.brand_id) || '',
        matched_make: v.make || '',
        matched_model: v.model || '',
        year_from: v.year_from || null,
        year_to: v.year_to || null,
        engine_type: v.engine_type || '',
        engine_capacity: v.engine_capacity || '',
        fitment_notes: pvc.notes || 'Direct OEM replacement'
      };
    });

    res.json({
      success: true,
      query: { make, model, year, category_id },
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('Error searching by vehicle:', err);
    res.status(500).json({ success: false, message: 'Vehicle compatibility search failed' });
  }
};

// 4. Add vehicle
exports.createVehicle = async (req, res) => {
  try {
    const { make, model, year_from, year_to, engine_type, engine_capacity, fuel_type } = req.body;
    if (!make || !model || !year_from || !year_to) {
      return res.status(400).json({ success: false, message: 'Make, model, and year range are required' });
    }

    const id = await db.getNextId('vehicles');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newVehicle = {
      id,
      make: make.trim(),
      model: model.trim(),
      year_from: parseInt(year_from, 10),
      year_to: parseInt(year_to, 10),
      engine_type: engine_type ? engine_type.trim() : '',
      engine_capacity: engine_capacity ? engine_capacity.trim() : '',
      fuel_type: fuel_type || 'Petrol',
      created_at: now
    };

    await db.getCollection('vehicles').insertOne(newVehicle);
    res.status(201).json({ success: true, vehicleId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create vehicle record' });
  }
};

// 5. Link product to vehicle
exports.linkCompatibility = async (req, res) => {
  try {
    const { product_id, vehicle_id, notes } = req.body;
    if (!product_id || !vehicle_id) {
      return res.status(400).json({ success: false, message: 'product_id and vehicle_id are required' });
    }

    const pvcCol = db.getCollection('product_vehicle_compatibility');
    const pid = Number(product_id);
    const vid = Number(vehicle_id);

    const existing = await pvcCol.findOne({ product_id: pid, vehicle_id: vid });
    if (!existing) {
      const id = await db.getNextId('product_vehicle_compatibility');
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await pvcCol.insertOne({
        id,
        product_id: pid,
        vehicle_id: vid,
        notes: notes || 'Direct OEM replacement',
        created_at: now
      });
    } else if (notes) {
      await pvcCol.updateOne({ product_id: pid, vehicle_id: vid }, { $set: { notes } });
    }

    res.json({ success: true, message: 'Compatibility linked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to link compatibility' });
  }
};
