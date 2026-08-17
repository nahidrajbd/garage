-- ====================================================================
-- NextGarage MySQL Complete Database Setup & Initial Seed Data
-- Database: nextpostmedia_garage
-- Charset: utf8mb4, Collation: utf8mb4_unicode_ci, Engine: InnoDB
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------
-- 1. Table: customers
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(191) NULL,
  `address` TEXT NULL,
  `notes` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customers_phone` (`phone`),
  INDEX `idx_customers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Table: vehicles
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `customer_id` VARCHAR(50) NOT NULL,
  `registration_number` VARCHAR(100) NOT NULL,
  `make` VARCHAR(100) NULL,
  `model` VARCHAR(191) NOT NULL,
  `model_year` VARCHAR(20) NULL,
  `color` VARCHAR(50) NULL,
  `mileage` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_vehicles_reg` (`registration_number`),
  INDEX `idx_vehicles_cust` (`customer_id`),
  CONSTRAINT `fk_vehicles_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. Table: services
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `default_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_services_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. Table: job_cards
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `job_cards` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `job_card_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` VARCHAR(50) NULL,
  `vehicle_id` VARCHAR(50) NULL,
  `customer_name` VARCHAR(191) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `vehicle_registration` VARCHAR(100) NOT NULL,
  `vehicle_model` VARCHAR(191) NOT NULL,
  `vehicle_color` VARCHAR(50) NULL,
  `mileage` VARCHAR(50) NULL,
  `date` DATE NOT NULL,
  `time` TIME NULL,
  `assigned_technician` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `status` ENUM('waiting', 'in_progress', 'completed', 'delivered', 'cancelled') NOT NULL DEFAULT 'waiting',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_jobcards_status` (`status`),
  INDEX `idx_jobcards_date` (`date`),
  INDEX `idx_jobcards_cust` (`customer_id`),
  INDEX `idx_jobcards_veh` (`vehicle_id`),
  CONSTRAINT `fk_jobcards_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_jobcards_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. Table: job_card_tasks
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `job_card_tasks` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `job_card_id` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_jc_tasks_card` (`job_card_id`),
  CONSTRAINT `fk_jc_tasks_card` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. Table: quotations
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `quotation_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` VARCHAR(50) NULL,
  `vehicle_id` VARCHAR(50) NULL,
  `customer_name` VARCHAR(191) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `vehicle_registration` VARCHAR(100) NOT NULL,
  `vehicle_model` VARCHAR(191) NOT NULL,
  `vehicle_color` VARCHAR(50) NULL,
  `quotation_date` DATE NOT NULL,
  `valid_until` DATE NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `terms` TEXT NULL,
  `status` ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted') NOT NULL DEFAULT 'draft',
  `converted_invoice_id` VARCHAR(50) NULL,
  `converted_invoice_number` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_quotations_status` (`status`),
  INDEX `idx_quotations_date` (`quotation_date`),
  INDEX `idx_quotations_cust` (`customer_id`),
  INDEX `idx_quotations_veh` (`vehicle_id`),
  CONSTRAINT `fk_quotations_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. Table: quotation_items
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `quotation_id` VARCHAR(50) NOT NULL,
  `item_type` ENUM('service', 'product', 'custom') NOT NULL DEFAULT 'service',
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_qt_items_quotation` (`quotation_id`),
  CONSTRAINT `fk_qt_items_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. Table: invoices
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `quotation_id` VARCHAR(50) NULL,
  `job_card_id` VARCHAR(50) NULL,
  `customer_id` VARCHAR(50) NULL,
  `vehicle_id` VARCHAR(50) NULL,
  `customer_name` VARCHAR(191) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `vehicle_registration` VARCHAR(100) NOT NULL,
  `vehicle_model` VARCHAR(191) NOT NULL,
  `vehicle_color` VARCHAR(50) NULL,
  `date` DATE NOT NULL,
  `time` TIME NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('paid', 'partial', 'due') NOT NULL DEFAULT 'due',
  `payment_method` ENUM('cash', 'bkash', 'bank') NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_invoices_status` (`status`),
  INDEX `idx_invoices_date` (`date`),
  INDEX `idx_invoices_cust` (`customer_id`),
  INDEX `idx_invoices_veh` (`vehicle_id`),
  CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_jobcard` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. Table: invoice_items
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `invoice_id` VARCHAR(50) NOT NULL,
  `item_type` ENUM('service', 'product', 'custom') NOT NULL DEFAULT 'service',
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_inv_items_invoice` (`invoice_id`),
  CONSTRAINT `fk_inv_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. Table: payments
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `invoice_id` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('cash', 'bkash', 'bank') NOT NULL DEFAULT 'cash',
  `payment_date` DATE NOT NULL,
  `payment_time` TIME NULL,
  `reference` VARCHAR(100) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payments_invoice` (`invoice_id`),
  INDEX `idx_payments_date` (`payment_date`),
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 11. Table: expense_categories
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 12. Table: expenses
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `time` TIME NULL,
  `category_id` VARCHAR(50) NULL,
  `category_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `payment_method` ENUM('cash', 'bkash', 'bank') NOT NULL DEFAULT 'cash',
  `amount` DECIMAL(12,2) NOT NULL,
  `recipient` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_expenses_date` (`date`),
  INDEX `idx_expenses_cat` (`category_id`),
  CONSTRAINT `fk_expenses_cat` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 13. Table: loans
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `loans` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `loan_type` ENUM('md_loan', 'bank_loan', 'third_party') NOT NULL DEFAULT 'md_loan',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active', 'settled') NOT NULL DEFAULT 'active',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 14. Table: loan_payments
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `loan_payments` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `loan_id` VARCHAR(50) NOT NULL,
  `payment_type` ENUM('received', 'repayment') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_time` TIME NULL,
  `payment_method` ENUM('cash', 'bkash', 'bank') NOT NULL DEFAULT 'cash',
  `reference` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_loan_payments_loan` (`loan_id`),
  INDEX `idx_loan_payments_date` (`payment_date`),
  CONSTRAINT `fk_loan_payments_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 15. Table: financial_transactions
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `time` TIME NULL,
  `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `payment_method` ENUM('cash', 'bkash', 'bank') NOT NULL DEFAULT 'cash',
  `amount` DECIMAL(12,2) NOT NULL,
  `reference_type` VARCHAR(50) NULL,
  `reference_id` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fin_tx_date` (`date`),
  INDEX `idx_fin_tx_type` (`type`),
  INDEX `idx_fin_tx_ref` (`reference_type`, `reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 16. Table: inventory_categories
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_categories` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 17. Table: inventory_items
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(50) NOT NULL,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'pcs',
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `average_unit_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12,2) NULL,
  `minimum_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `location` VARCHAR(100) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inv_items_cat` (`category_id`),
  INDEX `idx_inv_items_name` (`name`),
  CONSTRAINT `fk_inv_items_cat` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 18. Table: inventory_movements
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `inventory_item_id` VARCHAR(50) NOT NULL,
  `movement_type` ENUM('in', 'out', 'adjustment') NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `movement_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_inv_mov_item` (`inventory_item_id`),
  INDEX `idx_inv_mov_date` (`movement_date`),
  CONSTRAINT `fk_inv_mov_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 19. Table: settings
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 20. Table: users (AUTHENTICATION & ROLES)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin', 'staff') NOT NULL DEFAULT 'staff',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- 1. Users (Passwords: admin123 and staff123)
INSERT INTO `users` (`id`, `name`, `username`, `password_hash`, `role`, `status`, `created_at`)
VALUES
('usr-superadmin', 'Super Admin', 'admin', '$2a$10$w8uM7B5rY9UvX/f3k41gQevvL2eP1c13y6sS1x1t8zZ6hA4FqfK9i', 'super_admin', 'active', NOW()),
('usr-staff', 'Service Staff', 'staff', '$2a$10$zZ6hA4FqfK9iw8uM7B5rYevvL2eP1c13y6sS1x1t8UvX/f3k41gQe', 'staff', 'active', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `status` = 'active';

-- 2. Settings
INSERT INTO `settings` (`id`, `setting_key`, `setting_value`) VALUES
('set_business_name', 'business_name', 'Arshi Automobile & Car Hub'),
('set_phone', 'phone', '01712110902'),
('set_alt_phone', 'alt_phone', '01712345678'),
('set_address', 'address', 'Bhadra Mor, Station Road, Rajshahi, Bangladesh'),
('set_email', 'email', 'arshi.autohub@gmail.com'),
('set_invoice_prefix', 'invoice_prefix', 'INV-'),
('set_quotation_prefix', 'quotation_prefix', 'QT-'),
('set_job_card_prefix', 'job_card_prefix', 'JC-'),
('set_default_footer_text', 'default_footer_text', 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.'),
('set_currency_symbol', 'currency_symbol', '৳')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 3. Expense Categories
INSERT IGNORE INTO `expense_categories` (`id`, `name`, `status`) VALUES
('exp_cat_salary', 'Salary', 'active'),
('exp_cat_purchase', 'Purchase', 'active'),
('exp_cat_food', 'Food', 'active'),
('exp_cat_rent', 'Rent', 'active'),
('exp_cat_loan_repayment', 'Loan Repayment', 'active'),
('exp_cat_other', 'Other', 'active');

-- 4. Inventory Categories
INSERT IGNORE INTO `inventory_categories` (`id`, `name`, `status`) VALUES
('cat-1', 'Engine Oil', 'active'),
('cat-2', 'Filters', 'active'),
('cat-3', 'Car Wash', 'active'),
('cat-4', 'Polish & Detailing', 'active'),
('cat-5', 'Spare Parts', 'active'),
('cat-6', 'Electrical', 'active'),
('cat-7', 'Dent & Paint', 'active'),
('cat-8', 'Other', 'active');

-- 5. Services Catalog
INSERT IGNORE INTO `services` (`id`, `name`, `category`, `description`, `default_price`, `status`) VALUES
('srv-1', 'Foam Wash', 'Washing', 'High-pressure snow foam body wash & rinse', 500.00, 'active'),
('srv-2', 'Interior Cleaning', 'Detailing', 'Deep dashboard, seat & carpet cleaning', 800.00, 'active'),
('srv-3', 'Vacuum Cleaning', 'Washing', 'Interior vacuuming and dust removal', 400.00, 'active'),
('srv-4', 'Engine Room Cleaning', 'Detailing', 'Engine bay degreasing and shine', 600.00, 'active'),
('srv-5', 'Tyre Shining & Polish', 'Detailing', 'Tyre dressing & alloy wheel cleaning', 200.00, 'active'),
('srv-6', 'Full Car Polish & Wax', 'Detailing', 'Machine body polish with premium paste wax', 2500.00, 'active'),
('srv-7', 'Dent & Paint Touchup', 'Bodywork', 'Body panel dent removal & color matching', 4500.00, 'active'),
('srv-8', 'Engine Oil & Filter Change', 'Mechanical', 'Synthetic oil replacement & OEM oil filter', 3200.00, 'active'),
('srv-9', 'Full Periodic Car Servicing', 'Mechanical', 'Comprehensive 40-point vehicle inspection & tune-up', 5000.00, 'active'),
('srv-10', 'Brake Pad Servicing & Replacement', 'Mechanical', 'Front/rear brake caliper cleaning & pad replacement', 1800.00, 'active'),
('srv-11', 'AC Master Servicing & Gas Top-up', 'AC & Cooling', 'Cooling coil wash, gas recharge & filter change', 2800.00, 'active'),
('srv-12', 'Electrical Work & Wiring Check', 'Electrical', 'Fuse box, battery, alternator & lighting check', 1500.00, 'active'),
('srv-13', 'Vehicle Inspection', 'General', 'Pre-purchase & fitness diagnostic check', 1000.00, 'active'),
('srv-14', 'Other Custom Work', 'General', 'Custom repair or installation work', 1000.00, 'active');

-- 6. Initial Inventory Items & Stocks
INSERT IGNORE INTO `inventory_items` (`id`, `name`, `category_id`, `unit`, `quantity`, `average_unit_cost`, `minimum_stock`, `status`) VALUES
('item-1', 'Mobil Super 2000 5W-30 (4L)', 'cat-1', 'can', 18.000, 2450.00, 5.000, 'active'),
('item-2', 'Total Quartz 7000 10W-40 (4L)', 'cat-1', 'can', 12.000, 2150.00, 4.000, 'active'),
('item-3', 'Castrol GTX 20W-50 (4L)', 'cat-1', 'can', 15.000, 1850.00, 5.000, 'active'),
('item-4', 'Toyota Genuine Oil Filter (90915-YZZE1)', 'cat-2', 'pcs', 30.000, 380.00, 10.000, 'active'),
('item-5', 'Honda Genuine Oil Filter', 'cat-2', 'pcs', 20.000, 420.00, 8.000, 'active'),
('item-6', 'Snow Foam Car Shampoo (5L)', 'cat-3', 'can', 8.000, 1200.00, 3.000, 'active'),
('item-7', 'Meguiars Ultimate Polish (473ml)', 'cat-4', 'bottle', 6.000, 1650.00, 2.000, 'active'),
('item-8', '3M Paste Wax (290g)', 'cat-4', 'tin', 10.000, 850.00, 3.000, 'active'),
('item-9', 'Microfiber Cloth 40x40 (Pack of 5)', 'cat-4', 'pack', 25.000, 350.00, 10.000, 'active'),
('item-10', 'Brake Pad Set - Front (Toyota Premio/Allion)', 'cat-5', 'set', 8.000, 2200.00, 3.000, 'active'),
('item-11', 'Brake Pad Set - Front (Honda Vezel/Fit)', 'cat-5', 'set', 6.000, 2400.00, 2.000, 'active'),
('item-12', 'Spark Plug - Denso Iridium (Set of 4)', 'cat-6', 'set', 10.000, 2800.00, 4.000, 'active'),
('item-13', 'R134a AC Gas (13.6kg Cylinder)', 'cat-8', 'cylinder', 3.000, 7500.00, 1.000, 'active'),
('item-14', 'Coolant Pre-mixed (4L Green)', 'cat-8', 'can', 14.000, 950.00, 4.000, 'active'),
('item-15', 'Wiper Blade Pair (24\"+16\") Universal', 'cat-5', 'pair', 12.000, 650.00, 4.000, 'active');

-- 7. Sample Customers & Vehicles
INSERT IGNORE INTO `customers` (`id`, `name`, `phone`, `email`, `address`, `status`) VALUES
('cust-1', 'Md. Rahim Uddin', '01711122233', 'rahim.uddin@gmail.com', 'Kazihata, Rajshahi', 'active'),
('cust-2', 'Tanvir Ahmed', '01822334455', 'tanvir.ahmed@yahoo.com', 'Uposhohor, Rajshahi', 'active'),
('cust-3', 'Dr. Farhana Yasmin', '01933445566', 'dr.farhana@hotmail.com', 'Talaimari, Rajshahi', 'active');

INSERT IGNORE INTO `vehicles` (`id`, `customer_id`, `registration_number`, `make`, `model`, `model_year`, `color`) VALUES
('veh-1', 'cust-1', 'Rajshahi Metro-Ga 11-2233', 'Toyota', 'Allion A15', '2018', 'Pearl White'),
('veh-2', 'cust-2', 'Dhaka Metro-Gha 15-4422', 'Honda', 'Vezel Hybrid Z', '2019', 'Crystal Black'),
('veh-3', 'cust-3', 'Rajshahi Metro-Kha 12-9988', 'Nissan', 'X-Trail Hybrid', '2020', 'Metallic Silver');

SET FOREIGN_KEY_CHECKS = 1;
