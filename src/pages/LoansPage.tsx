import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Info, 
  Plus, 
  Clock, 
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { PaymentMethodBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { LoanRecord, LoanSummary } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const LoansPage: React.FC = () => {
  const { refreshTrigger, openCashInModal, openExpenseModal } = useApp();

  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [loanRecords, setLoanRecords] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoanData = async () => {
      setLoading(true);
      try {
        const [sum, recs] = await Promise.all([
          api.getLoanSummary(),
          api.getLoanRecords()
        ]);
        setLoanSummary(sum);
        setLoanRecords(recs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoanData();
  }, [refreshTrigger]);

  const progressPercentage = loanSummary && loanSummary.totalReceived > 0 
    ? Math.round((loanSummary.totalRepaid / loanSummary.totalReceived) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Managing Director (MD) Loan Tracking
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Internal record of working capital financing provided by the MD and repayments made
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCashInModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>+ Receive MD Loan</span>
          </button>

          <button
            type="button"
            onClick={() => openExpenseModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>+ Repay MD Loan</span>
          </button>
        </div>
      </div>

      {/* Accounting Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-950">Accounting Principle:</p>
          <p className="leading-relaxed">
            Loan money injected by the Managing Director increases the garage's available cash reserves without inflating taxable business service income. Repayments reduce workshop cash while lowering outstanding liabilities.
          </p>
        </div>
      </div>

      {/* Loan Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Loan Received"
          value={formatBDT(loanSummary?.totalReceived ?? 0)}
          subtitle="Cumulative financing from MD"
          icon={Landmark}
          variant="primary"
        />

        <StatCard
          title="Total Repaid to MD"
          value={formatBDT(loanSummary?.totalRepaid ?? 0)}
          subtitle={`${progressPercentage}% of total financing cleared`}
          icon={CheckCircle2}
          variant="success"
        />

        <StatCard
          title="Remaining Balance Owed"
          value={formatBDT(loanSummary?.remaining ?? 0)}
          subtitle="Current liability to MD"
          icon={DollarSign}
          variant="warning"
        />
      </div>

      {/* Repayment Progress Meter */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-gray-800 uppercase tracking-wider">Repayment Progress:</span>
          <span className="font-mono font-bold text-gray-900">{progressPercentage}% Repaid ({formatBDT(loanSummary?.totalRepaid ?? 0)} / {formatBDT(loanSummary?.totalReceived ?? 0)})</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
            MD Loan Transaction History
          </h3>
          <span className="text-xs text-gray-400 font-mono">{loanRecords.length} records</span>
        </div>

        {loanRecords.length === 0 ? (
          <EmptyState
            title="No loan records"
            description="No loans or repayments have been recorded yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Date / Time</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Description / Note</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loanRecords.map(rec => {
                  const isReceived = rec.type === 'Received';
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{formatDate(rec.date)}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{rec.time}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isReceived
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isReceived ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-amber-600" />
                              <span>Loan Injected</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              <span>Loan Repaid</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{rec.note || (isReceived ? 'MD Capital Financing' : 'Loan Repayment Installment')}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PaymentMethodBadge method={rec.paymentMethod} />
                      </td>

                      <td className={`py-3.5 px-4 sm:px-6 text-right whitespace-nowrap font-heading font-extrabold text-sm sm:text-base ${
                        isReceived ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {isReceived ? '+' : '-'} {formatBDT(rec.amount)}
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
