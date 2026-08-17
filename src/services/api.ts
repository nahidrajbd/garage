import { storage } from './storage';
import {
  Customer,
  Invoice,
  Quotation,
  QuotationStatus,
  JobCard,
  JobCardStatus,
  CashIn,
  Expense,
  ServiceItem,
  LoanRecord,
  LoanSummary,
  Settings,
  DashboardMetrics,
  Transaction,
  InventoryCategory,
  InventoryItem,
  StockMovement,
  InventorySummary
} from '../types';
import { initialStaff } from '../mock/initialData';

// Artificial delay to simulate network call if needed
const delay = (ms = 50) => new Promise(res => setTimeout(res, ms));

export const api = {
  // Metrics & Reports
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay();
    return storage.getDashboardMetrics();
  },

  async getTransactions(): Promise<Transaction[]> {
    await delay();
    return storage.getTransactions();
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    await delay();
    return storage.getCustomers();
  },

  async getCustomerById(id: string): Promise<Customer | undefined> {
    await delay();
    return storage.getCustomers().find(c => c.id === id);
  },

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'totalVisits' | 'lastServiceDate'>): Promise<Customer> {
    await delay();
    return storage.addCustomer(data);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
    await delay();
    return storage.updateCustomer(id, data);
  },

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    await delay();
    return storage.getInvoices();
  },

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    await delay();
    return storage.getInvoiceById(id);
  },

  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    await delay();
    return storage.createInvoice(invoiceData);
  },

  async recordDuePayment(
    invoiceId: string, 
    amount: number, 
    paymentMethod: 'Cash' | 'bKash' | 'Bank', 
    note?: string
  ): Promise<Invoice | null> {
    await delay();
    return storage.recordDuePayment(invoiceId, amount, paymentMethod, note);
  },

  async deleteInvoice(id: string): Promise<boolean> {
    await delay();
    storage.deleteInvoice(id);
    return true;
  },

  // Quotations
  async getQuotations(): Promise<Quotation[]> {
    await delay();
    return storage.getQuotations();
  },

  async getQuotationById(id: string): Promise<Quotation | undefined> {
    await delay();
    return storage.getQuotationById(id);
  },

  async createQuotation(data: Omit<Quotation, 'id' | 'createdAt'>): Promise<Quotation> {
    await delay();
    return storage.createQuotation(data);
  },

  async updateQuotation(id: string, data: Partial<Quotation>): Promise<Quotation | null> {
    await delay();
    return storage.updateQuotation(id, data);
  },

  async updateQuotationStatus(id: string, status: QuotationStatus): Promise<Quotation | null> {
    await delay();
    return storage.updateQuotationStatus(id, status);
  },

  async deleteQuotation(id: string): Promise<boolean> {
    await delay();
    storage.deleteQuotation(id);
    return true;
  },

  async convertQuotationToInvoice(quotationId: string): Promise<Invoice | null> {
    await delay();
    return storage.convertQuotationToInvoice(quotationId);
  },

  // Job Cards
  async getJobCards(): Promise<JobCard[]> {
    await delay();
    return storage.getJobCards();
  },

  async getJobCardById(id: string): Promise<JobCard | undefined> {
    await delay();
    return storage.getJobCardById(id);
  },

  async createJobCard(data: Omit<JobCard, 'id' | 'createdAt'>): Promise<JobCard> {
    await delay();
    return storage.createJobCard(data);
  },

  async updateJobCard(id: string, data: Partial<JobCard>): Promise<JobCard | null> {
    await delay();
    return storage.updateJobCard(id, data);
  },

  async updateJobCardStatus(id: string, status: JobCardStatus): Promise<JobCard | null> {
    await delay();
    return storage.updateJobCardStatus(id, status);
  },

  async deleteJobCard(id: string): Promise<boolean> {
    await delay();
    storage.deleteJobCard(id);
    return true;
  },

  async linkJobCardQuotation(jobCardId: string, quotationId: string, quotationNumber: string): Promise<void> {
    await delay();
    storage.linkJobCardQuotation(jobCardId, quotationId, quotationNumber);
  },

  async linkJobCardInvoice(jobCardId: string, invoiceId: string, invoiceNumber: string): Promise<void> {
    await delay();
    storage.linkJobCardInvoice(jobCardId, invoiceId, invoiceNumber);
  },

  async getStaffList(): Promise<string[]> {
    await delay();
    return initialStaff;
  },

  // Cash In
  async getCashIn(): Promise<CashIn[]> {
    await delay();
    return storage.getCashIn();
  },

  async createCashIn(data: Omit<CashIn, 'id' | 'createdAt'>): Promise<CashIn> {
    await delay();
    return storage.addCashIn(data);
  },

  async deleteCashIn(id: string): Promise<boolean> {
    await delay();
    storage.deleteCashIn(id);
    return true;
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    await delay();
    return storage.getExpenses();
  },

  async createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    await delay();
    return storage.addExpense(data);
  },

  async deleteExpense(id: string): Promise<boolean> {
    await delay();
    storage.deleteExpense(id);
    return true;
  },

  // Loans
  async getLoanSummary(): Promise<LoanSummary> {
    await delay();
    return storage.getLoanSummary();
  },

  async getLoanRecords(): Promise<LoanRecord[]> {
    await delay();
    return storage.getLoanRecords();
  },

  // Services Catalog
  async getServices(): Promise<ServiceItem[]> {
    await delay();
    return storage.getServices();
  },

  async createService(service: Omit<ServiceItem, 'id'>): Promise<ServiceItem> {
    await delay();
    return storage.addService(service);
  },

  async deleteService(id: string): Promise<boolean> {
    await delay();
    storage.deleteService(id);
    return true;
  },

  // Categories
  async getExpenseCategories(): Promise<string[]> {
    await delay();
    return storage.getCategories();
  },

  async addExpenseCategory(category: string): Promise<string[]> {
    await delay();
    return storage.addCategory(category);
  },

  async deleteExpenseCategory(category: string): Promise<string[]> {
    await delay();
    return storage.deleteCategory(category);
  },

  // Settings
  async getSettings(): Promise<Settings> {
    await delay();
    return storage.getSettings();
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    await delay();
    return storage.updateSettings(settings);
  },

  // Inventory & Stock Management
  async getInventoryCategories(): Promise<InventoryCategory[]> {
    await delay();
    return storage.getInventoryCategories();
  },

  async addInventoryCategory(name: string): Promise<InventoryCategory> {
    await delay();
    return storage.addInventoryCategory(name);
  },

  async getInventoryItems(includeInactive = false): Promise<InventoryItem[]> {
    await delay();
    return storage.getInventoryItems(includeInactive);
  },

  async getInventoryItemById(id: string): Promise<InventoryItem | undefined> {
    await delay();
    return storage.getInventoryItemById(id);
  },

  async createInventoryItem(itemData: {
    name: string;
    categoryId: string;
    unit: string;
    initialQuantity: number;
    unitCost: number;
    minimumStock: number;
    notes?: string;
  }): Promise<InventoryItem> {
    await delay();
    return storage.createInventoryItem(itemData);
  },

  async updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem | null> {
    await delay();
    return storage.updateInventoryItem(id, data);
  },

  async stockIn(
    itemId: string,
    quantity: number,
    unitCost: number,
    date: string,
    reason: string,
    note?: string
  ): Promise<{ item: InventoryItem; movement: StockMovement } | null> {
    await delay();
    return storage.stockIn(itemId, quantity, unitCost, date, reason, note);
  },

  async stockOut(
    itemId: string,
    quantity: number,
    date: string,
    reason: string,
    note?: string
  ): Promise<{ item: InventoryItem; movement: StockMovement } | null> {
    await delay();
    return storage.stockOut(itemId, quantity, date, reason, note);
  },

  async adjustStock(
    itemId: string,
    physicalQuantity: number,
    date: string,
    reason: string,
    note?: string
  ): Promise<{ item: InventoryItem; movement: StockMovement } | null> {
    await delay();
    return storage.adjustStock(itemId, physicalQuantity, date, reason, note);
  },

  async getStockHistory(itemId?: string): Promise<StockMovement[]> {
    await delay();
    return storage.getStockHistory(itemId);
  },

  async getInventorySummary(): Promise<InventorySummary> {
    await delay();
    return storage.getInventorySummary();
  },

  async deactivateInventoryItem(id: string): Promise<boolean> {
    await delay();
    return storage.deactivateInventoryItem(id);
  },

  async reactivateInventoryItem(id: string): Promise<boolean> {
    await delay();
    return storage.reactivateInventoryItem(id);
  },

  async deleteInventoryItem(id: string): Promise<{ success: boolean; message?: string }> {
    await delay();
    return storage.deleteInventoryItem(id);
  },

  // Reset
  async resetToDefault(): Promise<void> {
    await delay();
    storage.resetToDefault();
  }
};
