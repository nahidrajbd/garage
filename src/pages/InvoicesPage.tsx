import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Printer, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Car,
  User,
  Phone
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { InvoiceStatusBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Invoice, InvoiceStatus } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger, openPaymentModal, showToast, triggerRefresh } = useApp();
  const { canDelete } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Deletion
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const data = await api.getInvoices();
        setInvoices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [refreshTrigger]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = search.toLowerCase();
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.toLowerCase().includes(q) ||
        inv.vehicleRegistration.toLowerCase().includes(q) ||
        inv.vehicleModel.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  // Summaries
  const totalBilled = useMemo(() => invoices.reduce((sum, i) => sum + i.grandTotal, 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((sum, i) => sum + i.paid, 0), [invoices]);
  const totalDue = useMemo(() => invoices.reduce((sum, i) => sum + i.due, 0), [invoices]);
  const dueCount = useMemo(() => invoices.filter(i => i.status === 'Due' || i.status === 'Partial').length, [invoices]);

  const handleDelete = async () => {
    if (!invoiceToDelete) return;
    try {
      await api.deleteInvoice(invoiceToDelete.id);
      showToast(`Invoice ${invoiceToDelete.invoiceNumber} deleted`, 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete invoice', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Invoice Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Customer Invoices
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage billing, service receipts, paid amounts and outstanding customer dues
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/invoices/new')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Invoice</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Billed"
          value={formatBDT(totalBilled)}
          subtitle={`${invoices.length} total invoices`}
          icon={FileText}
          variant="default"
        />

        <StatCard
          title="Total Collected"
          value={formatBDT(totalPaid)}
          subtitle="Cleared payments"
          icon={CheckCircle2}
          variant="success"
        />

        <StatCard
          title="Total Due / Receivable"
          value={formatBDT(totalDue)}
          subtitle={`${dueCount} unpaid or partial invoices`}
          icon={AlertCircle}
          variant="danger"
        />

        <StatCard
          title="Collection Rate"
          value={totalBilled > 0 ? `${Math.round((totalPaid / totalBilled) * 100)}%` : '100%'}
          subtitle="Realized revenue ratio"
          icon={Clock}
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
            placeholder="Search invoice #, customer name, phone, or vehicle..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          {['ALL', 'Paid', 'Partial', 'Due'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {status === 'ALL' ? 'All Statuses' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="No invoices match your search query or selected filter."
            actionText="+ Create New Invoice"
            onAction={() => navigate('/invoices/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Invoice #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Paid</th>
                  <th className="py-3.5 px-4 text-right">Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="font-mono font-bold text-gray-900 hover:text-[#C1121F] hover:underline"
                      >
                        {inv.invoiceNumber}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {inv.items.length} {inv.items.length === 1 ? 'service' : 'services'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                      {formatDate(inv.date)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{inv.customerName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{inv.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{inv.vehicleModel}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{inv.vehicleRegistration}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-gray-900">
                      {formatBDT(inv.grandTotal)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium text-emerald-700">
                      {formatBDT(inv.paid)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold">
                      {inv.due > 0 ? (
                        <span className="text-rose-600 font-extrabold">{formatBDT(inv.due)}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">৳0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {inv.due > 0 && (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(inv)}
                            className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                            title="Collect Due Payment"
                          >
                            Collect
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoiceToDelete?.invoiceNumber} for ${invoiceToDelete?.customerName}?`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};
