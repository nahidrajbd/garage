import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  PieChart, 
  Wallet, 
  CheckCircle2, 
  Landmark,
  Layers
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { CashIn, Expense, Invoice } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { refreshTrigger } = useApp();

  const [cashInList, setCashInList] = useState<CashIn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Month selector (YYYY-MM)
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Daily report selected date
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cList, eList, iList] = await Promise.all([
          api.getCashIn(),
          api.getExpenses(),
          api.getInvoices()
        ]);
        setCashInList(cList);
        setExpenses(eList);
        setInvoices(iList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  // DAILY REPORT DATA
  const dayInflow = useMemo(() => 
    cashInList.filter(c => c.date === selectedDay).reduce((s, c) => s + c.amount, 0),
    [cashInList, selectedDay]
  );
  const dayOutflow = useMemo(() => 
    expenses.filter(e => e.date === selectedDay).reduce((s, e) => s + e.amount, 0),
    [expenses, selectedDay]
  );
  const dayNet = dayInflow - dayOutflow;

  // MONTHLY REPORT DATA
  const monthlyCashIn = useMemo(() => 
    cashInList.filter(c => c.date.startsWith(selectedMonth)),
    [cashInList, selectedMonth]
  );
  const monthlyExpenses = useMemo(() => 
    expenses.filter(e => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const monthServiceIncome = useMemo(() => 
    monthlyCashIn.filter(c => c.type === 'Service Payment').reduce((s, c) => s + c.amount, 0),
    [monthlyCashIn]
  );
  const monthOtherIncome = useMemo(() => 
    monthlyCashIn.filter(c => c.type === 'Other Income').reduce((s, c) => s + c.amount, 0),
    [monthlyCashIn]
  );
  const monthMDLoans = useMemo(() => 
    monthlyCashIn.filter(c => c.type === 'Loan from MD').reduce((s, c) => s + c.amount, 0),
    [monthlyCashIn]
  );
  const monthTotalIncome = monthServiceIncome + monthOtherIncome; // Real business earnings
  const monthTotalExpenses = useMemo(() => 
    monthlyExpenses.reduce((s, e) => s + e.amount, 0),
    [monthlyExpenses]
  );
  const monthNetCashFlow = (monthTotalIncome + monthMDLoans) - monthTotalExpenses;

  // LAST 30 DAYS DAILY REPORT TABLE
  const dailyReportRows = useMemo(() => {
    const days: {
      date: string;
      cashIn: number;
      cashOut: number;
      loanIn: number;
      loanOut: number;
      invoiceCount: number;
    }[] = [];

    const todayDhaka = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    for (let i = 0; i < 30; i++) {
      const d = new Date(`${todayDhaka}T00:00:00`);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');

      const dayCashIn = cashInList.filter(c => c.date === dateStr);
      const dayExpenses = expenses.filter(e => e.date === dateStr);
      // Use createdAt (when the invoice was actually made), not the editable
      // invoice date on the document, so backdated invoices don't skew the count.
      const dayInvoices = invoices.filter(inv => {
        const createdDate = new Date(inv.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        return createdDate === dateStr;
      });

      days.push({
        date: dateStr,
        cashIn: dayCashIn.filter(c => c.type !== 'Loan from MD').reduce((s, c) => s + c.amount, 0),
        cashOut: dayExpenses.filter(e => e.category !== 'Loan Repayment').reduce((s, e) => s + e.amount, 0),
        loanIn: dayCashIn.filter(c => c.type === 'Loan from MD').reduce((s, c) => s + c.amount, 0),
        loanOut: dayExpenses.filter(e => e.category === 'Loan Repayment').reduce((s, e) => s + e.amount, 0),
        invoiceCount: dayInvoices.length
      });
    }
    return days;
  }, [cashInList, expenses, invoices]);

  const dailyReportTotals = useMemo(() => dailyReportRows.reduce(
    (acc, r) => ({
      cashIn: acc.cashIn + r.cashIn,
      cashOut: acc.cashOut + r.cashOut,
      loanIn: acc.loanIn + r.loanIn,
      loanOut: acc.loanOut + r.loanOut,
      invoiceCount: acc.invoiceCount + r.invoiceCount
    }),
    { cashIn: 0, cashOut: 0, loanIn: 0, loanOut: 0, invoiceCount: 0 }
  ), [dailyReportRows]);

  // Expense Breakdown
  const expenseBreakdown = useMemo(() => {
    const categories = ['Salary', 'Purchase', 'Food', 'Rent', 'Loan Repayment', 'Other'];
    const total = monthlyExpenses.reduce((s, e) => s + e.amount, 0);

    return categories.map(cat => {
      const catAmount = monthlyExpenses
        .filter(e => e.category === cat)
        .reduce((s, e) => s + e.amount, 0);
      const percentage = total > 0 ? Math.round((catAmount / total) * 100) : 0;
      return {
        category: cat,
        amount: catAmount,
        percentage
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [monthlyExpenses]);

  // Available months list for picker
  const monthOptions = [
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-06', label: 'June 2026' },
    { value: '2026-05', label: 'May 2026' },
    { value: '2026-04', label: 'April 2026' },
    { value: '2026-03', label: 'March 2026' },
    { value: '2026-02', label: 'February 2026' },
    { value: '2026-01', label: 'January 2026' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Financial Performance & Reports
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Clean daily and monthly cash flow metrics, category breakdowns, and revenue tracking
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-xs sm:text-sm font-semibold px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-white"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Daily Report Section */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Daily Cash Flow Statement
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Select Day:</span>
            <input
              type="date"
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Total Cash In ({formatDate(selectedDay)})
            </span>
            <p className="text-2xl font-extrabold text-emerald-700 font-heading mt-1.5">
              {formatBDT(dayInflow)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Total Cash Out ({formatDate(selectedDay)})
            </span>
            <p className="text-2xl font-extrabold text-rose-700 font-heading mt-1.5">
              {formatBDT(dayOutflow)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Net Cash Flow
            </span>
            <p className={`text-2xl font-extrabold font-heading mt-1.5 ${
              dayNet >= 0 ? 'text-gray-900' : 'text-rose-600'
            }`}>
              {formatBDT(dayNet)}
            </p>
          </div>
        </div>
      </div>

      {/* Last 30 Days Daily Report Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Layers className="w-4 h-4 text-[#C1121F]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
            Last 30 Days — Daily Report
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Date / Day</th>
                <th className="py-2.5 px-3 text-right">Cash In</th>
                <th className="py-2.5 px-3 text-right">Cash Out</th>
                <th className="py-2.5 px-3 text-right">Loan In</th>
                <th className="py-2.5 px-3 text-right">Loan Out</th>
                <th className="py-2.5 px-3 text-right"># Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyReportRows.map(row => {
                const isToday = row.date === todayStr;
                return (
                  <tr key={row.date} className={isToday ? 'bg-red-50/40' : 'hover:bg-gray-50/80'}>
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-gray-800">
                      {new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {isToday && <span className="ml-1.5 text-[10px] font-bold text-[#C1121F]">TODAY</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700">
                      {row.cashIn > 0 ? formatBDT(row.cashIn) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700">
                      {row.cashOut > 0 ? formatBDT(row.cashOut) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-700">
                      {row.loanIn > 0 ? formatBDT(row.loanIn) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-700">
                      {row.loanOut > 0 ? formatBDT(row.loanOut) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-700">
                      {row.invoiceCount || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                <td className="py-2.5 px-3">30-Day Total</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatBDT(dailyReportTotals.cashIn)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-700">{formatBDT(dailyReportTotals.cashOut)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-blue-700">{formatBDT(dailyReportTotals.loanIn)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-amber-700">{formatBDT(dailyReportTotals.loanOut)}</td>
                <td className="py-2.5 px-3 text-right">{dailyReportTotals.invoiceCount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Monthly Report Overview */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <BarChart3 className="w-4 h-4 text-[#C1121F]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
            Monthly Financial Summary ({monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Service Revenue</span>
            <p className="text-xl font-extrabold text-gray-900 font-heading mt-1">{formatBDT(monthServiceIncome)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Workshop repairs & cleaning</p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Other Incomes</span>
            <p className="text-xl font-extrabold text-gray-900 font-heading mt-1">{formatBDT(monthOtherIncome)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Scrap & secondary sales</p>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Total Expenses</span>
            <p className="text-xl font-extrabold text-rose-700 font-heading mt-1">{formatBDT(monthTotalExpenses)}</p>
            <p className="text-[11px] text-rose-600/80 mt-0.5">All operating costs</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Net Month Balance</span>
            <p className="text-xl font-extrabold text-emerald-700 font-heading mt-1">{formatBDT(monthNetCashFlow)}</p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">Retained operational cash</p>
          </div>
        </div>
      </div>

      {/* 3. Expense Breakdown by Category */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Expense Distribution by Category
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Total Spent: <strong className="text-gray-900">{formatBDT(monthTotalExpenses)}</strong>
          </span>
        </div>

        {monthTotalExpenses === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No expenses recorded for this month.</p>
        ) : (
          <div className="space-y-4 pt-1">
            {expenseBreakdown.map(item => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{item.category}</span>
                    <span className="text-gray-400 font-mono text-[11px]">({item.percentage}%)</span>
                  </div>
                  <span className="font-bold font-mono text-gray-900">{formatBDT(item.amount)}</span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      item.category === 'Salary'
                        ? 'bg-purple-600'
                        : item.category === 'Purchase'
                        ? 'bg-blue-600'
                        : item.category === 'Rent'
                        ? 'bg-rose-600'
                        : item.category === 'Loan Repayment'
                        ? 'bg-amber-600'
                        : item.category === 'Food'
                        ? 'bg-emerald-600'
                        : 'bg-gray-600'
                    }`}
                    style={{ width: `${Math.max(item.percentage, item.amount > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
