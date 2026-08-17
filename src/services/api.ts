import {
  User,
  UserRole,
  AuthSession,
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

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'nextgarage_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication & User Management
  async login(username: string, password: string): Promise<AuthSession> {
    const res = await request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(res.token);
    return res;
  },

  async getCurrentUser(): Promise<User> {
    return request<User>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },

  async createUser(data: { name: string; username: string; password: string; role: UserRole }): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async resetUserPassword(id: string, password: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  },

  async deleteUser(id: string): Promise<boolean> {
    await request(`/users/${id}`, { method: 'DELETE' });
    return true;
  },

  // Metrics & Reports
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return request<DashboardMetrics>('/metrics');
  },

  async getTransactions(): Promise<Transaction[]> {
    return request<Transaction[]>('/transactions');
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return request<Customer[]>('/customers');
  },

  async getCustomerById(id: string): Promise<Customer | undefined> {
    try {
      return await request<Customer>(`/customers/${id}`);
    } catch {
      return undefined;
    }
  },

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'totalVisits' | 'lastServiceDate'>): Promise<Customer> {
    return request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
    return request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return request<Invoice[]>('/invoices');
  },

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    try {
      return await request<Invoice>(`/invoices/${id}`);
    } catch {
      return undefined;
    }
  },

  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    return request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  async recordDuePayment(
    invoiceId: string, 
    amount: number, 
    paymentMethod: 'Cash' | 'bKash' | 'Bank', 
    note?: string
  ): Promise<Invoice | null> {
    return request<Invoice>(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod, note }),
    });
  },

  async deleteInvoice(id: string): Promise<boolean> {
    await request(`/invoices/${id}`, { method: 'DELETE' });
    return true;
  },

  // Quotations
  async getQuotations(): Promise<Quotation[]> {
    return request<Quotation[]>('/quotations');
  },

  async getQuotationById(id: string): Promise<Quotation | undefined> {
    try {
      return await request<Quotation>(`/quotations/${id}`);
    } catch {
      return undefined;
    }
  },

  async createQuotation(data: Omit<Quotation, 'id' | 'createdAt'>): Promise<Quotation> {
    return request<Quotation>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQuotation(id: string, data: Partial<Quotation>): Promise<Quotation | null> {
    return request<Quotation>(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateQuotationStatus(id: string, status: QuotationStatus): Promise<Quotation | null> {
    return request<Quotation>(`/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteQuotation(id: string): Promise<boolean> {
    await request(`/quotations/${id}`, { method: 'DELETE' });
    return true;
  },

  async convertQuotationToInvoice(quotationId: string): Promise<Invoice | null> {
    return request<Invoice>(`/quotations/${quotationId}/convert`, {
      method: 'POST',
    });
  },

  // Job Cards
  async getJobCards(): Promise<JobCard[]> {
    return request<JobCard[]>('/job-cards');
  },

  async getJobCardById(id: string): Promise<JobCard | undefined> {
    try {
      return await request<JobCard>(`/job-cards/${id}`);
    } catch {
      return undefined;
    }
  },

  async createJobCard(data: Omit<JobCard, 'id' | 'createdAt'>): Promise<JobCard> {
    return request<JobCard>('/job-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateJobCard(id: string, data: Partial<JobCard>): Promise<JobCard | null> {
    return request<JobCard>(`/job-cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateJobCardStatus(id: string, status: JobCardStatus): Promise<JobCard | null> {
    return request<JobCard>(`/job-cards/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteJobCard(id: string): Promise<boolean> {
    await request(`/job-cards/${id}`, { method: 'DELETE' });
    return true;
  },

  async linkJobCardQuotation(jobCardId: string, quotationId: string, quotationNumber: string): Promise<void> {
    await request(`/job-cards/${jobCardId}/link-quotation`, {
      method: 'POST',
      body: JSON.stringify({ quotationId, quotationNumber }),
    });
  },

  async linkJobCardInvoice(jobCardId: string, invoiceId: string, invoiceNumber: string): Promise<void> {
    await request(`/job-cards/${jobCardId}/link-invoice`, {
      method: 'POST',
      body: JSON.stringify({ invoiceId, invoiceNumber }),
    });
  },

  async getStaffList(): Promise<string[]> {
    return initialStaff;
  },

  // Cash In
  async getCashIn(): Promise<CashIn[]> {
    return request<CashIn[]>('/transactions/cash-in');
  },

  async createCashIn(data: Omit<CashIn, 'id' | 'createdAt'>): Promise<CashIn> {
    return request<CashIn>('/transactions/cash-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCashIn(id: string): Promise<boolean> {
    await request(`/transactions/cash-in/${id}`, { method: 'DELETE' });
    return true;
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return request<Expense[]>('/expenses');
  },

  async createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    return request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteExpense(id: string): Promise<boolean> {
    await request(`/expenses/${id}`, { method: 'DELETE' });
    return true;
  },

  // Loans
  async getLoanSummary(): Promise<LoanSummary> {
    return request<LoanSummary>('/loans/summary');
  },

  async getLoanRecords(): Promise<LoanRecord[]> {
    return request<LoanRecord[]>('/loans/records');
  },

  // Services Catalog
  async getServices(): Promise<ServiceItem[]> {
    return request<ServiceItem[]>('/settings/services');
  },

  async createService(service: Omit<ServiceItem, 'id'>): Promise<ServiceItem> {
    return request<ServiceItem>('/settings/services', {
      method: 'POST',
      body: JSON.stringify(service),
    });
  },

  async deleteService(id: string): Promise<boolean> {
    await request(`/settings/services/${id}`, { method: 'DELETE' });
    return true;
  },

  // Categories
  async getExpenseCategories(): Promise<string[]> {
    return request<string[]>('/expenses/categories');
  },

  async addExpenseCategory(category: string): Promise<string[]> {
    return request<string[]>('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify({ name: category }),
    });
  },

  async deleteExpenseCategory(category: string): Promise<string[]> {
    return request<string[]>(`/expenses/categories/${encodeURIComponent(category)}`, {
      method: 'DELETE',
    });
  },

  // Settings
  async getSettings(): Promise<Settings> {
    return request<Settings>('/settings');
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Inventory & Stock Management
  async getInventoryCategories(): Promise<InventoryCategory[]> {
    return request<InventoryCategory[]>('/inventory/categories');
  },

  async addInventoryCategory(name: string): Promise<InventoryCategory> {
    return request<InventoryCategory>('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async getInventoryItems(includeInactive = false): Promise<InventoryItem[]> {
    return request<InventoryItem[]>(`/inventory/items?includeInactive=${includeInactive}`);
  },

  async getInventoryItemById(id: string): Promise<InventoryItem | undefined> {
    try {
      return await request<InventoryItem>(`/inventory/items/${id}`);
    } catch {
      return undefined;
    }
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
    return request<InventoryItem>('/inventory/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  async updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem | null> {
    return request<InventoryItem>(`/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async stockIn(
    itemId: string,
    quantity: number,
    unitCost: number,
    date: string,
    reason: string,
    note?: string
  ): Promise<{ item: InventoryItem; movement: StockMovement } | null> {
    return request<{ item: InventoryItem; movement: StockMovement }>(`/inventory/items/${itemId}/stock-in`, {
      method: 'POST',
      body: JSON.stringify({ quantity, unitCost, date, reason, note }),
    });
  },

  async stockOut(
    itemId: string,
    quantity: number,
    date: string,
    reason: string,
    note?: string
  ): Promise<{ item: InventoryItem; movement: StockMovement } | null> {
    return request<{ item: InventoryItem; movement: StockMovement }>(`/inventory/items/${itemId}/stock-out`, {
      method: 'POST',
      body: JSON.stringify({ quantity, date, reason, note }),
    });
  },

  async adjustStock(
    itemId: string,
    physicalQuantity: number,
    date: string,
    reason: string,
    note?: string
  ): Promise<{ item: InventoryItem; movement: StockMovement } | null> {
    return request<{ item: InventoryItem; movement: StockMovement }>(`/inventory/items/${itemId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ physicalQuantity, date, reason, note }),
    });
  },

  async getStockHistory(itemId?: string): Promise<StockMovement[]> {
    const query = itemId ? `?itemId=${itemId}` : '';
    return request<StockMovement[]>(`/inventory/movements${query}`);
  },

  async getInventorySummary(): Promise<InventorySummary> {
    return request<InventorySummary>('/inventory/summary');
  },

  async deactivateInventoryItem(id: string): Promise<boolean> {
    const res = await request<{ success: boolean }>(`/inventory/items/${id}/deactivate`, {
      method: 'PATCH',
    });
    return res.success;
  },

  async reactivateInventoryItem(id: string): Promise<boolean> {
    const res = await request<{ success: boolean }>(`/inventory/items/${id}/reactivate`, {
      method: 'PATCH',
    });
    return res.success;
  },

  async deleteInventoryItem(id: string): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>(`/inventory/items/${id}`, {
      method: 'DELETE',
    });
  },

  // Reset
  async resetToDefault(): Promise<void> {
    console.log('Reset triggered');
  }
};
