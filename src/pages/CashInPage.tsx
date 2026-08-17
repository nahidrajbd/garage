import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Calendar,
  CreditCard,
  Building2,
  Tag
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { PaymentMethodBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CashIn, CashInType, PaymentMethod } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const CashInPage: React.FC = () => {
  const { refreshTrigger, openCashInModal, showToast, triggerRefresh } = useApp();
  const { canDelete } = useAuth();

  const [cashInList, setCashInList] = useState<CashIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Delete dialog
  const [itemToDelete, setItemToDelete] = useState<CashIn | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await api.getCashIn();
        setCashInList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const filteredList = useMemo(() => {
    return cashInList.filter(item => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.description.toLowerCase().includes(searchLower) ||
        (item.reference && item.reference.toLowerCase().includes(searchLower)) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchLower)) ||
        (item.vehicleInfo && item.vehicleInfo.toLowerCase().includes(searchLower));

      // Type
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;

      // Method
      const matchesMethod = methodFilter === 'ALL' || item.paymentMethod === methodFilter;

      // Date
      const matchesDate = !dateFilter || item.date === dateFilter;

      return matchesSearch && matchesType && matchesMethod && matchesDate;
    });
  }, [cashInList, search, typeFilter, methodFilter, dateFilter]);

  // Summaries
  const totalIn = useMemo(() => cashInList.reduce((sum, item) => sum + item.amount, 0), [cashInList]);
  const servicePaymentTotal = useMemo(() => 
    cashInList.filter(i => i.type === 'Service Payment').reduce((sum, i) => sum + i.amount, 0),
    [cashInList]
  );
  const mdLoanTotal = useMemo(() => 
    cashInList.filter(i => i.type === 'Loan from MD').reduce((sum, i) => sum + i.amount, 0),
    [cashInList]
  );
  const otherTotal = useMemo(() => 
    cashInList.filter(i => i.type === 'Other Income').reduce((sum, i) => sum + i.amount, 0),
    [cashInList]
  );

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteCashIn(itemToDelete.id);
      showToast('Cash In entry deleted', 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete entry', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Cash In Records
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track all cash and electronic inflows from services, MD loans, and other income
          </p>
        </div>

        <button
          type="button"
          onClick={openCashInModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Cash In</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cash In"
          value={formatBDT(totalIn)}
          subtitle="All recorded inflows"
          icon={ArrowDownLeft}
          variant="success"
        />

        <StatCard
          title="Service Payments"
          value={formatBDT(servicePaymentTotal)}
          subtitle="Workshop repair & wash income"
          icon={Tag}
          variant="default"
        />

        <StatCard
          title="MD Loan Inflows"
          value={formatBDT(mdLoanTotal)}
          subtitle="Capital injections from MD"
          icon={Building2}
          variant="warning"
        />

        <StatCard
          title="Other Income"
          value={formatBDT(otherTotal)}
          subtitle="Scrap, miscellaneous sales"
          icon={CreditCard}
          variant="default"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description, ref, vehicle..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Inflow Types</option>
              <option value="Service Payment">Service Payment</option>
              <option value="Loan from MD">Loan from MD</option>
              <option value="Other Income">Other Income</option>
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs text-gray-500 hover:text-gray-900 underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table of Records */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredList.length === 0 ? (
          <EmptyState
            title="No cash in records found"
            description="No entries matched your current filter criteria."
            actionText="+ Record Cash In"
            onAction={openCashInModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatDate(item.date)}</div>
                      <div className="text-[11px] text-gray-400">{item.time}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        item.type === 'Service Payment'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.type === 'Loan from MD'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {item.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.note && <div className="text-[11px] text-gray-400 mt-0.5">{item.note}</div>}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {item.reference || '-'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PaymentMethodBadge method={item.paymentMethod} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-emerald-700 font-heading text-sm sm:text-base">
                      + {formatBDT(item.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Cash In Entry"
        message={`Are you sure you want to delete the cash in entry of ${itemToDelete ? formatBDT(itemToDelete.amount) : ''}? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};
