import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Invoice, Expense } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  // Modals
  isCashInModalOpen: boolean;
  openCashInModal: () => void;
  closeCashInModal: () => void;
  isExpenseModalOpen: boolean;
  editingExpense: Expense | null;
  openExpenseModal: (expense?: Expense) => void;
  closeExpenseModal: () => void;
  isCustomerModalOpen: boolean;
  openCustomerModal: () => void;
  closeCustomerModal: () => void;
  // Due payment modal
  paymentModalInvoice: Invoice | null;
  openPaymentModal: (invoice: Invoice) => void;
  closePaymentModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCashInModalOpen, setIsCashInModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openCashInModal = () => setIsCashInModalOpen(true);
  const closeCashInModal = () => setIsCashInModalOpen(false);

  const openExpenseModal = (expense?: Expense) => {
    setEditingExpense(expense || null);
    setIsExpenseModalOpen(true);
  };
  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const openCustomerModal = () => setIsCustomerModalOpen(true);
  const closeCustomerModal = () => setIsCustomerModalOpen(false);

  const openPaymentModal = (invoice: Invoice) => setPaymentModalInvoice(invoice);
  const closePaymentModal = () => setPaymentModalInvoice(null);

  return (
    <AppContext.Provider
      value={{
        refreshTrigger,
        triggerRefresh,
        toasts,
        showToast,
        dismissToast,
        isCashInModalOpen,
        openCashInModal,
        closeCashInModal,
        isExpenseModalOpen,
        editingExpense,
        openExpenseModal,
        closeExpenseModal,
        isCustomerModalOpen,
        openCustomerModal,
        closeCustomerModal,
        paymentModalInvoice,
        openPaymentModal,
        closePaymentModal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
