import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../common/ToastContainer';
import { AddCashInModal } from '../modals/AddCashInModal';
import { AddExpenseModal } from '../modals/AddExpenseModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { AddCustomerModal } from '../modals/AddCustomerModal';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      {/* Desktop Sidebar (hidden on print) */}
      <div className="hidden lg:flex shrink-0 no-print">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <AddCashInModal />
      <AddExpenseModal />
      <RecordPaymentModal />
      <AddCustomerModal />
      <ToastContainer />
    </div>
  );
};
