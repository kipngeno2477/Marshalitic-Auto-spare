const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  console.log('🌱 Starting MongoDB database seeding for Mashalitic Auto Spares...');
  await db.initialize();

  // 1. Seed Shop Settings
  const defaultSettings = [
    { setting_key: 'shop_name', setting_value: 'MASHALITIC AUTO SPARES', description: 'Official business registered name' },
    { setting_key: 'tagline', setting_value: 'Drive with Confidence.', description: 'Company motto/tagline' },
    { setting_key: 'currency', setting_value: 'KSh', description: 'Primary operating currency' },
    { setting_key: 'vat_rate', setting_value: '16.00', description: 'Standard VAT rate percentage' },
    { setting_key: 'vat_enabled', setting_value: 'true', description: 'Whether VAT is applied at checkout' },
    { setting_key: 'phone', setting_value: '+254 712 345 678', description: 'Primary customer contact phone' },
    { setting_key: 'email', setting_value: 'sales@mashalitic.co.ke', description: 'Official contact email' },
    { setting_key: 'address', setting_value: 'Kirinyaga Road, Motor Mart Plaza, Shop G-12, Nairobi, Kenya', description: 'Physical store location' },
    { setting_key: 'shop_status', setting_value: 'open', description: 'Current shop operational status (open/closed)' },
    { setting_key: 'invoice_prefix', setting_value: 'INV-', description: 'Prefix for sales invoices' },
    { setting_key: 'po_prefix', setting_value: 'PO-', description: 'Prefix for purchase orders' },
    { setting_key: 'receipt_footer', setting_value: 'Thank you for choosing Mashalitic Auto Spares! Genuine parts guaranteed.', description: 'Receipt footer' },
    { setting_key: 'mpesa_paybill', setting_value: '247247', description: 'M-Pesa Business Short Code / Paybill / Till' },
    { setting_key: 'mpesa_account', setting_value: 'MASHALITIC', description: 'Default M-Pesa Account Reference' },
    { setting_key: 'low_stock_threshold', setting_value: '5', description: 'Default reorder warning threshold' }
  ];

  const settingsCol = db.getCollection('shop_settings');
  for (const s of defaultSettings) {
    await settingsCol.updateOne(
      { setting_key: s.setting_key },
      { $set: s },
      { upsert: true }
    );
  }

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);
  const storeHash = await bcrypt.hash('store123', 10);

  const users = [
    { id: 1, name: 'Brian Admin', email: 'admin@mashalitic.co.ke', phone: '+254711000111', password_hash: passwordHash, role: 'admin', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 2, name: 'Sarah Mwangi', email: 'manager@mashalitic.co.ke', phone: '+254711000222', password_hash: managerHash, role: 'manager', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { id: 3, name: 'Brian Cashier', email: 'cashier@mashalitic.co.ke', phone: '+254711000333', password_hash: cashierHash, role: 'cashier', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { id: 4, name: 'David Omondi', email: 'store@mashalitic.co.ke', phone: '+254711000444', password_hash: storeHash, role: 'storekeeper', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' }
  ];

  const usersCol = db.getCollection('users');
  for (const u of users) {
    await usersCol.updateOne(
      { email: u.email },
      { $set: { ...u, updated_at: new Date().toISOString() }, $setOnInsert: { created_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // 3. Seed Categories
  const categories = [
    { id: 1, name: 'Braking System', slug: 'braking-system', description: 'Discs, pads, calipers, brake fluid and accessories', icon: 'Disc' },
    { id: 2, name: 'Filtration & Engine', slug: 'filtration-engine', description: 'Oil, air, fuel, and cabin air filters', icon: 'Filter' },
    { id: 3, name: 'Lubricants & Fluids', slug: 'lubricants-fluids', description: 'Synthetic motor oils, transmission oils, coolant', icon: 'Droplet' },
    { id: 4, name: 'Ignition & Electrical', slug: 'ignition-electrical', description: 'Spark plugs, alternators, starters, coils', icon: 'Zap' },
    { id: 5, name: 'Batteries & Power', slug: 'batteries-power', description: 'Heavy-duty maintenance-free automotive batteries', icon: 'BatteryCharging' },
    { id: 6, name: 'Suspension & Steering', slug: 'suspension-steering', description: 'Shock absorbers, ball joints, control arms', icon: 'Activity' },
    { id: 7, name: 'Wipers & Visibility', slug: 'wipers-visibility', description: 'Silicone and graphite wiper blades and lamps', icon: 'Eye' },
    { id: 8, name: 'Transmission & Drivetrain', slug: 'transmission-drivetrain', description: 'Clutch kits, CV joints, wheel bearings', icon: 'Cog' }
  ];

  const catCol = db.getCollection('categories');
  for (const c of categories) {
    await catCol.updateOne(
      { slug: c.slug },
      { $set: { ...c, created_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // 4. Seed Brands
  const brands = [
    { id: 1, name: 'Toyota Genuine Parts', origin: 'Japan', logo_url: 'https://logo.clearbit.com/toyota.com' },
    { id: 2, name: 'Bosch Automotive', origin: 'Germany', logo_url: 'https://logo.clearbit.com/bosch.com' },
    { id: 3, name: 'Denso Corporation', origin: 'Japan', logo_url: 'https://logo.clearbit.com/denso.com' },
    { id: 4, name: 'KYB Shocks', origin: 'Japan', logo_url: 'https://logo.clearbit.com/kyb.com' },
    { id: 5, name: 'Valvoline', origin: 'USA', logo_url: 'https://logo.clearbit.com/valvoline.com' },
    { id: 6, name: 'Chloride Exide', origin: 'Kenya', logo_url: 'https://logo.clearbit.com/chlorideexide.com' },
    { id: 7, name: 'NGK Spark Plugs', origin: 'Japan', logo_url: 'https://logo.clearbit.com/ngk.com' },
    { id: 8, name: 'Castrol Lubricants', origin: 'UK', logo_url: 'https://logo.clearbit.com/castrol.com' },
    { id: 9, name: 'Gates Automotive', origin: 'USA', logo_url: 'https://logo.clearbit.com/gates.com' }
  ];

  const brandsCol = db.getCollection('brands');
  for (const b of brands) {
    await brandsCol.updateOne(
      { name: b.name },
      { $set: { ...b, created_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // 5. Seed Suppliers
  const suppliers = [
    { id: 1, name: 'AutoXpress Kenya', company_name: 'AutoXpress Kenya Ltd', contact_person: 'Kevin Nderitu', phone: '+254 709 888 000', email: 'kevin@autoxpress.co.ke', address: 'Commercial Street, Industrial Area, Nairobi', payment_terms: 'Net 30', outstanding_balance: 45000.00 },
    { id: 2, name: 'Denso East Africa', company_name: 'Denso Distribution Ltd', contact_person: 'Amina Yusuf', phone: '+254 711 223 344', email: 'sales@denso-ea.com', address: 'Mombasa Road Gateway Park, Nairobi', payment_terms: 'Net 15', outstanding_balance: 0.00 },
    { id: 3, name: 'Chloride Exide Ltd', company_name: 'Chloride Exide Kenya', contact_person: 'Patrick Ouma', phone: '+254 722 203 615', email: 'houma@chlorideexide.com', address: 'Enterprise Road, Industrial Area, Nairobi', payment_terms: 'Net 30', outstanding_balance: 82000.00 },
    { id: 4, name: 'Impala Wholesalers', company_name: 'Impala Auto Spares Ltd', contact_person: 'George Kariuki', phone: '+254 721 556 677', email: 'info@impalaauto.co.ke', address: 'Kirinyaga Road, Nairobi', payment_terms: 'Cash on Delivery', outstanding_balance: 0.00 }
  ];

  const supCol = db.getCollection('suppliers');
  for (const s of suppliers) {
    await supCol.updateOne(
      { name: s.name },
      { $set: { ...s, updated_at: new Date().toISOString() }, $setOnInsert: { created_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // 6. Seed Customers
  const customers = [
    { id: 1, name: 'James Mwangi', phone: '+254 712 345 678', email: 'james.m@gmail.com', vehicle_reg_no: 'KDA 421B', address: 'Westlands, Nairobi', credit_limit: 30000.00, outstanding_balance: 4500.00, total_purchases: 68000.00 },
    { id: 2, name: 'Grace Wanjiku', phone: '+254 722 890 123', email: 'grace.w@yahoo.com', vehicle_reg_no: 'KCS 819A', address: 'South B, Nairobi', credit_limit: 20000.00, outstanding_balance: 0.00, total_purchases: 42500.00 },
    { id: 3, name: 'Peter Otieno', phone: '+254 733 456 789', email: 'otieno.peter@outlook.com', vehicle_reg_no: 'KDG 633E', address: 'Ngong Road, Nairobi', credit_limit: 15000.00, outstanding_balance: 0.00, total_purchases: 24800.00 },
    { id: 4, name: 'Kelvin Kiprop', phone: '+254 701 998 877', email: 'kelvin.k@gmail.com', vehicle_reg_no: 'KCK 104Z', address: 'Eldoret / Nairobi', credit_limit: 50000.00, outstanding_balance: 12000.00, total_purchases: 115000.00 },
    { id: 5, name: 'Mary Achieng', phone: '+254 720 112 233', email: 'achieng.m@gmail.com', vehicle_reg_no: 'KBY 774H', address: 'Kasarani, Nairobi', credit_limit: 10000.00, outstanding_balance: 0.00, total_purchases: 18500.00 },
    { id: 6, name: 'Apex Fleet Solutions Ltd', phone: '+254 799 123 456', email: 'procurement@apexfleet.co.ke', vehicle_reg_no: 'FLEET-MULTIPLE', address: 'Mombasa Road, Nairobi', credit_limit: 250000.00, outstanding_balance: 78000.00, total_purchases: 540000.00 }
  ];

  const custCol = db.getCollection('customers');
  for (const c of customers) {
    await custCol.updateOne(
      { phone: c.phone },
      { $set: { ...c, updated_at: new Date().toISOString() }, $setOnInsert: { created_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // 7. Seed Vehicles
  const vehicles = [
    { id: 1, make: 'Toyota', model: 'Vitz', year_from: 2005, year_to: 2015, engine_type: '1NZ-FE / 2SZ-FE', engine_capacity: '1.3L / 1.5L', fuel_type: 'Petrol' },
    { id: 2, make: 'Toyota', model: 'Premio', year_from: 2007, year_to: 2016, engine_type: '2ZR-FAE / 1NZ-FE', engine_capacity: '1.5L / 1.8L / 2.0L', fuel_type: 'Petrol' },
    { id: 3, make: 'Toyota', model: 'Fielder', year_from: 2006, year_to: 2018, engine_type: '1NZ-FE / 2ZR-FAE', engine_capacity: '1.5L / 1.8L', fuel_type: 'Petrol' },
    { id: 4, make: 'Nissan', model: 'Note', year_from: 2012, year_to: 2020, engine_type: 'HR12DE / HR12DDR', engine_capacity: '1.2L Supercharged', fuel_type: 'Petrol' },
    { id: 5, make: 'Toyota', model: 'Probox / Succeed', year_from: 2002, year_to: 2022, engine_type: '1NZ-FE / 2NZ-FE', engine_capacity: '1.3L / 1.5L', fuel_type: 'Petrol' },
    { id: 6, make: 'Subaru', model: 'Forester', year_from: 2008, year_to: 2018, engine_type: 'EJ20 / FB20 / FA20 Turbo', engine_capacity: '2.0L / 2.5L Boxster', fuel_type: 'Petrol' },
    { id: 7, make: 'Mazda', model: 'Demio', year_from: 2007, year_to: 2015, engine_type: 'ZJ-VE / ZY-VE', engine_capacity: '1.3L / 1.5L SkyActiv', fuel_type: 'Petrol' },
    { id: 8, make: 'Toyota', model: 'Land Cruiser Prado', year_from: 2009, year_to: 2021, engine_type: '1KD-FTV / 1GD-FTV', engine_capacity: '3.0L / 2.8L Turbo', fuel_type: 'Diesel' },
    { id: 9, make: 'Toyota', model: 'Hilux Revo / Vigo', year_from: 2015, year_to: 2023, engine_type: '2GD-FTV / 1GD-FTV', engine_capacity: '2.4L / 2.8L Turbo', fuel_type: 'Diesel' },
    { id: 10, make: 'Mitsubishi', model: 'Outlander', year_from: 2012, year_to: 2019, engine_type: '4J11 / 4J12 / 4B12', engine_capacity: '2.0L / 2.4L MIVEC', fuel_type: 'Petrol' }
  ];

  const vehCol = db.getCollection('vehicles');
  for (const v of vehicles) {
    await vehCol.updateOne(
      { make: v.make, model: v.model, year_from: v.year_from, year_to: v.year_to },
      { $set: { ...v, created_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  // Set sequence counters
  const countersCol = db.getCollection('counters');
  const collectionsWithId = [
    'users', 'categories', 'brands', 'suppliers', 'customers',
    'vehicles', 'products', 'product_vehicle_compatibility',
    'sales', 'sale_items', 'payments', 'purchases', 'purchase_items',
    'expenses', 'stock_movements', 'returns', 'return_items',
    'notifications', 'audit_logs'
  ];

  for (const colName of collectionsWithId) {
    const highest = await db.getCollection(colName).find({}, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).toArray();
    const maxVal = highest.length > 0 && highest[0].id ? highest[0].id : 0;
    await countersCol.updateOne(
      { _id: colName },
      { $set: { seq: maxVal } },
      { upsert: true }
    );
  }

  console.log('✅ MongoDB Seeding completed successfully! All data structures ready.');
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
