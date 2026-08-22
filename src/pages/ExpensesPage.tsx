import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpRight, 
  Search, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Users, 
  Utensils, 
  Home, 
  Landmark 
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { PaymentMethodBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const ExpensesPage: React.FC = () => {
  const { refreshTrigger, openExpenseModal, showToast, triggerRefresh } = useApp();
  const { canDelete } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Delete dialog
  const [itemToDelete, setItemToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [expList, catList] = await Promise.all([
          api.getExpenses(),
          api.getExpenseCategories()
        ]);
        setExpenses(expList);
        setCategories(catList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const filteredList = useMemo(() => {
    return expenses.filter(item => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.description.toLowerCase().includes(searchLower) ||
        (item.recipient && item.recipient.toLowerCase().includes(searchLower)) ||
        (item.note && item.note.toLowerCase().includes(searchLower));

      // Category
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

      // Method
      const matchesMethod = methodFilter === 'ALL' || item.paymentMethod === methodFilter;

      // Date
      const matchesDate = !dateFilter || item.date === dateFilter;

      return matchesSearch && matchesCategory && matchesMethod && matchesDate;
    });
  }, [expenses, search, categoryFilter, methodFilter, dateFilter]);

  // Summaries
  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses]);
  const purchasesTotal = useMemo(() => 
    expenses.filter(i => i.category === 'Purchase').reduce((sum, i) => sum + i.amount, 0),
    [expenses]
  );
  const salaryTotal = useMemo(() => 
    expenses.filter(i => i.category === 'Salary').reduce((sum, i) => sum + i.amount, 0),
    [expenses]
  );
  const foodTotal = useMemo(() => 
    expenses.filter(i => i.category === 'Food').reduce((sum, i) => sum + i.amount, 0),
    [expenses]
  );
  const loanRepayTotal = useMemo(() => 
    expenses.filter(i => i.category === 'Loan Repayment').reduce((sum, i) => sum + i.amount, 0),
    [expenses]
  );

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteExpense(itemToDelete.id);
      showToast('Expense record deleted', 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete expense', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Workshop Expenses
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track daily workshop costs, inventory purchases, wages, and loan repayments
          </p>
        </div>

        <button
          type="button"
          onClick={openExpenseModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses"
          value={formatBDT(totalExpenses)}
          subtitle="All recorded cash out"
          icon={ArrowUpRight}
          variant="danger"
        />

        <StatCard
          title="Parts & Purchases"
          value={formatBDT(purchasesTotal)}
          subtitle="Oils, shampoos, spare parts"
          icon={ShoppingBag}
          variant="default"
        />

        <StatCard
          title="Salaries & Food"
          value={formatBDT(salaryTotal + foodTotal)}
          subtitle="Technician wages & meals"
          icon={Users}
          variant="default"
        />

        <StatCard
          title="Loan Repayments"
          value={formatBDT(loanRepayTotal)}
          subtitle="Capital returned to MD"
          icon={Landmark}
          variant="warning"
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
              placeholder="Search description, recipient, note..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
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
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
            title="No expense records found"
            description="No entries matched your current filter criteria."
            actionText="+ Record Expense"
            onAction={openExpenseModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Paid To</th>
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
                        item.category === 'Salary'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : item.category === 'Purchase'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.category === 'Food'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : item.category === 'Rent'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : item.category === 'Loan Repayment'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.note && <div className="text-[11px] text-gray-400 mt-0.5">{item.note}</div>}
                      {item.paidFromLoan && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Paid by MD (Loan)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                      {item.recipient || '-'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PaymentMethodBadge method={item.paymentMethod} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-rose-700 font-heading text-sm sm:text-base">
                      - {formatBDT(item.amount)}
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
        title="Delete Expense Entry"
        message={`Are you sure you want to delete this expense record of ${itemToDelete ? formatBDT(itemToDelete.amount) : ''}?`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};
