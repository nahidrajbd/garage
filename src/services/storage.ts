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
  Settings,
  LoanSummary,
  DashboardMetrics,
  Transaction
} from '../types';
import {
  initialCustomers,
  initialInvoices,
  initialQuotations,
  initialJobCards,
  initialCashIn,
  initialExpenses,
  initialServices,
  initialLoanRecords,
  initialSettings,
  initialExpenseCategories
} from '../mock/initialData';

const KEYS = {
  CUSTOMERS: 'arshi_customers_v1',
  INVOICES: 'arshi_invoices_v1',
  QUOTATIONS: 'arshi_quotations_v1',
  JOB_CARDS: 'arshi_job_cards_v1',
  CASH_IN: 'arshi_cash_in_v1',
  EXPENSES: 'arshi_expenses_v1',
  SERVICES: 'arshi_services_v1',
  LOANS: 'arshi_loans_v1',
  SETTINGS: 'arshi_settings_v1',
  EXPENSE_CATEGORIES: 'arshi_categories_v1',
};

function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

export const storage = {
  // Reset all
  resetToDefault: () => {
    saveToStorage(KEYS.CUSTOMERS, initialCustomers);
    saveToStorage(KEYS.INVOICES, initialInvoices);
    saveToStorage(KEYS.QUOTATIONS, initialQuotations);
    saveToStorage(KEYS.JOB_CARDS, initialJobCards);
    saveToStorage(KEYS.CASH_IN, initialCashIn);
    saveToStorage(KEYS.EXPENSES, initialExpenses);
    saveToStorage(KEYS.SERVICES, initialServices);
    saveToStorage(KEYS.LOANS, initialLoanRecords);
    saveToStorage(KEYS.SETTINGS, initialSettings);
    saveToStorage(KEYS.EXPENSE_CATEGORIES, initialExpenseCategories);
  },

  // Settings
  getSettings: (): Settings => {
    return getFromStorage<Settings>(KEYS.SETTINGS, initialSettings);
  },
  updateSettings: (settings: Partial<Settings>): Settings => {
    const current = storage.getSettings();
    const updated = { ...current, ...settings };
    saveToStorage(KEYS.SETTINGS, updated);
    return updated;
  },

  // Services Catalog
  getServices: (): ServiceItem[] => {
    return getFromStorage<ServiceItem[]>(KEYS.SERVICES, initialServices);
  },
  saveServices: (services: ServiceItem[]): void => {
    saveToStorage(KEYS.SERVICES, services);
  },
  addService: (service: Omit<ServiceItem, 'id'>): ServiceItem => {
    const services = storage.getServices();
    const newService: ServiceItem = {
      ...service,
      id: `srv-${Date.now()}`
    };
    services.push(newService);
    storage.saveServices(services);
    return newService;
  },
  deleteService: (id: string): void => {
    const services = storage.getServices().filter(s => s.id !== id);
    storage.saveServices(services);
  },

  // Expense Categories
  getCategories: (): string[] => {
    return getFromStorage<string[]>(KEYS.EXPENSE_CATEGORIES, initialExpenseCategories);
  },
  addCategory: (cat: string): string[] => {
    const cats = storage.getCategories();
    if (!cats.includes(cat.trim())) {
      cats.push(cat.trim());
      saveToStorage(KEYS.EXPENSE_CATEGORIES, cats);
    }
    return cats;
  },
  deleteCategory: (cat: string): string[] => {
    const cats = storage.getCategories().filter(c => c !== cat);
    saveToStorage(KEYS.EXPENSE_CATEGORIES, cats);
    return cats;
  },

  // Customers
  getCustomers: (): Customer[] => {
    return getFromStorage<Customer[]>(KEYS.CUSTOMERS, initialCustomers);
  },
  saveCustomers: (customers: Customer[]): void => {
    saveToStorage(KEYS.CUSTOMERS, customers);
  },
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalVisits' | 'lastServiceDate'>): Customer => {
    const customers = storage.getCustomers();
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      totalVisits: 1,
      lastServiceDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      vehicles: customer.vehicles || []
    };
    customers.unshift(newCust);
    storage.saveCustomers(customers);
    return newCust;
  },
  updateCustomer: (id: string, updates: Partial<Customer>): Customer | null => {
    const customers = storage.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    customers[idx] = { ...customers[idx], ...updates };
    storage.saveCustomers(customers);
    return customers[idx];
  },

  // Invoices
  getInvoices: (): Invoice[] => {
    return getFromStorage<Invoice[]>(KEYS.INVOICES, initialInvoices);
  },
  saveInvoices: (invoices: Invoice[]): void => {
    saveToStorage(KEYS.INVOICES, invoices);
  },
  getInvoiceById: (id: string): Invoice | undefined => {
    return storage.getInvoices().find(inv => inv.id === id || inv.invoiceNumber === id);
  },
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const invoices = storage.getInvoices();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    invoices.unshift(newInvoice);
    storage.saveInvoices(invoices);

    // If paid > 0, record a CashIn entry automatically
    if (newInvoice.paid > 0) {
      storage.addCashIn({
        date: newInvoice.date,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'Service Payment',
        description: `Service Payment - ${newInvoice.vehicleModel || 'Vehicle'}`,
        reference: newInvoice.invoiceNumber,
        paymentMethod: newInvoice.paymentMethod,
        amount: newInvoice.paid,
        invoiceId: newInvoice.id,
        customerName: newInvoice.customerName,
        vehicleInfo: `${newInvoice.vehicleModel} (${newInvoice.vehicleRegistration})`,
        note: `Invoice payment for ${newInvoice.invoiceNumber}`
      });
    }

    // Update customer visit info
    const customers = storage.getCustomers();
    const existingCust = customers.find(c => 
      (newInvoice.customerId && c.id === newInvoice.customerId) ||
      (c.phone && c.phone === newInvoice.customerPhone)
    );
    if (existingCust) {
      existingCust.totalVisits += 1;
      existingCust.lastServiceDate = newInvoice.date;
      // Add vehicle if not present
      if (newInvoice.vehicleRegistration && !existingCust.vehicles.some(v => v.registrationNumber.toLowerCase() === newInvoice.vehicleRegistration.toLowerCase())) {
        existingCust.vehicles.push({
          id: `veh-${Date.now()}`,
          registrationNumber: newInvoice.vehicleRegistration,
          model: newInvoice.vehicleModel
        });
      }
      storage.saveCustomers(customers);
    }

    return newInvoice;
  },
  recordDuePayment: (invoiceId: string, paymentAmount: number, paymentMethod: 'Cash' | 'bKash' | 'Bank', note?: string): Invoice | null => {
    const invoices = storage.getInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) return null;

    const inv = invoices[idx];
    const newPaid = Math.min(inv.grandTotal, inv.paid + paymentAmount);
    const newDue = Math.max(0, inv.grandTotal - newPaid);
    const newStatus = newDue === 0 ? 'Paid' : 'Partial';

    invoices[idx] = {
      ...inv,
      paid: newPaid,
      due: newDue,
      status: newStatus
    };
    storage.saveInvoices(invoices);

    // Record cash in
    storage.addCashIn({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'Service Payment',
      description: `Due Collection - ${inv.customerName} (${inv.vehicleModel})`,
      reference: inv.invoiceNumber,
      paymentMethod: paymentMethod,
      amount: paymentAmount,
      invoiceId: inv.id,
      customerName: inv.customerName,
      vehicleInfo: `${inv.vehicleModel} (${inv.vehicleRegistration})`,
      note: note || `Due collection for invoice ${inv.invoiceNumber}`
    });

    return invoices[idx];
  },
  deleteInvoice: (id: string): void => {
    const invoices = storage.getInvoices().filter(i => i.id !== id);
    storage.saveInvoices(invoices);
  },

  // Quotations
  getQuotations: (): Quotation[] => {
    return getFromStorage<Quotation[]>(KEYS.QUOTATIONS, initialQuotations);
  },
  saveQuotations: (quotations: Quotation[]): void => {
    saveToStorage(KEYS.QUOTATIONS, quotations);
  },
  getQuotationById: (id: string): Quotation | undefined => {
    return storage.getQuotations().find(q => q.id === id || q.quotationNumber === id);
  },
  createQuotation: (quotationData: Omit<Quotation, 'id' | 'createdAt'>): Quotation => {
    const quotations = storage.getQuotations();
    const newQuotation: Quotation = {
      ...quotationData,
      id: `qt-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    quotations.unshift(newQuotation);
    storage.saveQuotations(quotations);

    // If existing customer found, link vehicle if needed
    const customers = storage.getCustomers();
    const existingCust = customers.find(c => 
      (newQuotation.customerId && c.id === newQuotation.customerId) ||
      (c.phone && c.phone === newQuotation.customerPhone)
    );
    if (existingCust && newQuotation.vehicleRegistration) {
      if (!existingCust.vehicles.some(v => v.registrationNumber.toLowerCase() === newQuotation.vehicleRegistration.toLowerCase())) {
        existingCust.vehicles.push({
          id: `veh-${Date.now()}`,
          registrationNumber: newQuotation.vehicleRegistration,
          model: newQuotation.vehicleModel
        });
        storage.saveCustomers(customers);
      }
    }

    return newQuotation;
  },
  updateQuotation: (id: string, updates: Partial<Quotation>): Quotation | null => {
    const quotations = storage.getQuotations();
    const idx = quotations.findIndex(q => q.id === id);
    if (idx === -1) return null;
    quotations[idx] = {
      ...quotations[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    storage.saveQuotations(quotations);
    return quotations[idx];
  },
  updateQuotationStatus: (id: string, status: QuotationStatus): Quotation | null => {
    return storage.updateQuotation(id, { status });
  },
  deleteQuotation: (id: string): void => {
    const quotations = storage.getQuotations().filter(q => q.id !== id);
    storage.saveQuotations(quotations);
  },
  convertQuotationToInvoice: (quotationId: string): Invoice | null => {
    const quotation = storage.getQuotationById(quotationId);
    if (!quotation) return null;
    if (quotation.status === 'Converted' && quotation.convertedInvoiceId) {
      const existingInv = storage.getInvoiceById(quotation.convertedInvoiceId);
      if (existingInv) return existingInv;
    }

    const invoices = storage.getInvoices();
    const currentYear = new Date().getFullYear();
    const nextNum = String(invoices.length + 1).padStart(3, '0');
    const invoiceNumber = `INV-${currentYear}-${nextNum}`;

    // Map quotation items to invoice items
    const invoiceItems = quotation.items.map((qItem, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      serviceName: qItem.serviceName,
      price: qItem.unitPrice,
      quantity: qItem.quantity || 1
    }));

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      vehicleRegistration: quotation.vehicleRegistration,
      vehicleModel: quotation.vehicleModel,
      items: invoiceItems,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      grandTotal: quotation.grandTotal,
      paid: 0,
      due: quotation.grandTotal,
      status: 'Due',
      paymentMethod: 'Cash',
      notes: `Created from quotation ${quotation.quotationNumber}${quotation.notes ? ' | ' + quotation.notes : ''}`,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      convertedFromQuotation: true,
      createdAt: new Date().toISOString()
    };

    invoices.unshift(newInvoice);
    storage.saveInvoices(invoices);

    // Update customer visit count
    const customers = storage.getCustomers();
    const existingCust = customers.find(c => 
      (newInvoice.customerId && c.id === newInvoice.customerId) ||
      (c.phone && c.phone === newInvoice.customerPhone)
    );
    if (existingCust) {
      existingCust.totalVisits += 1;
      existingCust.lastServiceDate = newInvoice.date;
      storage.saveCustomers(customers);
    }

    // Mark quotation as Converted
    storage.updateQuotation(quotation.id, {
      status: 'Converted',
      convertedInvoiceId: newInvoice.id,
      convertedInvoiceNumber: newInvoice.invoiceNumber
    });

    return newInvoice;
  },

  // Job Cards
  getJobCards: (): JobCard[] => {
    return getFromStorage<JobCard[]>(KEYS.JOB_CARDS, initialJobCards);
  },
  saveJobCards: (jobCards: JobCard[]): void => {
    saveToStorage(KEYS.JOB_CARDS, jobCards);
  },
  getJobCardById: (id: string): JobCard | undefined => {
    return storage.getJobCards().find(j => j.id === id || j.jobCardNumber === id);
  },
  createJobCard: (data: Omit<JobCard, 'id' | 'createdAt'>): JobCard => {
    const jobCards = storage.getJobCards();
    const newJobCard: JobCard = {
      ...data,
      id: `jc-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    jobCards.unshift(newJobCard);
    storage.saveJobCards(jobCards);

    // If existing customer found, link vehicle if needed
    const customers = storage.getCustomers();
    const existingCust = customers.find(c => 
      (newJobCard.customerId && c.id === newJobCard.customerId) ||
      (c.phone && c.phone === newJobCard.customerPhone)
    );
    if (existingCust && newJobCard.vehicleRegistration) {
      if (!existingCust.vehicles.some(v => v.registrationNumber.toLowerCase() === newJobCard.vehicleRegistration.toLowerCase())) {
        existingCust.vehicles.push({
          id: `veh-${Date.now()}`,
          registrationNumber: newJobCard.vehicleRegistration,
          model: newJobCard.vehicleModel,
          mileage: newJobCard.mileage
        });
        storage.saveCustomers(customers);
      }
    }

    return newJobCard;
  },
  updateJobCard: (id: string, updates: Partial<JobCard>): JobCard | null => {
    const jobCards = storage.getJobCards();
    const idx = jobCards.findIndex(j => j.id === id);
    if (idx === -1) return null;
    jobCards[idx] = {
      ...jobCards[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    storage.saveJobCards(jobCards);
    return jobCards[idx];
  },
  updateJobCardStatus: (id: string, status: JobCardStatus): JobCard | null => {
    return storage.updateJobCard(id, { status });
  },
  deleteJobCard: (id: string): void => {
    const jobCards = storage.getJobCards().filter(j => j.id !== id);
    storage.saveJobCards(jobCards);
  },
  linkJobCardQuotation: (jobCardId: string, quotationId: string, quotationNumber: string): void => {
    storage.updateJobCard(jobCardId, { quotationId, quotationNumber });
  },
  linkJobCardInvoice: (jobCardId: string, invoiceId: string, invoiceNumber: string): void => {
    storage.updateJobCard(jobCardId, { invoiceId, invoiceNumber });
  },

  // Cash In
  getCashIn: (): CashIn[] => {
    return getFromStorage<CashIn[]>(KEYS.CASH_IN, initialCashIn);
  },
  saveCashIn: (cashInList: CashIn[]): void => {
    saveToStorage(KEYS.CASH_IN, cashInList);
  },
  addCashIn: (entry: Omit<CashIn, 'id' | 'createdAt'>): CashIn => {
    const list = storage.getCashIn();
    const newEntry: CashIn = {
      ...entry,
      id: `cin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    list.unshift(newEntry);
    storage.saveCashIn(list);

    // If type is 'Loan from MD', update loan records
    if (entry.type === 'Loan from MD') {
      const loans = storage.getLoanRecords();
      loans.unshift({
        id: `lr-${Date.now()}`,
        date: entry.date,
        time: entry.time,
        type: 'Received',
        amount: entry.amount,
        paymentMethod: entry.paymentMethod,
        note: entry.note || entry.description,
        createdAt: new Date().toISOString()
      });
      storage.saveLoanRecords(loans);
    }

    return newEntry;
  },
  deleteCashIn: (id: string): void => {
    const list = storage.getCashIn().filter(c => c.id !== id);
    storage.saveCashIn(list);
  },

  // Expenses
  getExpenses: (): Expense[] => {
    return getFromStorage<Expense[]>(KEYS.EXPENSES, initialExpenses);
  },
  saveExpenses: (expenses: Expense[]): void => {
    saveToStorage(KEYS.EXPENSES, expenses);
  },
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const expenses = storage.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    storage.saveExpenses(expenses);

    // If category is 'Loan Repayment', update loan records
    if (expense.category === 'Loan Repayment') {
      const loans = storage.getLoanRecords();
      loans.unshift({
        id: `lr-${Date.now()}`,
        date: expense.date,
        time: expense.time,
        type: 'Repayment',
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        note: expense.note || expense.description,
        createdAt: new Date().toISOString()
      });
      storage.saveLoanRecords(loans);
    }

    return newExpense;
  },
  deleteExpense: (id: string): void => {
    const expenses = storage.getExpenses().filter(e => e.id !== id);
    storage.saveExpenses(expenses);
  },

  // Loan Records & Summary
  getLoanRecords: (): LoanRecord[] => {
    return getFromStorage<LoanRecord[]>(KEYS.LOANS, initialLoanRecords);
  },
  saveLoanRecords: (records: LoanRecord[]): void => {
    saveToStorage(KEYS.LOANS, records);
  },
  getLoanSummary: (): LoanSummary => {
    const records = storage.getLoanRecords();
    const totalReceived = records
      .filter(r => r.type === 'Received')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalRepaid = records
      .filter(r => r.type === 'Repayment')
      .reduce((sum, r) => sum + r.amount, 0);
    return {
      totalReceived,
      totalRepaid,
      remaining: Math.max(0, totalReceived - totalRepaid)
    };
  },

  // Unified Transactions
  getTransactions: (): Transaction[] => {
    const cashInList = storage.getCashIn();
    const expenseList = storage.getExpenses();

    const inTransactions: Transaction[] = cashInList.map(c => ({
      id: `tx-in-${c.id}`,
      date: c.date,
      time: c.time,
      flow: 'IN',
      type: c.type,
      description: c.description,
      reference: c.reference,
      paymentMethod: c.paymentMethod,
      amount: c.amount,
      sourceId: c.id
    }));

    const outTransactions: Transaction[] = expenseList.map(e => ({
      id: `tx-out-${e.id}`,
      date: e.date,
      time: e.time,
      flow: 'OUT',
      type: e.category,
      description: e.description,
      reference: e.recipient,
      paymentMethod: e.paymentMethod,
      amount: e.amount,
      sourceId: e.id
    }));

    const combined = [...inTransactions, ...outTransactions];
    // Sort descending by date, then time
    return combined.sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      return b.time.localeCompare(a.time);
    });
  },

  // Computed Metrics
  getDashboardMetrics: (): DashboardMetrics => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"

    const cashInList = storage.getCashIn();
    const expenseList = storage.getExpenses();
    const customers = storage.getCustomers();
    const invoices = storage.getInvoices();
    const quotations = storage.getQuotations();
    const jobCards = storage.getJobCards();

    // Today's metrics
    const todayCashIn = cashInList
      .filter(c => c.date === todayStr)
      .reduce((sum, c) => sum + c.amount, 0);

    const todayCashOut = expenseList
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const todayNet = todayCashIn - todayCashOut;

    // This month metrics
    const monthIncome = cashInList
      .filter(c => c.date.startsWith(currentMonthStr))
      .reduce((sum, c) => sum + c.amount, 0);

    const monthExpenses = expenseList
      .filter(e => e.date.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + e.amount, 0);

    const monthNet = monthIncome - monthExpenses;

    const pendingQuotationsCount = quotations.filter(
      q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Accepted'
    ).length;

    const waitingJobCardsCount = jobCards.filter(j => j.status === 'Waiting').length;
    const inProgressJobCardsCount = jobCards.filter(j => j.status === 'In Progress').length;
    const activeJobCardsCount = waitingJobCardsCount + inProgressJobCardsCount;
    const completedTodayJobCardsCount = jobCards.filter(
      j => (j.status === 'Completed' || j.status === 'Delivered') && j.date === todayStr
    ).length;

    return {
      todayCashIn,
      todayCashOut,
      todayNet,
      monthIncome,
      monthExpenses,
      monthNet,
      totalCustomers: customers.length,
      totalActiveInvoices: invoices.length,
      pendingQuotationsCount,
      activeJobCardsCount,
      waitingJobCardsCount,
      inProgressJobCardsCount,
      completedTodayJobCardsCount
    };
  }
};
