import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Calendar, 
  Filter,
  CreditCard
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { PaymentMethodBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Transaction } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

type TimeRangeFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const TransactionsPage: React.FC = () => {
  const { refreshTrigger, openCashInModal, openExpenseModal } = useApp();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const data = await api.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [refreshTrigger]);

  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // This week (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    // This month (YYYY-MM)
    const currentMonth = todayStr.substring(0, 7);

    return transactions.filter(tx => {
      // Search
      const q = search.toLowerCase();
      const matchesSearch = 
        tx.description.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q) ||
        (tx.reference && tx.reference.toLowerCase().includes(q));

      // Flow
      const matchesFlow = flowFilter === 'ALL' || tx.flow === flowFilter;

      // Time Range
      let matchesTime = true;
      if (timeRange === 'TODAY') {
        matchesTime = tx.date === todayStr;
      } else if (timeRange === 'YESTERDAY') {
        matchesTime = tx.date === yesterdayStr;
      } else if (timeRange === 'THIS_WEEK') {
        matchesTime = tx.date >= sevenDaysAgo && tx.date <= todayStr;
      } else if (timeRange === 'THIS_MONTH') {
        matchesTime = tx.date.startsWith(currentMonth);
      } else if (timeRange === 'CUSTOM' && customDate) {
        matchesTime = tx.date === customDate;
      }

      return matchesSearch && matchesFlow && matchesTime;
    });
  }, [transactions, search, flowFilter, timeRange, customDate]);

  // Summaries based on filtered list
  const totalIn = useMemo(() => 
    filteredTransactions.filter(t => t.flow === 'IN').reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const totalOut = useMemo(() => 
    filteredTransactions.filter(t => t.flow === 'OUT').reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const netBalance = totalIn - totalOut;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Financial Transactions Log
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Unified chronological audit trail of all workshop cash inflows and outflows
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCashInModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>+ Cash In</span>
          </button>

          <button
            type="button"
            onClick={openExpenseModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>+ Expense</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics for filtered view */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Inflow (+)"
          value={formatBDT(totalIn)}
          subtitle={`${filteredTransactions.filter(t => t.flow === 'IN').length} incoming payments`}
          icon={ArrowDownLeft}
          variant="success"
        />

        <StatCard
          title="Total Outflow (-)"
          value={formatBDT(totalOut)}
          subtitle={`${filteredTransactions.filter(t => t.flow === 'OUT').length} expense payments`}
          icon={ArrowUpRight}
          variant="danger"
        />

        <StatCard
          title="Net Cash Position"
          value={formatBDT(netBalance)}
          subtitle="Inflows minus Outflows"
          icon={Receipt}
          variant={netBalance >= 0 ? 'primary' : 'warning'}
        />
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        {/* Quick Date Presets */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Period:</span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'CUSTOM', label: 'Custom Date' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimeRange(p.id as TimeRangeFilter)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === p.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}
        </div>

        {/* Search & Flow Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description, category, or reference..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFlowFilter('ALL')}
              className={`py-1.5 text-xs font-semibold rounded-lg text-center ${
                flowFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Flows
            </button>
            <button
              type="button"
              onClick={() => setFlowFilter('IN')}
              className={`py-1.5 text-xs font-semibold rounded-lg text-center ${
                flowFilter === 'IN' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              + In Only
            </button>
            <button
              type="button"
              onClick={() => setFlowFilter('OUT')}
              className={`py-1.5 text-xs font-semibold rounded-lg text-center ${
                flowFilter === 'OUT' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              - Out Only
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No transactions match your current date and flow filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Date / Time</th>
                  <th className="py-3.5 px-4">Flow</th>
                  <th className="py-3.5 px-4">Type / Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(tx => {
                  const isIncoming = tx.flow === 'IN';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{formatDate(tx.date)}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{tx.time}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          isIncoming ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isIncoming ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                          <span>{isIncoming ? 'CASH IN' : 'CASH OUT'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-800">
                        {tx.type}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{tx.description}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {tx.reference || '-'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PaymentMethodBadge method={tx.paymentMethod} />
                      </td>

                      <td className={`py-3.5 px-4 sm:px-6 text-right whitespace-nowrap font-heading font-extrabold text-sm sm:text-base ${
                        isIncoming ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {isIncoming ? '+' : '-'} {formatBDT(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
