const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  console.log('🌱 Starting database seeding for Mashalitic Auto Spares...');
  await db.initialize();

  // 1. Seed Shop Settings
  const defaultSettings = [
    ['shop_name', 'MASHALITIC AUTO SPARES', 'Official business registered name'],
    ['tagline', 'Drive with Confidence.', 'Company motto/tagline'],
    ['currency', 'KSh', 'Primary operating currency'],
    ['vat_rate', '16.00', 'Standard VAT rate percentage'],
    ['vat_enabled', 'true', 'Whether VAT is applied at checkout'],
    ['phone', '+254 712 345 678', 'Primary customer contact phone'],
    ['email', 'sales@mashalitic.co.ke', 'Official contact email'],
    ['address', 'Kirinyaga Road, Motor Mart Plaza, Shop G-12, Nairobi, Kenya'],
    ['shop_status', 'open', 'Current shop operational status (open/closed)'],
    ['invoice_prefix', 'INV-', 'Prefix for sales invoices'],
    ['po_prefix', 'PO-', 'Prefix for purchase orders'],
    ['receipt_footer', 'Thank you for choosing Mashalitic Auto Spares! Genuine parts guaranteed.'],
    ['mpesa_paybill', '247247', 'M-Pesa Business Short Code / Paybill / Till'],
    ['mpesa_account', 'MASHALITIC', 'Default M-Pesa Account Reference'],
    ['low_stock_threshold', '5', 'Default reorder warning threshold']
  ];

  for (const [key, val, desc] of defaultSettings) {
    try {
      await db.query(
        `INSERT OR REPLACE INTO shop_settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
        [key, val, desc]
      );
    } catch (e) {
      // MySQL syntax fallback
      await db.query(
        `INSERT INTO shop_settings (setting_key, setting_value, description) VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description)`,
        [key, val, desc]
      );
    }
  }

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);
  const storeHash = await bcrypt.hash('store123', 10);

  const users = [
    ['Brian Admin', 'admin@mashalitic.co.ke', '+254711000111', passwordHash, 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
    ['Sarah Mwangi', 'manager@mashalitic.co.ke', '+254711000222', passwordHash, 'manager', 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'],
    ['Brian Cashier', 'cashier@mashalitic.co.ke', '+254711000333', cashierHash, 'cashier', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'],
    ['David Omondi', 'store@mashalitic.co.ke', '+254711000444', storeHash, 'storekeeper', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150']
  ];

  for (const u of users) {
    const existing = await db.query(`SELECT id FROM users WHERE email = ?`, [u[1]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO users (name, email, phone, password_hash, role, status, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        u
      );
    }
  }

  // 3. Seed Categories
  const categories = [
    ['Braking System', 'braking-system', 'Discs, pads, calipers, brake fluid and accessories', 'Disc'],
    ['Filtration & Engine', 'filtration-engine', 'Oil, air, fuel, and cabin air filters', 'Filter'],
    ['Lubricants & Fluids', 'lubricants-fluids', 'Synthetic motor oils, transmission oils, coolant', 'Droplet'],
    ['Ignition & Electrical', 'ignition-electrical', 'Spark plugs, alternators, starters, coils', 'Zap'],
    ['Batteries & Power', 'batteries-power', 'Heavy-duty maintenance-free automotive batteries', 'BatteryCharging'],
    ['Suspension & Steering', 'suspension-steering', 'Shock absorbers, ball joints, control arms', 'Activity'],
    ['Wipers & Visibility', 'wipers-visibility', 'Silicone and graphite wiper blades and lamps', 'Eye'],
    ['Transmission & Drivetrain', 'transmission-drivetrain', 'Clutch kits, CV joints, wheel bearings', 'Cog']
  ];

  for (const c of categories) {
    const existing = await db.query(`SELECT id FROM categories WHERE slug = ?`, [c[1]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)`,
        c
      );
    }
  }

  // 4. Seed Brands
  const brands = [
    ['Toyota Genuine Parts', 'Japan', 'https://logo.clearbit.com/toyota.com'],
    ['Bosch Automotive', 'Germany', 'https://logo.clearbit.com/bosch.com'],
    ['Denso Corporation', 'Japan', 'https://logo.clearbit.com/denso.com'],
    ['KYB Shocks', 'Japan', 'https://logo.clearbit.com/kyb.com'],
    ['Valvoline', 'USA', 'https://logo.clearbit.com/valvoline.com'],
    ['Chloride Exide', 'Kenya', 'https://logo.clearbit.com/chlorideexide.com'],
    ['NGK Spark Plugs', 'Japan', 'https://logo.clearbit.com/ngk.com'],
    ['Castrol Lubricants', 'UK', 'https://logo.clearbit.com/castrol.com'],
    ['Gates Automotive', 'USA', 'https://logo.clearbit.com/gates.com']
  ];

  for (const b of brands) {
    const existing = await db.query(`SELECT id FROM brands WHERE name = ?`, [b[0]]);
    if (existing.rows.length === 0) {
      await db.query(`INSERT INTO brands (name, origin, logo_url) VALUES (?, ?, ?)`, b);
    }
  }

  // 5. Seed Suppliers
  const suppliers = [
    ['AutoXpress Kenya', 'AutoXpress Kenya Ltd', 'Kevin Nderitu', '+254 709 888 000', 'kevin@autoxpress.co.ke', 'Commercial Street, Industrial Area, Nairobi', 'Net 30', 45000.00],
    ['Denso East Africa', 'Denso Distribution Ltd', 'Amina Yusuf', '+254 711 223 344', 'sales@denso-ea.com', 'Mombasa Road Gateway Park, Nairobi', 'Net 15', 0.00],
    ['Chloride Exide Ltd', 'Chloride Exide Kenya', 'Patrick Ouma', '+254 722 203 615', 'houma@chlorideexide.com', 'Enterprise Road, Industrial Area, Nairobi', 'Net 30', 82000.00],
    ['Impala Wholesalers', 'Impala Auto Spares Ltd', 'George Kariuki', '+254 721 556 677', 'info@impalaauto.co.ke', 'Kirinyaga Road, Nairobi', 'Cash on Delivery', 0.00]
  ];

  for (const s of suppliers) {
    const existing = await db.query(`SELECT id FROM suppliers WHERE name = ?`, [s[0]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO suppliers (name, company_name, contact_person, phone, email, address, payment_terms, outstanding_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        s
      );
    }
  }

  // 6. Seed Customers
  const customers = [
    ['James Mwangi', '+254 712 345 678', 'james.m@gmail.com', 'KDA 421B', 'Westlands, Nairobi', 30000.00, 4500.00, 68000.00],
    ['Grace Wanjiku', '+254 722 890 123', 'grace.w@yahoo.com', 'KCS 819A', 'South B, Nairobi', 20000.00, 0.00, 42500.00],
    ['Peter Otieno', '+254 733 456 789', 'otieno.peter@outlook.com', 'KDG 633E', 'Ngong Road, Nairobi', 15000.00, 0.00, 24800.00],
    ['Kelvin Kiprop', '+254 701 998 877', 'kelvin.k@gmail.com', 'KCK 104Z', 'Eldoret / Nairobi', 50000.00, 12000.00, 115000.00],
    ['Mary Achieng', '+254 720 112 233', 'achieng.m@gmail.com', 'KBY 774H', 'Kasarani, Nairobi', 10000.00, 0.00, 18500.00],
    ['Apex Fleet Solutions Ltd', '+254 799 123 456', 'procurement@apexfleet.co.ke', 'FLEET-MULTIPLE', 'Mombasa Road, Nairobi', 250000.00, 78000.00, 540000.00]
  ];

  for (const c of customers) {
    const existing = await db.query(`SELECT id FROM customers WHERE phone = ?`, [c[1]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO customers (name, phone, email, vehicle_reg_no, address, credit_limit, outstanding_balance, total_purchases) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }
  }

  // 7. Seed Vehicles (For compatibility matrix)
  const vehicles = [
    ['Toyota', 'Vitz', 2005, 2015, '1NZ-FE / 2SZ-FE', '1.3L / 1.5L', 'Petrol'],
    ['Toyota', 'Premio', 2007, 2016, '2ZR-FAE / 1NZ-FE', '1.5L / 1.8L / 2.0L', 'Petrol'],
    ['Toyota', 'Fielder', 2006, 2018, '1NZ-FE / 2ZR-FAE', '1.5L / 1.8L', 'Petrol'],
    ['Nissan', 'Note', 2012, 2020, 'HR12DE / HR12DDR', '1.2L Supercharged', 'Petrol'],
    ['Toyota', 'Probox / Succeed', 2002, 2022, '1NZ-FE / 2NZ-FE', '1.3L / 1.5L', 'Petrol'],
    ['Subaru', 'Forester', 2008, 2018, 'EJ20 / FB20 / FA20 Turbo', '2.0L / 2.5L Boxster', 'Petrol'],
    ['Mazda', 'Demio', 2007, 2015, 'ZJ-VE / ZY-VE', '1.3L / 1.5L SkyActiv', 'Petrol'],
    ['Toyota', 'Land Cruiser Prado', 2009, 2021, '1KD-FTV / 1GD-FTV', '3.0L / 2.8L Turbo', 'Diesel'],
    ['Toyota', 'Hilux Revo / Vigo', 2015, 2023, '2GD-FTV / 1GD-FTV', '2.4L / 2.8L Turbo', 'Diesel'],
    ['Mitsubishi', 'Outlander', 2012, 2019, '4J11 / 4J12 / 4B12', '2.0L / 2.4L MIVEC', 'Petrol']
  ];

  for (const v of vehicles) {
    const existing = await db.query(
      `SELECT id FROM vehicles WHERE make = ? AND model = ? AND year_from = ? AND year_to = ?`,
      [v[0], v[1], v[2], v[3]]
    );
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO vehicles (make, model, year_from, year_to, engine_type, engine_capacity, fuel_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        v
      );
    }
  }

  // 8. Seed Products (Matching design items and realistic auto spares)
  const products = [
    {
      code: 'PRD-BP-001',
      name: 'Ceramic Front Brake Pads (D2158)',
      sku: 'BP-D2158-TY',
      barcode: '6001234567891',
      category_id: 1, // Braking
      brand_id: 2, // Bosch
      supplier_id: 1,
      description: 'High performance low-dust ceramic front brake pads. Superior stopping power with anti-noise shims.',
      shelf_location: 'Shelf A-01',
      purchase_price: 3800.00,
      selling_price: 6000.00,
      quantity: 45,
      reorder_level: 10,
      image_url: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=400'
    },
    {
      code: 'PRD-OF-002',
      name: 'Genuine Spin-On Oil Filter 90915-10003',
      sku: 'OF-90915-10003',
      barcode: '6001234567892',
      category_id: 2, // Filtration
      brand_id: 1, // Toyota Genuine
      supplier_id: 2,
      description: 'Original OEM Toyota oil filter. Multi-density synthetic fiber filter paper with silicone anti-drainback valve.',
      shelf_location: 'Shelf B-04',
      purchase_price: 750.00,
      selling_price: 1200.00,
      quantity: 68,
      reorder_level: 15,
      image_url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=400'
    },
    {
      code: 'PRD-EO-003',
      name: 'Valvoline Advanced Full Synthetic 5W-30 (5 Litres)',
      sku: 'VAL-SYN-5W30-5L',
      barcode: '6001234567893',
      category_id: 3, // Lubricants
      brand_id: 5, // Valvoline
      supplier_id: 1,
      description: 'Full synthetic motor oil engineered with anti-wear additives for maximum high temperature engine protection.',
      shelf_location: 'Rack L-02',
      purchase_price: 2400.00,
      selling_price: 3500.00,
      quantity: 32,
      reorder_level: 10,
      image_url: 'https://images.unsplash.com/photo-1635784063748-0d19ca7bdf40?w=400'
    },
    {
      code: 'PRD-SP-004',
      name: 'Denso Iridium Tough Spark Plug SC20HR11',
      sku: 'DEN-SC20HR11',
      barcode: '6001234567894',
      category_id: 4, // Ignition
      brand_id: 3, // Denso
      supplier_id: 2,
      description: '0.4mm Iridium center electrode with platinum ground electrode for 100,000km service interval.',
      shelf_location: 'Drawer C-12',
      purchase_price: 480.00,
      selling_price: 800.00,
      quantity: 110,
      reorder_level: 20,
      image_url: 'https://images.unsplash.com/photo-1598449356475-b9f71db7d847?w=400'
    },
    {
      code: 'PRD-AF-005',
      name: 'High Flow Air Filter 17801-21050',
      sku: 'AF-17801-21050',
      barcode: '6001234567895',
      category_id: 2, // Filtration
      brand_id: 1, // Toyota Genuine
      supplier_id: 1,
      description: 'Engine intake air filter preventing 99.8% of dirt and abrasive particles from entering combustion chamber.',
      shelf_location: 'Shelf B-08',
      purchase_price: 600.00,
      selling_price: 1000.00,
      quantity: 55,
      reorder_level: 15,
      image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400'
    },
    {
      code: 'PRD-BT-006',
      name: 'Chloride Exide Maxima N70MF 75Ah Battery',
      sku: 'BAT-CE-N70MF',
      barcode: '6001234567896',
      category_id: 5, // Battery
      brand_id: 6, // Chloride Exide
      supplier_id: 3,
      description: 'Maintenance-free calcium-alloy car battery with high cold-cranking amps (CCA 620) and 18-month warranty.',
      shelf_location: 'Heavy Bay 01',
      purchase_price: 8800.00,
      selling_price: 12000.00,
      quantity: 5, // LOW STOCK TRIGGER FOR DASHBOARD!
      reorder_level: 8,
      image_url: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=400'
    },
    {
      code: 'PRD-SA-007',
      name: 'KYB Excel-G Gas Shock Absorber (Front Pair)',
      sku: 'KYB-334399',
      barcode: '6001234567897',
      category_id: 6, // Suspension
      brand_id: 4, // KYB
      supplier_id: 1,
      description: 'Twin-tube nitrogen gas pressurized shock absorbers restoring original vehicle handling and comfort.',
      shelf_location: 'Rack S-05',
      purchase_price: 5200.00,
      selling_price: 8000.00,
      quantity: 18,
      reorder_level: 6,
      image_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400'
    },
    {
      code: 'PRD-WB-008',
      name: 'Bosch Aerotwin Beam Wiper Blades Pair (24" / 16")',
      sku: 'BOS-AERO-2416',
      barcode: '6001234567898',
      category_id: 7, // Wipers
      brand_id: 2, // Bosch
      supplier_id: 1,
      description: 'Aerodynamic bracketless wiper blades with Power Protection Plus coating for streak-free all-weather clearing.',
      shelf_location: 'Hook W-02',
      purchase_price: 750.00,
      selling_price: 1200.00,
      quantity: 40,
      reorder_level: 10,
      image_url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=400'
    },
    {
      code: 'PRD-FF-009',
      name: 'In-Tank Fuel Filter Assembly 23300-21010',
      sku: 'FF-23300-21010',
      barcode: '6001234567899',
      category_id: 2,
      brand_id: 1,
      supplier_id: 1,
      description: 'Precision fuel filtration unit safeguarding electronic fuel injection injectors.',
      shelf_location: 'Shelf B-11',
      purchase_price: 1500.00,
      selling_price: 2500.00,
      quantity: 22,
      reorder_level: 8,
      image_url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=400'
    },
    {
      code: 'PRD-CL-010',
      name: 'Castrol Radicool Long Life Coolant (4 Litres Pink)',
      sku: 'CAS-COOL-PINK-4L',
      barcode: '6001234567800',
      category_id: 3,
      brand_id: 8,
      supplier_id: 1,
      description: 'Organic acid technology (OAT) long-life anti-freeze engine coolant with corrosion inhibitors.',
      shelf_location: 'Rack L-03',
      purchase_price: 1850.00,
      selling_price: 2800.00,
      quantity: 30,
      reorder_level: 8,
      image_url: 'https://images.unsplash.com/photo-1635784063748-0d19ca7bdf40?w=400'
    }
  ];

  for (const p of products) {
    const existing = await db.query(`SELECT id FROM products WHERE sku = ?`, [p.sku]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO products (product_code, name, sku, barcode, category_id, brand_id, supplier_id, description, shelf_location, purchase_price, selling_price, quantity, reorder_level, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.code, p.name, p.sku, p.barcode, p.category_id, p.brand_id, p.supplier_id, p.description, p.shelf_location, p.purchase_price, p.selling_price, p.quantity, p.reorder_level, p.image_url]
      );
    }
  }

  // 9. Seed Product Compatibility (Many-to-many)
  // Brake pads (Product 1) fits Vitz (1), Premio (2), Fielder (3), Probox (5)
  // Oil filter (Product 2) fits Vitz (1), Premio (2), Fielder (3), Probox (5)
  // Spark plugs (Product 4) fits Premio (2), Fielder (3), Note (4)
  // Air filter (Product 5) fits Premio (2), Fielder (3), Probox (5)
  const compatibilities = [
    [1, 1, 'Front axle disc brake setup (255mm rotors)'],
    [1, 2, 'Compatible with all 2007-2016 1.5L/1.8L chassis'],
    [1, 3, 'Compatible with NZE141 / ZRE142 models'],
    [1, 5, 'NCP50 / NCP51 front brake calipers'],
    [2, 1, '1NZ-FE & 2SZ-FE engines'],
    [2, 2, '2ZR-FAE & 1NZ-FE engines'],
    [2, 3, '1NZ-FE engines'],
    [2, 5, '1NZ-FE 1.5L workhorse engine'],
    [3, 1, 'Recommended 5W-30 viscosity grade'],
    [3, 2, 'Recommended for variable valve timing engines'],
    [3, 3, 'Full synthetic engine protection'],
    [4, 2, 'Factory specification 100,000km interval'],
    [4, 3, '1NZ-FE VVTi twin cam specification'],
    [4, 4, 'HR12DE 3-cylinder engine (Set of 3)'],
    [5, 2, 'Direct drop-in replacement air box filter'],
    [5, 3, 'Direct drop-in replacement air box filter'],
    [5, 5, 'Direct drop-in replacement air box filter'],
    [6, 8, 'Fits heavy diesel engine bay tray'],
    [6, 9, 'Fits double-cab diesel Hilux starter load'],
    [7, 2, 'Front left and right strut towers'],
    [7, 3, 'Front suspension rebuild OEM replacement']
  ];

  for (const [pid, vid, notes] of compatibilities) {
    try {
      await db.query(
        `INSERT OR IGNORE INTO product_vehicle_compatibility (product_id, vehicle_id, notes) VALUES (?, ?, ?)`,
        [pid, vid, notes]
      );
    } catch (e) {
      // MySQL IGNORE
      await db.query(
        `INSERT IGNORE INTO product_vehicle_compatibility (product_id, vehicle_id, notes) VALUES (?, ?, ?)`,
        [pid, vid, notes]
      );
    }
  }

  // 10. Seed Sales & Sale Items (Matching the Recent Sales on the dashboard)
  const sampleSales = [
    {
      invoice: 'INV-1045',
      customer_id: 1,
      customer_name: 'James Mwangi',
      cashier_id: 3,
      date: '2026-11-14 13:20:00',
      subtotal: 7327.59,
      discount: 0,
      vat_rate: 16.00,
      vat: 1172.41,
      total: 8500.00,
      paid: 8500.00,
      method: 'mpesa',
      items: [
        { product_id: 1, name: 'Ceramic Front Brake Pads (D2158)', sku: 'BP-D2158-TY', qty: 1, price: 6000.00, cost: 3800.00, subtotal: 6000.00, total: 6000.00 },
        { product_id: 9, name: 'In-Tank Fuel Filter Assembly', sku: 'FF-23300-21010', qty: 1, price: 2500.00, cost: 1500.00, subtotal: 2500.00, total: 2500.00 }
      ]
    },
    {
      invoice: 'INV-1044',
      customer_id: 2,
      customer_name: 'Grace Wanjiku',
      cashier_id: 3,
      date: '2026-11-14 12:45:00',
      subtotal: 10344.83,
      discount: 0,
      vat_rate: 16.00,
      vat: 1655.17,
      total: 12000.00,
      paid: 12000.00,
      method: 'cash',
      items: [
        { product_id: 6, name: 'Chloride Exide Maxima N70MF 75Ah Battery', sku: 'BAT-CE-N70MF', qty: 1, price: 12000.00, cost: 8800.00, subtotal: 12000.00, total: 12000.00 }
      ]
    },
    {
      invoice: 'INV-1043',
      customer_id: 3,
      customer_name: 'Peter Otieno',
      cashier_id: 3,
      date: '2026-11-14 11:30:00',
      subtotal: 5862.07,
      discount: 0,
      vat_rate: 16.00,
      vat: 937.93,
      total: 6800.00,
      paid: 6800.00,
      method: 'card',
      items: [
        { product_id: 3, name: 'Valvoline Advanced Full Synthetic 5W-30', sku: 'VAL-SYN-5W30-5L', qty: 1, price: 3500.00, cost: 2400.00, subtotal: 3500.00, total: 3500.00 },
        { product_id: 2, name: 'Genuine Spin-On Oil Filter 90915-10003', sku: 'OF-90915-10003', qty: 1, price: 1200.00, cost: 750.00, subtotal: 1200.00, total: 1200.00 },
        { product_id: 5, name: 'High Flow Air Filter 17801-21050', sku: 'AF-17801-21050', qty: 1, price: 1000.00, cost: 600.00, subtotal: 1000.00, total: 1000.00 },
        { product_id: 8, name: 'Bosch Aerotwin Wiper Blades Pair', sku: 'BOS-AERO-2416', qty: 1, price: 1100.00, cost: 750.00, subtotal: 1100.00, total: 1100.00 }
      ]
    },
    {
      invoice: 'INV-1042',
      customer_id: 4,
      customer_name: 'Kelvin Kiprop',
      cashier_id: 3,
      date: '2026-11-14 10:15:00',
      subtotal: 13362.07,
      discount: 0,
      vat_rate: 16.00,
      vat: 2137.93,
      total: 15500.00,
      paid: 15500.00,
      method: 'mpesa',
      items: [
        { product_id: 7, name: 'KYB Excel-G Gas Shock Absorber Pair', sku: 'KYB-334399', qty: 1, price: 8000.00, cost: 5200.00, subtotal: 8000.00, total: 8000.00 },
        { product_id: 1, name: 'Ceramic Front Brake Pads (D2158)', sku: 'BP-D2158-TY', qty: 1, price: 6000.00, cost: 3800.00, subtotal: 6000.00, total: 6000.00 },
        { product_id: 4, name: 'Denso Iridium Spark Plug SC20HR11', sku: 'DEN-SC20HR11', qty: 2, price: 750.00, cost: 480.00, subtotal: 1500.00, total: 1500.00 }
      ]
    },
    {
      invoice: 'INV-1041',
      customer_id: null,
      customer_name: 'Walk-in Customer',
      cashier_id: 3,
      date: '2026-11-13 16:50:00',
      subtotal: 4051.72,
      discount: 0,
      vat_rate: 16.00,
      vat: 648.28,
      total: 4700.00,
      paid: 4700.00,
      method: 'cash',
      items: [
        { product_id: 3, name: 'Valvoline Advanced Full Synthetic 5W-30', sku: 'VAL-SYN-5W30-5L', qty: 1, price: 3500.00, cost: 2400.00, subtotal: 3500.00, total: 3500.00 },
        { product_id: 8, name: 'Bosch Aerotwin Wiper Blades Pair', sku: 'BOS-AERO-2416', qty: 1, price: 1200.00, cost: 750.00, subtotal: 1200.00, total: 1200.00 }
      ]
    }
  ];

  for (const s of sampleSales) {
    const existing = await db.query(`SELECT id FROM sales WHERE invoice_number = ?`, [s.invoice]);
    if (existing.rows.length === 0) {
      const saleResult = await db.query(
        `INSERT INTO sales (invoice_number, customer_id, customer_name, cashier_id, sale_date, subtotal, discount_amount, vat_rate, vat_amount, total_amount, paid_amount, payment_method, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.invoice, s.customer_id, s.customer_name, s.cashier_id, s.date, s.subtotal, s.discount, s.vat_rate, s.vat, s.total, s.paid, s.method, 'paid', 'completed']
      );

      const saleId = saleResult.insertId;

      for (const it of s.items) {
        await db.query(
          `INSERT INTO sale_items (sale_id, product_id, product_name, sku, quantity, unit_price, unit_cost, discount, tax_amount, subtotal, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
          [saleId, it.product_id, it.name, it.sku, it.qty, it.price, it.cost, it.subtotal, it.total]
        );

        // Record stock movement
        await db.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, reason, user_id, created_at)
           VALUES (?, 'sale', ?, 50, 50 - ?, ?, 'sale', ?, 'POS checkout', ?, ?)`,
          [it.product_id, it.qty, it.qty, it.cost, s.invoice, s.cashier_id, s.date]
        );
      }

      // Record payment
      await db.query(
        `INSERT INTO payments (sale_id, customer_id, amount, payment_method, reference_code, mpesa_phone, mpesa_receipt, payment_date, received_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, s.customer_id, s.total, s.method, `PAY-${s.invoice}`, s.method === 'mpesa' ? '0712345678' : null, s.method === 'mpesa' ? 'SHF78291KL' : null, s.date, s.cashier_id, 'Full payment settled']
      );
    }
  }

  // 11. Seed Expenses
  const expenses = [
    ['EXP-2026-001', 'Rent', 'Commercial Shop Premises Monthly Rent - Kirinyaga Rd Plaza', 45000.00, '2026-11-01', 'bank', 1],
    ['EXP-2026-002', 'Electricity', 'Kenya Power (KPLC) Prepaid Token Power Bill', 6500.00, '2026-11-03', 'mpesa', 1],
    ['EXP-2026-003', 'Internet', 'Safaricom Business Fibre 50Mbps Monthly Sub', 5000.00, '2026-11-05', 'mpesa', 1],
    ['EXP-2026-004', 'Transport', 'Logistics and courier transport for imported spare parts consignments', 8400.00, '2026-11-08', 'cash', 1],
    ['EXP-2026-005', 'Maintenance', 'Showroom shelving adjustment & barcode scanner bracket installation', 3200.00, '2026-11-10', 'cash', 1]
  ];

  for (const e of expenses) {
    const existing = await db.query(`SELECT id FROM expenses WHERE expense_number = ?`, [e[0]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO expenses (expense_number, category, title, amount, expense_date, payment_method, approved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        e
      );
    }
  }

  // 12. Seed Purchases (PO)
  const purchases = [
    ['PO-2026-001', 1, '2026-11-02', '2026-11-05', '2026-11-05', 'received', 114000.00, 0.00, 114000.00, 114000.00, 'paid', 'Initial stock replenishment of brake pads and fluids', 1],
    ['PO-2026-002', 3, '2026-11-10', '2026-11-16', null, 'ordered', 88000.00, 0.00, 88000.00, 0.00, 'unpaid', 'Emergency replenishment of Chloride Exide N70MF car batteries', 1]
  ];

  for (const p of purchases) {
    const existing = await db.query(`SELECT id FROM purchases WHERE po_number = ?`, [p[0]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO purchases (po_number, supplier_id, order_date, expected_date, received_date, status, subtotal, tax_amount, total_cost, paid_amount, payment_status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }
  }

  // 13. Seed Notifications
  const notifications = [
    ['Low Stock Warning', 'Chloride Exide Maxima N70MF 75Ah Battery is below reorder level (Only 5 left in stock!)', 'low_stock', 'PRD-BT-006', 0],
    ['M-Pesa Payment Received', 'Received KSh 8,500 via M-Pesa for Invoice INV-1045', 'payment_received', 'INV-1045', 1],
    ['Purchase Order Dispatched', 'PO-2026-002 sent to Chloride Exide Kenya awaiting delivery', 'order_pending', 'PO-2026-002', 0]
  ];

  for (const n of notifications) {
    const existing = await db.query(`SELECT id FROM notifications WHERE title = ?`, [n[0]]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO notifications (title, message, type, reference_id, is_read) VALUES (?, ?, ?, ?, ?)`,
        n
      );
    }
  }

  console.log('✅ Seeding completed successfully! All data structures ready.');
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
