export type UserRole = 'super_admin' | 'staff';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Technician {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export type PaymentMethod = 'Cash' | 'bKash' | 'Bank';

export type InvoiceStatus = 'Paid' | 'Partial' | 'Due';

export type QuotationStatus = 
  | 'Draft'
  | 'Sent'
  | 'Accepted'
  | 'Rejected'
  | 'Expired'
  | 'Converted';

export type JobCardStatus = 'In Progress' | 'Completed';

export type CashInType = 'Service Payment' | 'Loan from MD' | 'Other Income';

export type ExpenseCategory = 
  | 'Salary'
  | 'Purchase'
  | 'Food'
  | 'Rent'
  | 'Loan Repayment'
  | 'Other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  vehicles: Vehicle[];
  totalVisits: number;
  lastServiceDate: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId?: string;
  registrationNumber: string; // e.g. "Rajshahi Metro-Ga 11-2345"
  model: string;              // e.g. "Toyota Axio"
  color?: string;
  year?: string;
  mileage?: string | number;
}

export interface ServiceItem {
  id: string;
  name: string;
  defaultPrice: number;
  category?: string;
  description?: string;
}

export interface InvoiceItem {
  id: string;
  serviceId?: string;
  serviceName: string;
  price: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;               // YYYY-MM-DD
  customerId?: string;
  customerName: string;
  customerPhone: string;
  vehicleRegistration: string;
  vehicleModel: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paid: number;
  due: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  quotationId?: string;
  quotationNumber?: string;
  convertedFromQuotation?: boolean;
  jobCardId?: string;
  jobCardNumber?: string;
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId?: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;    // e.g. "QT-0001"
  customerId?: string;
  vehicleId?: string;
  customerName: string;
  customerPhone: string;
  vehicleRegistration: string;
  vehicleModel: string;
  date: string;               // YYYY-MM-DD
  validUntil: string;         // YYYY-MM-DD
  status: QuotationStatus;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt?: string;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  jobCardId?: string;
  jobCardNumber?: string;
}

export interface JobCardWorkItem {
  id: string;
  jobCardId?: string;
  serviceName: string;
  description?: string;
}

export interface JobCard {
  id: string;
  jobCardNumber: string;      // e.g. "JC-0001"
  customerId?: string;
  vehicleId?: string;
  customerName: string;
  customerPhone: string;
  vehicleRegistration: string;
  vehicleModel: string;
  mileage?: string | number;
  date: string;               // YYYY-MM-DD
  expectedDeliveryDate?: string; // YYYY-MM-DD
  status: JobCardStatus;
  customerComplaint: string;
  requiredWork: JobCardWorkItem[];
  vehicleCondition?: string;
  assignedTo: string;         // Technician 1, Service Team, etc.
  beforePhotos?: string[];
  afterPhotos?: string[];
  notes?: string;
  quotationId?: string;
  quotationNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt?: string;
}


export interface CashIn {
  id: string;
  date: string;               // YYYY-MM-DD
  time: string;               // HH:MM AM/PM
  type: CashInType;
  description: string;
  reference?: string;         // e.g. "INV-001" or "MD Inflow"
  paymentMethod: PaymentMethod;
  amount: number;
  invoiceId?: string;
  customerName?: string;
  vehicleInfo?: string;
  note?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;               // YYYY-MM-DD
  time: string;               // HH:MM AM/PM
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  amount: number;
  note?: string;
  recipient?: string;
  createdAt: string;
}

export interface LoanRecord {
  id: string;
  date: string;
  time: string;
  type: 'Received' | 'Repayment';
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface LoanSummary {
  totalReceived: number;
  totalRepaid: number;
  remaining: number;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  flow: 'IN' | 'OUT';
  type: string;               // Service Payment, Salary, Purchase, etc.
  description: string;
  reference?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  sourceId?: string;
}

export interface Settings {
  businessName: string;
  phone: string;
  altPhone?: string;
  address: string;
  email?: string;
  invoicePrefix: string;
  defaultFooterText: string;
  currencySymbol: string;
}

export interface DashboardMetrics {
  todayCashIn: number;
  todayCashOut: number;
  todayNet: number;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
  totalCustomers: number;
  totalActiveInvoices: number;
  totalInvoices?: number;
  pendingQuotationsCount?: number;
  activeJobCardsCount?: number;
  inProgressJobCardsCount?: number;
  completedTodayJobCardsCount?: number;
  totalBilled?: number;
  totalPaid?: number;
  totalDue?: number;
  totalIncome?: number;
  totalExpense?: number;
  netProfit?: number;
}

// ==========================================
// INVENTORY SYSTEM TYPES (Physical Stock)
// ==========================================
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type InventoryStockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface InventoryCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  unit: string;
  quantity: number;
  averageUnitCost: number;
  minimumStock: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName?: string;
  type: StockMovementType;
  quantity: number;
  unitCost: number;
  totalValue: number;
  reason: string;
  note?: string;
  date: string;
  createdAt: string;
}

export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
}

// ==========================================
// LEAD MANAGEMENT (Facebook / Sales Follow-up)
// ==========================================
export type LeadSource = 'Facebook' | 'Phone' | 'WhatsApp' | 'Website' | 'Walk-in' | 'Other';

export type LeadStatus =
  | 'New'
  | 'Assigned'
  | 'Called'
  | 'No Answer'
  | 'Interested'
  | 'Visit Agreed'
  | 'Visit Scheduled'
  | 'Visited'
  | 'Service Taken'
  | 'Not Interested'
  | 'Lost';

export interface FollowUp {
  id: string;
  leadId: string;
  staffId: string;       // staff name for now (mock)
  contactDate: string;   // YYYY-MM-DD
  status: LeadStatus;    // status the lead was set to as a result of this follow-up
  note: string;
  nextFollowUpDate?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Lead {
  id: string;
  leadNumber: string;      // e.g. "LD-0001"
  customerName: string;
  phone: string;
  source: LeadSource;
  inquiry: string;         // original Facebook message / customer inquiry
  status: LeadStatus;
  leadDate: string;        // YYYY-MM-DD
  lastContactDate?: string;    // YYYY-MM-DD
  nextFollowUpDate?: string;   // YYYY-MM-DD
  visitDate?: string;          // YYYY-MM-DD
  visitTime?: string;          // HH:MM
  vehicleModel?: string;
  customerId?: string;
  vehicleId?: string;
  jobCardId?: string;
  jobCardNumber?: string;
  quotationId?: string;
  quotationNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  notes?: string;
  followUps: FollowUp[];
  createdAt: string;
  updatedAt?: string;
}

export interface LeadStaff {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

