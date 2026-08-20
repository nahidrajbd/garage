-- ===================================================
-- NextGarage Relational Database Schema
-- Charset: utf8mb4, Engine: InnoDB
-- Monetary fields: DECIMAL(12,2)
-- Quantity fields: DECIMAL(12,3)
-- ===================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(191) NULL,
  address TEXT NULL,
  notes TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  make VARCHAR(100) NULL,
  model VARCHAR(191) NOT NULL,
  model_year VARCHAR(20) NULL,
  color VARCHAR(50) NULL,
  mileage VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vehicles_reg (registration_number),
  INDEX idx_vehicles_cust (customer_id),
  CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. SERVICES CATALOG
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  default_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_services_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. JOB CARDS
CREATE TABLE IF NOT EXISTS job_cards (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  job_card_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id VARCHAR(50) NULL,
  vehicle_id VARCHAR(50) NULL,
  customer_name VARCHAR(191) NULL,
  customer_phone VARCHAR(50) NULL,
  vehicle_registration VARCHAR(100) NULL,
  vehicle_model VARCHAR(191) NULL,
  mileage VARCHAR(50) NULL,
  date DATE NOT NULL,
  expected_delivery_date DATE NULL,
  status ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  customer_complaint TEXT NULL,
  vehicle_condition TEXT NULL,
  assigned_to VARCHAR(100) NULL,
  notes TEXT NULL,
  quotation_id VARCHAR(50) NULL,
  invoice_id VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_cards_num (job_card_number),
  INDEX idx_job_cards_status (status),
  INDEX idx_job_cards_cust (customer_id),
  INDEX idx_job_cards_veh (vehicle_id),
  CONSTRAINT fk_jc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_jc_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. JOB CARD ITEMS
CREATE TABLE IF NOT EXISTS job_card_items (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  job_card_id VARCHAR(50) NOT NULL,
  service_name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jc_items_jc (job_card_id),
  CONSTRAINT fk_jc_items_jc FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. JOB CARD PHOTOS
CREATE TABLE IF NOT EXISTS job_card_photos (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  job_card_id VARCHAR(50) NOT NULL,
  photo_type ENUM('before', 'after') NOT NULL,
  file_path TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jc_photos_jc (job_card_id),
  CONSTRAINT fk_jc_photos_jc FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. QUOTATIONS
CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id VARCHAR(50) NULL,
  vehicle_id VARCHAR(50) NULL,
  customer_name VARCHAR(191) NULL,
  customer_phone VARCHAR(50) NULL,
  vehicle_registration VARCHAR(100) NULL,
  vehicle_model VARCHAR(191) NULL,
  job_card_id VARCHAR(50) NULL,
  quotation_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted') NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  terms TEXT NULL,
  converted_invoice_id VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quotations_num (quotation_number),
  INDEX idx_quotations_cust (customer_id),
  INDEX idx_quotations_veh (vehicle_id),
  INDEX idx_quotations_jc (job_card_id),
  CONSTRAINT fk_quotations_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotations_jc FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. QUOTATION ITEMS
CREATE TABLE IF NOT EXISTS quotation_items (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  quotation_id VARCHAR(50) NOT NULL,
  service_name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quotation_items_q (quotation_id),
  CONSTRAINT fk_q_items_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id VARCHAR(50) NULL,
  vehicle_id VARCHAR(50) NULL,
  customer_name VARCHAR(191) NULL,
  customer_phone VARCHAR(50) NULL,
  vehicle_registration VARCHAR(100) NULL,
  vehicle_model VARCHAR(191) NULL,
  job_card_id VARCHAR(50) NULL,
  quotation_id VARCHAR(50) NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  due_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('due', 'partial', 'paid', 'cancelled') NOT NULL DEFAULT 'due',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoices_num (invoice_number),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_cust (customer_id),
  INDEX idx_invoices_veh (vehicle_id),
  INDEX idx_invoices_jc (job_card_id),
  INDEX idx_invoices_quotation (quotation_id),
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_jc FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  invoice_id VARCHAR(50) NOT NULL,
  service_id VARCHAR(50) NULL,
  service_name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoice_items_inv (invoice_id),
  CONSTRAINT fk_inv_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  invoice_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash', 'bkash', 'bank', 'other') NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL,
  payment_time VARCHAR(20) NULL,
  reference VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_inv (invoice_id),
  INDEX idx_payments_date (payment_date),
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  category_id VARCHAR(50) NULL,
  category_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash', 'bkash', 'bank', 'other') NOT NULL DEFAULT 'cash',
  expense_date DATE NOT NULL,
  expense_time VARCHAR(20) NULL,
  reference VARCHAR(100) NULL,
  recipient VARCHAR(191) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expenses_date (expense_date),
  INDEX idx_expenses_category (category_id),
  CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. FINANCIAL TRANSACTIONS (UNIFIED DOUBLE-ENTRY LEDGER)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  transaction_type ENUM('cash_in', 'cash_out') NOT NULL,
  category VARCHAR(100) NOT NULL,
  reference_type ENUM('invoice_payment', 'md_loan', 'expense', 'other') NOT NULL DEFAULT 'other',
  reference_id VARCHAR(100) NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash', 'bkash', 'bank', 'other') NOT NULL DEFAULT 'cash',
  transaction_date DATE NOT NULL,
  transaction_time VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_date (transaction_date),
  INDEX idx_tx_type (transaction_type),
  INDEX idx_tx_ref (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. MD LOANS & REPAYMENTS
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL DEFAULT 'MD Loan',
  loan_type VARCHAR(50) NOT NULL DEFAULT 'md_loan',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('active', 'cleared') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_payments (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  loan_id VARCHAR(50) NOT NULL,
  payment_type ENUM('received', 'repayment') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_time VARCHAR(20) NULL,
  payment_method ENUM('cash', 'bkash', 'bank', 'other') NOT NULL DEFAULT 'cash',
  reference VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lp_loan (loan_id),
  INDEX idx_lp_date (payment_date),
  CONSTRAINT fk_lp_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. INVENTORY CATEGORIES
CREATE TABLE IF NOT EXISTS inventory_categories (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'Piece',
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  average_unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  minimum_stock DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  notes TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_inv_items_cat (category_id),
  INDEX idx_inv_items_name (name),
  CONSTRAINT fk_inv_items_cat FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. INVENTORY MOVEMENTS (WEIGHTED AVERAGE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  inventory_item_id VARCHAR(50) NOT NULL,
  movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reason VARCHAR(191) NOT NULL,
  note TEXT NULL,
  movement_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inv_mov_item (inventory_item_id),
  INDEX idx_inv_mov_date (movement_date),
  CONSTRAINT fk_inv_mov_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. USERS (AUTHENTICATION & ROLES)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'staff') NOT NULL DEFAULT 'staff',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. TECHNICIANS (WORKSHOP STAFF)
CREATE TABLE IF NOT EXISTS technicians (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  specialty VARCHAR(191) NULL,
  phone VARCHAR(64) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_technicians_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. LEADS (Facebook / Phone inquiries & staff follow-up)
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  lead_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(191) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'Facebook',
  inquiry TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'New',
  lead_date DATE NOT NULL,
  last_contact_date DATE NULL,
  next_follow_up_date DATE NULL,
  visit_date DATE NULL,
  visit_time VARCHAR(20) NULL,
  vehicle_model VARCHAR(191) NULL,
  customer_id VARCHAR(50) NULL,
  vehicle_id VARCHAR(50) NULL,
  job_card_id VARCHAR(50) NULL,
  job_card_number VARCHAR(50) NULL,
  quotation_id VARCHAR(50) NULL,
  quotation_number VARCHAR(50) NULL,
  invoice_id VARCHAR(50) NULL,
  invoice_number VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_number (lead_number),
  INDEX idx_leads_status (status),
  INDEX idx_leads_phone (phone),
  INDEX idx_leads_next_followup (next_follow_up_date),
  CONSTRAINT fk_leads_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. LEAD FOLLOW-UPS
CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  lead_id VARCHAR(50) NOT NULL,
  staff_id VARCHAR(100) NOT NULL,
  contact_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  note TEXT NULL,
  next_follow_up_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_fu_lead (lead_id),
  CONSTRAINT fk_lead_fu_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
