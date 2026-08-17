import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Users,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  BarChart3,
  Landmark,
  Settings as SettingsIcon,
  Wrench,
  Phone,
  MapPin,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  onNavClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavClick }) => {
  const { user, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Job Cards', path: '/job-cards', icon: ClipboardCheck },
    { label: 'Quotations', path: '/quotations', icon: ClipboardList },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Inventory', path: '/inventory', icon: Package },
    { label: 'Cash In', path: '/cash-in', icon: ArrowDownLeft, color: 'text-emerald-500' },
    { label: 'Expenses', path: '/expenses', icon: ArrowUpRight, color: 'text-rose-500' },
    { label: 'Transactions', path: '/transactions', icon: Receipt },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Loans', path: '/loans', icon: Landmark },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-[#1F1F1F] text-gray-200 flex flex-col h-full border-r border-neutral-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C1121F] flex items-center justify-center text-white shadow-md shadow-red-900/30 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-heading font-extrabold text-sm tracking-wide text-white leading-tight uppercase">
              Arshi Automobile
            </h1>
            <p className="text-[11px] text-gray-400 font-medium tracking-wider uppercase">
              & Car Hub
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C1121F] text-white shadow-sm font-semibold'
                    : 'text-gray-300 hover:bg-neutral-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Session & Logout Footer */}
      {user && (
        <div className="p-3 border-t border-neutral-800 bg-neutral-900/90 m-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
              isSuperAdmin ? 'bg-red-700' : 'bg-blue-700'
            }`}>
              {isSuperAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                {isSuperAdmin ? 'Super Admin' : 'Staff'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
