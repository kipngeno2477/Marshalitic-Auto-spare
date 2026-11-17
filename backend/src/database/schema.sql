-- ============================================================================
-- MASHALITIC AUTO SPARES - DATABASE SCHEMA (MySQL 8.0+)
-- Tagline: Drive with Confidence
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `mashalitic_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mashalitic_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS & RBAC
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `shop_settings`;
DROP TABLE IF EXISTS `return_items`;
DROP TABLE IF EXISTS `returns`;
DROP TABLE IF EXISTS `stock_movements`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `purchase_items`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `sale_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `product_vehicle_compatibility`;
DROP TABLE IF EXISTS `vehicles`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `brands`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'manager', 'cashier', 'storekeeper') NOT NULL DEFAULT 'cashier',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `avatar_url` VARCHAR(255) NULL,
  `last_login` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. CATEGORIES
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `icon` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. BRANDS
CREATE TABLE `brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `origin` VARCHAR(100) NULL,
  `logo_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. SUPPLIERS
CREATE TABLE `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(150) NULL,
  `contact_person` VARCHAR(100) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `payment_terms` VARCHAR(100) DEFAULT 'Net 30',
  `outstanding_balance` DECIMAL(12, 2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_supplier_name` (`name`),
  INDEX `idx_supplier_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. CUSTOMERS
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `vehicle_reg_no` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `credit_limit` DECIMAL(12, 2) DEFAULT 0.00,
  `outstanding_balance` DECIMAL(12, 2) DEFAULT 0.00,
  `total_purchases` DECIMAL(14, 2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cust_phone` (`phone`),
  INDEX `idx_cust_name` (`name`),
  INDEX `idx_cust_vehicle` (`vehicle_reg_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. VEHICLES (Auto Spares Vehicle Master)
CREATE TABLE `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `make` VARCHAR(100) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `year_from` INT NOT NULL,
  `year_to` INT NOT NULL,
  `engine_type` VARCHAR(100) NULL,
  `engine_capacity` VARCHAR(50) NULL,
  `fuel_type` ENUM('Petrol', 'Diesel', 'Hybrid', 'Electric') DEFAULT 'Petrol',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vehicles_lookup` (`make`, `model`, `year_from`, `year_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. PRODUCTS (Inventory Items)
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `barcode` VARCHAR(100) NOT NULL UNIQUE,
  `category_id` INT NOT NULL,
  `brand_id` INT NOT NULL,
  `supplier_id` INT NULL,
  `description` TEXT NULL,
  `shelf_location` VARCHAR(50) NULL,
  `purchase_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 0,
  `reorder_level` INT NOT NULL DEFAULT 5,
  `image_url` VARCHAR(500) NULL,
  `status` ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
  INDEX `idx_products_barcode` (`barcode`),
  INDEX `idx_products_sku` (`sku`),
  INDEX `idx_products_name` (`name`),
  INDEX `idx_products_qty` (`quantity`),
  INDEX `idx_products_reorder` (`reorder_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. PRODUCT VEHICLE COMPATIBILITY (Many-to-Many)
CREATE TABLE `product_vehicle_compatibility` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `vehicle_id` INT NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_prod_vehicle` (`product_id`, `vehicle_id`),
  INDEX `idx_pvc_vehicle` (`vehicle_id`),
  INDEX `idx_pvc_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. SALES (Invoices)
CREATE TABLE `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NULL,
  `customer_name` VARCHAR(150) DEFAULT 'Walk-in Customer',
  `cashier_id` INT NOT NULL,
  `sale_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `vat_rate` DECIMAL(5, 2) NOT NULL DEFAULT 16.00,
  `vat_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('mpesa', 'cash', 'card', 'bank', 'split', 'credit') NOT NULL DEFAULT 'cash',
  `payment_status` ENUM('paid', 'partial', 'unpaid', 'refunded') NOT NULL DEFAULT 'paid',
  `status` ENUM('completed', 'cancelled', 'returned') NOT NULL DEFAULT 'completed',
  `notes` TEXT NULL,
  `sync_status` ENUM('synced', 'pending') DEFAULT 'synced',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_sales_invoice` (`invoice_number`),
  INDEX `idx_sales_date` (`sale_date`),
  INDEX `idx_sales_payment_status` (`payment_status`),
  INDEX `idx_sales_method` (`payment_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. SALE ITEMS
CREATE TABLE `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `sku` VARCHAR(100) NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `unit_cost` DECIMAL(12, 2) NOT NULL,
  `discount` DECIMAL(12, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  `total` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  INDEX `idx_sale_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. PAYMENTS (Supports Split & M-Pesa tracking)
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NULL,
  `customer_id` INT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_method` ENUM('mpesa', 'cash', 'card', 'bank') NOT NULL,
  `reference_code` VARCHAR(100) NULL,
  `mpesa_phone` VARCHAR(30) NULL,
  `mpesa_receipt` VARCHAR(100) NULL,
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `received_by` INT NOT NULL,
  `notes` TEXT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_payments_ref` (`reference_code`),
  INDEX `idx_payments_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. PURCHASES (Stock Inflow from Suppliers)
CREATE TABLE `purchases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_number` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT NOT NULL,
  `order_date` DATE NOT NULL,
  `expected_date` DATE NULL,
  `received_date` DATE NULL,
  `status` ENUM('ordered', 'received', 'partial', 'cancelled') NOT NULL DEFAULT 'ordered',
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
  `notes` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_purchases_po` (`po_number`),
  INDEX `idx_purchases_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. PURCHASE ITEMS
CREATE TABLE `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `ordered_qty` INT NOT NULL,
  `received_qty` INT NOT NULL DEFAULT 0,
  `unit_cost` DECIMAL(12, 2) NOT NULL,
  `total_cost` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. EXPENSES
CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `expense_number` VARCHAR(50) NOT NULL UNIQUE,
  `category` ENUM('Rent', 'Electricity', 'Salaries', 'Transport', 'Internet', 'Maintenance', 'Water', 'Marketing', 'Other') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `payment_method` ENUM('cash', 'mpesa', 'bank', 'card') NOT NULL DEFAULT 'cash',
  `receipt_url` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `approved_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_expense_date` (`expense_date`),
  INDEX `idx_expense_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. STOCK MOVEMENTS (Complete Inventory Audit Trail)
CREATE TABLE `stock_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `movement_type` ENUM('sale', 'purchase', 'return_in', 'return_out', 'adjustment_add', 'adjustment_deduct', 'damaged') NOT NULL,
  `quantity` INT NOT NULL,
  `previous_quantity` INT NOT NULL,
  `new_quantity` INT NOT NULL,
  `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `reference_type` ENUM('sale', 'purchase', 'adjustment', 'return', 'initial') NOT NULL,
  `reference_id` VARCHAR(50) NULL,
  `reason` VARCHAR(255) NULL,
  `user_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_stock_product` (`product_id`),
  INDEX `idx_stock_type` (`movement_type`),
  INDEX `idx_stock_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. RETURNS
CREATE TABLE `returns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_number` VARCHAR(50) NOT NULL UNIQUE,
  `sale_id` INT NOT NULL,
  `customer_id` INT NULL,
  `return_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_refund_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `refund_method` ENUM('cash', 'mpesa', 'credit_note') NOT NULL DEFAULT 'cash',
  `reason` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  `approved_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_return_num` (`return_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. RETURN ITEMS
CREATE TABLE `return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `condition` ENUM('restockable', 'damaged') NOT NULL DEFAULT 'restockable',
  `restocked` BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. NOTIFICATIONS
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('low_stock', 'out_of_stock', 'payment_received', 'system', 'order_pending') NOT NULL,
  `reference_id` VARCHAR(50) NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_unread` (`is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. AUDIT LOGS
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. SHOP SETTINGS
CREATE TABLE `shop_settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
