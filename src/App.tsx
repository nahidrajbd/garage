import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { CoverPage } from './pages/CoverPage';
import { DashboardPage } from './pages/DashboardPage';
import { MessagesPage } from './pages/MessagesPage';
import { JobCardsPage } from './pages/JobCardsPage';
import { CreateJobCardPage } from './pages/CreateJobCardPage';
import { JobCardDetailsPage } from './pages/JobCardDetailsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { CreateQuotationPage } from './pages/CreateQuotationPage';
import { QuotationDetailsPage } from './pages/QuotationDetailsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { InvoiceDetailsPage } from './pages/InvoiceDetailsPage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryPage } from './pages/InventoryPage';
import { CashInPage } from './pages/CashInPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { LoansPage } from './pages/LoansPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Workspace Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CoverPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="messages/:id" element={<MessagesPage />} />
              <Route path="job-cards" element={<JobCardsPage />} />
              <Route path="job-cards/new" element={<CreateJobCardPage />} />
              <Route path="job-cards/:id" element={<JobCardDetailsPage />} />
              <Route path="job-cards/edit/:id" element={<CreateJobCardPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="quotations/new" element={<CreateQuotationPage />} />
              <Route path="quotations/:id" element={<QuotationDetailsPage />} />
              <Route path="quotations/edit/:id" element={<CreateQuotationPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<CreateInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetailsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="cash-in" element={<CashInPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="loans" element={<LoansPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
