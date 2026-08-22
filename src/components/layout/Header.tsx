import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FilePlus2,
  Calendar,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const { openCashInModal, openExpenseModal } = useApp();
  const { user, isSuperAdmin, logout } = useAuth();

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between shadow-2xs no-print">
      {/* Left: Mobile menu toggle & Date badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{todayDisplay}</span>
        </div>
      </div>

      {/* Right: Quick Action Buttons & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* + Cash In */}
        <button
          type="button"
          onClick={openCashInModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors active:scale-98 cursor-pointer"
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          <span className="hidden xs:inline">+</span> Cash In
        </button>

        {/* + Expense */}
        <button
          type="button"
          onClick={() => openExpenseModal()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors active:scale-98 cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <span className="hidden xs:inline">+</span> Expense
        </button>

        {/* + New Invoice */}
        <button
          type="button"
          onClick={() => navigate('/invoices/new')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-lg shadow-xs transition-colors active:scale-98 cursor-pointer"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>New Invoice</span>
        </button>

        {/* User Role Badge & Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 sm:pl-3 ml-1 sm:ml-2 border-l border-gray-200">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-gray-800 leading-tight">
                {user.name}
              </span>
              <span className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded-sm ${
                isSuperAdmin 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {isSuperAdmin ? 'Super Admin' : 'Staff'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={`Logged in as ${user.name} (${user.role}). Click to sign out.`}
              className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors border border-gray-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
