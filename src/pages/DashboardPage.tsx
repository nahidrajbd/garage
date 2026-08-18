import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  Plus, 
  FileText, 
  Eye, 
  ArrowRight,
  Landmark,
  CheckCircle2,
  Clock,
  Car,
  ClipboardCheck,
  Wrench
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { InvoiceStatusBadge, JobCardStatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { DashboardMetrics, Transaction, Invoice, LoanSummary, JobCard } from '../types';
import { formatBDT } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger, openCashInModal, openExpenseModal, openPaymentModal } = useApp();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentJobCards, setRecentJobCards] = useState<JobCard[]>([]);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [m, txs, invs, jcs, loans] = await Promise.all([
          api.getDashboardMetrics(),
          api.getTransactions(),
          api.getInvoices(),
          api.getJobCards(),
          api.getLoanSummary()
        ]);
        setMetrics(m);
        setRecentTransactions(txs.slice(0, 5));
        setRecentInvoices(invs.slice(0, 4));
        setRecentJobCards(jcs.slice(0, 4));
        setLoanSummary(loans);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Workshop Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Arshi Automobile & Car Hub • Rajshahi, Bangladesh
          </p>
        </div>

        {/* 4 Prominent Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            type="button"
            onClick={openCashInModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>+ Cash In</span>
          </button>

          <button
            type="button"
            onClick={openExpenseModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
            <span>+ Expense</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/invoices/new')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ New Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300/80 rounded-xl transition-all active:scale-95"
          >
            <FileText className="w-4 h-4 text-gray-500 shrink-0" />
            <span>Invoices</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards - Today's Figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Today's Cash In"
          value={formatBDT(metrics?.todayCashIn ?? (metrics as any)?.totalIncome ?? 0)}
          subtitle="All incoming cash & online payments"
          icon={ArrowDownLeft}
          variant="success"
          onClick={openCashInModal}
        />

        <StatCard
          title="Today's Cash Out"
          value={formatBDT(metrics?.todayCashOut ?? (metrics as any)?.totalExpense ?? 0)}
          subtitle="Purchases, salaries & daily expenses"
          icon={ArrowUpRight}
          variant="danger"
          onClick={openExpenseModal}
        />

        <StatCard
          title="Today's Net Cash"
          value={formatBDT(
            metrics?.todayNet ?? 
            ((metrics?.todayCashIn ?? (metrics as any)?.totalIncome ?? 0) - (metrics?.todayCashOut ?? (metrics as any)?.totalExpense ?? 0))
          )}
          subtitle={
            (metrics?.todayNet ?? 0) >= 0 
              ? 'Positive daily cash balance' 
              : 'Negative daily cash balance'
          }
          icon={Wallet}
          variant={(metrics?.todayNet ?? 0) >= 0 ? 'primary' : 'warning'}
        />
      </div>

      {/* Monthly Summary Bar & MD Loan Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Performance */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                This Month Overview
              </h3>
              <p className="text-xs text-gray-500">Cumulative figures for current calendar month</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-[#C1121F] hover:underline inline-flex items-center gap-1"
            >
              Detailed Report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 py-4 text-center">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-semibold uppercase text-emerald-800 tracking-wider">Total Income</span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 font-heading mt-1">
                {formatBDT(metrics?.monthIncome ?? (metrics as any)?.totalIncome ?? 0)}
              </p>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
              <span className="text-[11px] font-semibold uppercase text-rose-800 tracking-wider">Total Expenses</span>
              <p className="text-lg sm:text-xl font-extrabold text-rose-700 font-heading mt-1">
                {formatBDT(metrics?.monthExpenses ?? (metrics as any)?.totalExpense ?? 0)}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] font-semibold uppercase text-gray-700 tracking-wider">Net Cash Flow</span>
              <p className={`text-lg sm:text-xl font-extrabold font-heading mt-1 ${
                (metrics?.monthNet ?? ((metrics?.monthIncome ?? (metrics as any)?.totalIncome ?? 0) - (metrics?.monthExpenses ?? (metrics as any)?.totalExpense ?? 0))) >= 0 ? 'text-gray-900' : 'text-rose-600'
              }`}>
                {formatBDT(
                  metrics?.monthNet ?? 
                  ((metrics?.monthIncome ?? (metrics as any)?.totalIncome ?? 0) - (metrics?.monthExpenses ?? (metrics as any)?.totalExpense ?? 0))
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>Active Customers: <strong className="text-gray-900">{metrics?.totalCustomers ?? 0}</strong></span>
            <span>Total Invoices: <strong className="text-gray-900">{metrics?.totalActiveInvoices ?? (metrics as any)?.totalInvoices ?? 0}</strong></span>
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Pending Quotations: <strong className="text-blue-700">{metrics?.pendingQuotationsCount ?? 0}</strong>
            </button>
          </div>
        </div>

        {/* Loan from MD Overview */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-gray-700" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                MD Loan Summary
              </h3>
            </div>
            <button
              onClick={() => navigate('/loans')}
              className="text-xs font-semibold text-[#C1121F] hover:underline"
            >
              Manage
            </button>
          </div>

          <div className="space-y-2.5 py-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Total Loan Received:</span>
              <span className="font-semibold text-gray-900">{formatBDT(loanSummary?.totalReceived ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Total Repaid:</span>
              <span className="font-semibold text-emerald-700">{formatBDT(loanSummary?.totalRepaid ?? 0)}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">Remaining Balance:</span>
              <span className="text-base font-extrabold text-amber-700 font-heading">
                {formatBDT(loanSummary?.remaining ?? 0)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 italic">
            * Owed to MD as capital financing
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Transactions & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-700" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Recent Transactions
              </h3>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs font-semibold text-[#C1121F] hover:underline inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Add your first Cash In or Expense to see it here."
            />
          ) : (
            <div className="divide-y divide-gray-100 mt-2">
              {recentTransactions.map(tx => {
                const isIncoming = tx.flow === 'IN' || (tx as any).type === 'INCOME' || (tx as any).category === 'Service Payment' || (tx as any).category === 'Other Income';
                const txTypeLabel = tx.type === 'INCOME' ? 'Income' : tx.type === 'EXPENSE' ? 'Expense' : tx.type;
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 px-2 rounded-xl transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isIncoming ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isIncoming ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          <span className="font-medium text-gray-700">{txTypeLabel}</span>
                          {tx.time && (
                            <>
                              <span>•</span>
                              <span>{tx.time}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="bg-gray-100 px-1.5 py-0.2 rounded text-[10px]">{tx.paymentMethod}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-sm sm:text-base font-extrabold font-heading ${
                        isIncoming ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {isIncoming ? '+' : '-'} {formatBDT(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-700" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Recent Invoices
              </h3>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs font-semibold text-[#C1121F] hover:underline inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <EmptyState
              title="No invoices created"
              description="Create customer invoices for vehicle service records."
              actionText="+ Create Invoice"
              onAction={() => navigate('/invoices/new')}
            />
          ) : (
            <div className="divide-y divide-gray-100 mt-2">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-2 hover:bg-gray-50/70 px-2 rounded-xl transition-colors">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {inv.invoiceNumber}
                      </span>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                    <p className="text-xs text-gray-700 font-medium truncate">
                      {inv.customerName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate">
                      <Car className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>{inv.vehicleModel}</span>
                      <span className="hidden sm:inline">({inv.vehicleRegistration})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">
                        {formatBDT(inv.grandTotal)}
                      </p>
                      {inv.due > 0 ? (
                        <p className="text-[10px] font-semibold text-rose-600">
                          Due: {formatBDT(inv.due)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-medium">Fully Paid</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {inv.due > 0 && (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(inv)}
                          title="Collect Due"
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                        >
                          Collect
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        title="View / Print"
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workshop Job Cards Overview & Recent Cards */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-[#C1121F]">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Workshop Floor Job Cards
              </h3>
              <p className="text-xs text-gray-500">Live technician activity & vehicle progress</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/job-cards/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-xl transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Job Card</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/job-cards')}
              className="text-xs font-semibold text-[#C1121F] hover:underline inline-flex items-center gap-1 ml-2"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Job Card Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-center">
            <span className="text-[11px] font-semibold uppercase text-blue-800 tracking-wider">Active Jobs</span>
            <p className="text-xl font-extrabold text-blue-900 mt-0.5">{metrics?.activeJobCardsCount ?? 0}</p>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <span className="text-[11px] font-semibold uppercase text-gray-600 tracking-wider">Waiting</span>
            <p className="text-xl font-extrabold text-gray-900 mt-0.5">{metrics?.waitingJobCardsCount ?? 0}</p>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100 text-center">
            <span className="text-[11px] font-semibold uppercase text-amber-800 tracking-wider">In Progress</span>
            <p className="text-xl font-extrabold text-amber-900 mt-0.5">{metrics?.inProgressJobCardsCount ?? 0}</p>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-center">
            <span className="text-[11px] font-semibold uppercase text-emerald-800 tracking-wider">Completed Today</span>
            <p className="text-xl font-extrabold text-emerald-900 mt-0.5">{metrics?.completedTodayJobCardsCount ?? 0}</p>
          </div>
        </div>

        {/* Recent Job Cards List */}
        {recentJobCards.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Recent Workshop Activity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentJobCards.map(jc => (
                <div
                  key={jc.id}
                  onClick={() => navigate(`/job-cards/${jc.id}`)}
                  className="p-3 bg-gray-50/70 hover:bg-gray-100/80 rounded-xl border border-gray-200/80 cursor-pointer transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">{jc.jobCardNumber}</span>
                      <JobCardStatusBadge status={jc.status} />
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {jc.vehicleModel} • {jc.customerName}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {jc.requiredWork.map(w => w.serviceName).join(', ') || 'General Inspection'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right text-xs">
                    <span className="text-[10px] text-gray-400 font-mono block">{jc.assignedTo}</span>
                    <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5 mt-1 hover:underline">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
