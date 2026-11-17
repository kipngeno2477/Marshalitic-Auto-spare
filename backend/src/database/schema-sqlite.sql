-- ============================================================================
-- MASHALITIC AUTO SPARES - DATABASE SCHEMA (SQLite / Embedded Engine)
-- Tagline: Drive with Confidence
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS & RBAC
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'manager', 'cashier', 'storekeeper')) NOT NULL DEFAULT 'cashier',
  status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. BRANDS
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  origin TEXT,
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  outstanding_balance REAL DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_supplier_phone ON suppliers(phone);

-- 5. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_reg_no TEXT,
  address TEXT,
  credit_limit REAL DEFAULT 0.00,
  outstanding_balance REAL DEFAULT 0.00,
  total_purchases REAL DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_cust_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_cust_vehicle ON customers(vehicle_reg_no);

-- 6. VEHICLES (Auto Spares Vehicle Master)
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  engine_type TEXT,
  engine_capacity TEXT,
  fuel_type TEXT CHECK(fuel_type IN ('Petrol', 'Diesel', 'Hybrid', 'Electric')) DEFAULT 'Petrol',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_lookup ON vehicles(make, model, year_from, year_to);

-- 7. PRODUCTS (Inventory Items)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  description TEXT,
  shelf_location TEXT,
  purchase_price REAL NOT NULL DEFAULT 0.00,
  selling_price REAL NOT NULL DEFAULT 0.00,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  status TEXT CHECK(status IN ('active', 'inactive', 'discontinued')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_qty ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_products_reorder ON products(reorder_level);

-- 8. PRODUCT VEHICLE COMPATIBILITY (Many-to-Many)
CREATE TABLE IF NOT EXISTS product_vehicle_compatibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_pvc_vehicle ON product_vehicle_compatibility(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_pvc_product ON product_vehicle_compatibility(product_id);

-- 9. SALES (Invoices)
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT DEFAULT 'Walk-in Customer',
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal REAL NOT NULL DEFAULT 0.00,
  discount_amount REAL NOT NULL DEFAULT 0.00,
  vat_rate REAL NOT NULL DEFAULT 16.00,
  vat_amount REAL NOT NULL DEFAULT 0.00,
  total_amount REAL NOT NULL DEFAULT 0.00,
  paid_amount REAL NOT NULL DEFAULT 0.00,
  payment_method TEXT CHECK(payment_method IN ('mpesa', 'cash', 'card', 'bank', 'split', 'credit')) NOT NULL DEFAULT 'cash',
  payment_status TEXT CHECK(payment_status IN ('paid', 'partial', 'unpaid', 'refunded')) NOT NULL DEFAULT 'paid',
  status TEXT CHECK(status IN ('completed', 'cancelled', 'returned')) NOT NULL DEFAULT 'completed',
  notes TEXT,
  sync_status TEXT CHECK(sync_status IN ('synced', 'pending')) DEFAULT 'synced',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_method ON sales(payment_method);

-- 10. SALE ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  unit_cost REAL NOT NULL,
  discount REAL DEFAULT 0.00,
  tax_amount REAL DEFAULT 0.00,
  subtotal REAL NOT NULL,
  total REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- 11. PAYMENTS (Supports Split & M-Pesa tracking)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(id),
  customer_id INTEGER REFERENCES customers(id),
  amount REAL NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('mpesa', 'cash', 'card', 'bank')) NOT NULL,
  reference_code TEXT,
  mpesa_phone TEXT,
  mpesa_receipt TEXT,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by INTEGER NOT NULL REFERENCES users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference_code);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 12. PURCHASES (Stock Inflow from Suppliers)
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  order_date DATE NOT NULL,
  expected_date DATE,
  received_date DATE,
  status TEXT CHECK(status IN ('ordered', 'received', 'partial', 'cancelled')) NOT NULL DEFAULT 'ordered',
  subtotal REAL NOT NULL DEFAULT 0.00,
  tax_amount REAL NOT NULL DEFAULT 0.00,
  total_cost REAL NOT NULL DEFAULT 0.00,
  paid_amount REAL NOT NULL DEFAULT 0.00,
  payment_status TEXT CHECK(payment_status IN ('unpaid', 'partial', 'paid')) NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchases_po ON purchases(po_number);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- 13. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  ordered_qty INTEGER NOT NULL,
  received_qty INTEGER NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL,
  total_cost REAL NOT NULL
);

-- 14. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_number TEXT NOT NULL UNIQUE,
  category TEXT CHECK(category IN ('Rent', 'Electricity', 'Salaries', 'Transport', 'Internet', 'Maintenance', 'Water', 'Marketing', 'Other')) NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date DATE NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('cash', 'mpesa', 'bank', 'card')) NOT NULL DEFAULT 'cash',
  receipt_url TEXT,
  notes TEXT,
  approved_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_category ON expenses(category);

-- 15. STOCK MOVEMENTS (Complete Inventory Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT CHECK(movement_type IN ('sale', 'purchase', 'return_in', 'return_out', 'adjustment_add', 'adjustment_deduct', 'damaged')) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0.00,
  reference_type TEXT CHECK(reference_type IN ('sale', 'purchase', 'adjustment', 'return', 'initial')) NOT NULL,
  reference_id TEXT,
  reason TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_date ON stock_movements(created_at);

-- 16. RETURNS
CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_number TEXT NOT NULL UNIQUE,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  customer_id INTEGER REFERENCES customers(id),
  return_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_refund_amount REAL NOT NULL DEFAULT 0.00,
  refund_method TEXT CHECK(refund_method IN ('cash', 'mpesa', 'credit_note')) NOT NULL DEFAULT 'cash',
  reason TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'approved',
  approved_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_return_num ON returns(return_number);

-- 17. RETURN ITEMS
CREATE TABLE IF NOT EXISTS return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  condition TEXT CHECK(condition IN ('restockable', 'damaged')) NOT NULL DEFAULT 'restockable',
  restocked INTEGER DEFAULT 1
);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('low_stock', 'out_of_stock', 'payment_received', 'system', 'order_pending')) NOT NULL,
  reference_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(is_read, created_at);

-- 19. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- 20. SHOP SETTINGS
CREATE TABLE IF NOT EXISTS shop_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
