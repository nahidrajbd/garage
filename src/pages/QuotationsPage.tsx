import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Eye, 
  Printer, 
  Trash2, 
  ArrowRight,
  Clock, 
  CheckCircle2, 
  XCircle,
  FileCheck2,
  Calendar,
  Car
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { QuotationStatusBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Quotation, QuotationStatus } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const QuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger, showToast, triggerRefresh } = useApp();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Deletion
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const data = await api.getQuotations();
        setQuotations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotations();
  }, [refreshTrigger]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(qt => {
      const q = search.toLowerCase();
      const matchesSearch = 
        qt.quotationNumber.toLowerCase().includes(q) ||
        qt.customerName.toLowerCase().includes(q) ||
        qt.customerPhone.toLowerCase().includes(q) ||
        qt.vehicleRegistration.toLowerCase().includes(q) ||
        qt.vehicleModel.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || qt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter]);

  // Summaries
  const totalCount = quotations.length;
  const pendingCount = quotations.filter(q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Accepted').length;
  const convertedCount = quotations.filter(q => q.status === 'Converted').length;
  const acceptedCount = quotations.filter(q => q.status === 'Accepted').length;

  const handleDelete = async () => {
    if (!quotationToDelete) return;
    try {
      await api.deleteQuotation(quotationToDelete.id);
      showToast(`Quotation ${quotationToDelete.quotationNumber} deleted`, 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete quotation', 'error');
    }
  };

  const handleConvert = async (e: React.MouseEvent, qtId: string) => {
    e.stopPropagation();
    try {
      const inv = await api.convertQuotationToInvoice(qtId);
      if (inv) {
        showToast(`Quotation converted to Invoice ${inv.invoiceNumber}!`, 'success');
        triggerRefresh();
        navigate(`/invoices/${inv.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to convert quotation', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Quotation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Quotations & Estimates
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Create, print, and track vehicle repair cost estimates before converting them to invoices
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/quotations/new')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Quotation</span>
        </button>
      </div>

      {/* Metric Cards (Non-financial metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Quotations"
          value={totalCount}
          subtitle="All created estimates"
          icon={ClipboardList}
          variant="default"
        />

        <StatCard
          title="Pending / Active"
          value={pendingCount}
          subtitle="Draft, Sent & Accepted"
          icon={Clock}
          variant="warning"
        />

        <StatCard
          title="Accepted & Ready"
          value={acceptedCount}
          subtitle="Awaiting conversion to invoice"
          icon={CheckCircle2}
          variant="success"
        />

        <StatCard
          title="Converted to Invoice"
          value={convertedCount}
          subtitle={`${totalCount > 0 ? Math.round((convertedCount / totalCount) * 100) : 0}% conversion rate`}
          icon={FileCheck2}
          variant="primary"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotation #, customer, phone, or vehicle..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          {['ALL', 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <EmptyState
            title="No quotations found"
            description="No quotations match your search query or selected filter."
            actionText="+ Create New Quotation"
            onAction={() => navigate('/quotations/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Quotation No.</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4 text-right">Estimate Total</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuotations.map(qt => (
                  <tr key={qt.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/quotations/${qt.id}`)}
                        className="font-mono font-bold text-gray-900 hover:text-[#C1121F] hover:underline"
                      >
                        {qt.quotationNumber}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {qt.items.length} {qt.items.length === 1 ? 'service item' : 'service items'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                      {formatDate(qt.date)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{qt.customerName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{qt.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{qt.vehicleModel}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{qt.vehicleRegistration}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-gray-900">
                      {formatBDT(qt.grandTotal)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 text-xs">
                      {formatDate(qt.validUntil)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <QuotationStatusBadge status={qt.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {qt.status !== 'Converted' ? (
                          <button
                            type="button"
                            onClick={(e) => handleConvert(e, qt.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Convert into Billable Invoice"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (qt.convertedInvoiceId) navigate(`/invoices/${qt.convertedInvoiceId}`);
                            }}
                            className="px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                            title="View Converted Invoice"
                          >
                            {qt.convertedInvoiceNumber || 'Invoice'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/quotations/${qt.id}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View / Print Quotation"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuotationToDelete(qt)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        isOpen={!!quotationToDelete}
        onClose={() => setQuotationToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation ${quotationToDelete?.quotationNumber} for ${quotationToDelete?.customerName}?`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};
