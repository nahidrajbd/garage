import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Printer, 
  ArrowLeft, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Send, 
  ArrowRight, 
  FileText, 
  Wrench, 
  Phone, 
  MapPin, 
  FileCheck2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { QuotationStatusBadge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Quotation, Settings, QuotationStatus } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';

export const QuotationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, triggerRefresh, refreshTrigger } = useApp();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [qt, sett] = await Promise.all([
          api.getQuotationById(id),
          api.getSettings()
        ]);
        if (qt) setQuotation(qt);
        if (sett) setSettings(sett);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, refreshTrigger]);

  // Auto-trigger print if requested via query param
  useEffect(() => {
    if (searchParams.get('print') === 'true' && quotation) {
      setTimeout(() => {
        window.print();
      }, 400);
    }
  }, [searchParams, quotation]);

  const handleUpdateStatus = async (newStatus: QuotationStatus) => {
    if (!quotation) return;
    try {
      const updated = await api.updateQuotationStatus(quotation.id, newStatus);
      if (updated) {
        setQuotation(updated);
        showToast(`Quotation status updated to ${newStatus}`, 'success');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleConvert = async () => {
    if (!quotation) return;
    setIsConverting(true);
    try {
      const newInvoice = await api.convertQuotationToInvoice(quotation.id);
      if (newInvoice) {
        showToast(`Quotation successfully converted to Invoice ${newInvoice.invoiceNumber}!`, 'success');
        triggerRefresh();
        navigate(`/invoices/${newInvoice.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to convert quotation', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm">Loading quotation details...</div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4 max-w-md mx-auto">
        <FileText className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Quotation Not Found</h3>
        <p className="text-xs text-gray-500">The requested quotation ID could not be retrieved.</p>
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] rounded-lg"
        >
          Back to Quotations
        </button>
      </div>
    );
  }

  const isConverted = quotation.status === 'Converted';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotations</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Status Buttons (if not converted) */}
          {!isConverted && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {quotation.status !== 'Sent' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('Sent')}
                  className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-white rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Mark Sent</span>
                </button>
              )}
              {quotation.status !== 'Accepted' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('Accepted')}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-white rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Accepted</span>
                </button>
              )}
              {quotation.status !== 'Rejected' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('Rejected')}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-white rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              )}
            </div>
          )}

          {/* Edit button if not converted */}
          {!isConverted && (
            <button
              type="button"
              onClick={() => navigate(`/quotations/edit/${quotation.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-gray-500" />
              <span>Edit</span>
            </button>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Quotation</span>
          </button>

          {/* Convert to Invoice Button */}
          {!isConverted ? (
            <button
              type="button"
              onClick={handleConvert}
              disabled={isConverting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isConverting ? 'Converting...' : 'Convert to Invoice'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (quotation.convertedInvoiceId) navigate(`/invoices/${quotation.convertedInvoiceId}`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-purple-700" />
              <span>View Invoice ({quotation.convertedInvoiceNumber || 'INV'})</span>
            </button>
          )}
        </div>
      </div>

      {/* Converted Alert Banner */}
      {isConverted && (
        <div className="no-print p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 text-purple-900 text-xs">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="font-bold">This quotation has been converted to an invoice.</p>
              <p className="text-purple-700 mt-0.5">
                Invoice Number: <strong>{quotation.convertedInvoiceNumber || 'INV'}</strong>. Payment collection is managed directly on the invoice.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (quotation.convertedInvoiceId) navigate(`/invoices/${quotation.convertedInvoiceId}`);
            }}
            className="px-3.5 py-1.5 font-bold text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shrink-0"
          >
            Open Invoice
          </button>
        </div>
      )}

      {/* Printable Quotation Sheet Container */}
      <div className="printable-invoice bg-white p-8 sm:p-10 rounded-2xl border border-gray-200/90 shadow-md text-gray-900 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#C1121F] uppercase font-mono">
                NEXTGARAGE
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <div className="w-8 h-8 rounded-lg bg-[#C1121F] flex items-center justify-center text-white shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-extrabold font-heading text-gray-900 tracking-tight uppercase">
                {settings?.businessName || 'Arshi Automobile & Car Hub'}
              </h1>
            </div>
            <p className="text-xs font-medium text-gray-600 mt-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C1121F] shrink-0" />
              <span>{settings?.address || 'Rajshahi, Bangladesh'}</span>
            </p>
            <p className="text-xs font-medium text-gray-800 mt-1 flex items-center gap-1.5 font-mono">
              <Phone className="w-3.5 h-3.5 text-[#C1121F] shrink-0" />
              <span>Phone: {settings?.phone || '01712110902'}</span>
              {settings?.altPhone && <span>/ {settings.altPhone}</span>}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="inline-block bg-blue-900 text-white font-mono text-xs px-3 py-1 rounded font-bold uppercase tracking-wider mb-1">
              ESTIMATED QUOTATION
            </div>
            <p className="font-mono text-base font-extrabold text-[#C1121F]">
              {quotation.quotationNumber}
            </p>
            <p className="text-xs text-gray-600">
              Quotation Date: <strong>{formatDate(quotation.date)}</strong>
            </p>
            <p className="text-xs text-gray-600">
              Valid Until: <strong>{formatDate(quotation.validUntil)}</strong>
            </p>
            <div className="pt-1">
              <QuotationStatusBadge status={quotation.status} />
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-gray-200 text-xs">
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Customer Information
            </p>
            <p className="text-sm font-bold text-gray-900">{quotation.customerName}</p>
            <p className="font-mono text-gray-600">Phone: {quotation.customerPhone}</p>
          </div>

          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Vehicle Details
            </p>
            <p className="text-sm font-bold text-gray-900">{quotation.vehicleModel}</p>
            <p className="font-mono font-medium text-gray-800 bg-white inline-block px-1.5 py-0.5 rounded border border-gray-200">
              {quotation.vehicleRegistration}
            </p>
          </div>
        </div>

        {/* Services & Estimate Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-2.5 px-2 w-10 text-center">#</th>
                <th className="py-2.5 px-2">Service / Item</th>
                <th className="py-2.5 px-2">Description / Scope</th>
                <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                <th className="py-2.5 px-2 w-28 text-right">Unit Price</th>
                <th className="py-2.5 px-2 w-32 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotation.items.map((item, idx) => (
                <tr key={item.id} className="text-gray-800">
                  <td className="py-3 px-2 text-center text-gray-400 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-2 font-bold text-gray-900">
                    {item.serviceName}
                  </td>
                  <td className="py-3 px-2 text-gray-600 text-xs">
                    {item.description || '-'}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {item.quantity || 1}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-gray-600">
                    {formatBDT(item.unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-right font-bold font-mono text-gray-900">
                    {formatBDT(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-gray-200">
          {/* Notes & Terms */}
          <div className="space-y-3 max-w-md text-xs text-gray-600">
            {quotation.notes && (
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-amber-950">
                <span className="font-bold block text-[11px] uppercase tracking-wider mb-0.5 text-amber-900">
                  Quotation Note:
                </span>
                <p className="leading-relaxed">{quotation.notes}</p>
              </div>
            )}

            {quotation.terms && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                <span className="font-bold block text-[11px] uppercase tracking-wider mb-0.5 text-gray-900">
                  Terms & Conditions:
                </span>
                <p className="whitespace-pre-line text-[11px] leading-relaxed">{quotation.terms}</p>
              </div>
            )}
          </div>

          {/* Totals Calculation */}
          <div className="w-full sm:w-72 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
              <span>Subtotal:</span>
              <span className="font-semibold font-mono text-gray-900">{formatBDT(quotation.subtotal)}</span>
            </div>

            {quotation.discount > 0 && (
              <div className="flex justify-between py-1 text-rose-700 border-b border-gray-100">
                <span>Estimated Discount:</span>
                <span className="font-semibold font-mono">- {formatBDT(quotation.discount)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 text-base font-bold text-gray-900 border-b-2 border-gray-800">
              <span className="font-heading">Estimated Total:</span>
              <span className="font-mono text-lg font-extrabold text-[#C1121F]">
                {formatBDT(quotation.grandTotal)}
              </span>
            </div>

            <p className="text-[11px] text-gray-400 italic pt-1">
              * Non-binding estimate. Official billing invoice created upon job approval.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3">
          <p className="text-center sm:text-left font-medium">
            {settings?.defaultFooterText || 'Thank you for choosing Arshi Automobile & Car Hub.'}
          </p>
          <div className="text-center sm:text-right pt-6 sm:pt-0">
            <div className="w-36 border-t border-gray-400 mx-auto sm:ml-auto"></div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Authorized Workshop Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
