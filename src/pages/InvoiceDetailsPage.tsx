import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Wrench,
  Phone,
  MapPin,
  User,
  Car,
  Receipt,
  QrCode,
  Mail,
  Send
} from 'lucide-react';
import { InvoiceStatusBadge, PaymentMethodBadge } from '../components/common/Badge';
import { Barcode } from '../components/common/Barcode';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Invoice, Settings, Customer } from '../types';
import { formatBDT, formatDate } from '../utils/formatters';
import banglaQrImg from '../assets/bangla-qr.jpg';

export const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openPaymentModal, refreshTrigger, showToast } = useApp();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [inv, sett] = await Promise.all([
          api.getInvoiceById(id),
          api.getSettings()
        ]);
        if (inv) {
          setInvoice(inv);
          if (inv.customerId) {
            const cust = await api.getCustomerById(inv.customerId);
            setCustomer(cust || null);
          }
        }
        if (sett) {
          setSettings(sett);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [id, refreshTrigger]);

  const sendInvoiceEmail = async (email?: string) => {
    if (!invoice) return;
    setIsSendingEmail(true);
    try {
      const result = await api.emailInvoice(invoice.id, email);
      showToast(`Invoice emailed to ${result.email}`, 'success');
      setIsEmailModalOpen(false);
      setEmailInput('');
      if (email && customer) {
        setCustomer({ ...customer, email: customer.email || email });
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to send email', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleEmailClick = () => {
    if (customer?.email) {
      sendInvoiceEmail();
    } else {
      setEmailInput('');
      setIsEmailModalOpen(true);
    }
  };

  // Auto-trigger print if requested via query param
  useEffect(() => {
    if (searchParams.get('print') === 'true' && invoice) {
      setTimeout(() => {
        window.print();
      }, 400);
    }
  }, [searchParams, invoice]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm">Loading invoice details...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4 max-w-md mx-auto">
        <Receipt className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Invoice Not Found</h3>
        <p className="text-xs text-gray-500">The requested invoice ID could not be retrieved.</p>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] rounded-lg"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex items-center gap-2">
          {invoice.due > 0 && (
            <button
              type="button"
              onClick={() => openPaymentModal(invoice)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Collect Due ({formatBDT(invoice.due)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleEmailClick}
            disabled={isSendingEmail}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors disabled:opacity-60"
          >
            <Mail className="w-4 h-4 text-gray-500" />
            <span>{isSendingEmail ? 'Sending...' : 'Email Invoice'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice (A4)</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="printable-invoice bg-white p-8 sm:p-10 rounded-2xl border border-gray-200/90 shadow-md text-gray-900 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#C1121F] flex items-center justify-center text-white shrink-0">
                <Wrench className="w-5 h-5" />
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
            <div className="inline-block bg-neutral-900 text-white font-mono text-xs px-3 py-1 rounded font-bold uppercase tracking-wider mb-1">
              INVOICE / BILL
            </div>
            <p className="font-mono text-base font-extrabold text-[#C1121F]">
              {invoice.invoiceNumber}
            </p>
            <div className="flex justify-start sm:justify-end">
              <Barcode value={invoice.invoiceNumber} height={36} />
            </div>
            <p className="text-xs text-gray-600">
              Date: <strong>{formatDate(invoice.date)}</strong>
            </p>
            <div className="pt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-gray-200 text-xs">
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Billed To (Customer)
            </p>
            <p className="text-sm font-bold text-gray-900">{invoice.customerName}</p>
            <p className="font-mono text-gray-600">Phone: {invoice.customerPhone}</p>
          </div>

          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Vehicle Information
            </p>
            <p className="text-sm font-bold text-gray-900">{invoice.vehicleModel}</p>
            <p className="font-mono font-medium text-gray-800 bg-white inline-block px-1.5 py-0.5 rounded border border-gray-200">
              {invoice.vehicleRegistration}
            </p>
          </div>
        </div>

        {/* Services & Work Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-2.5 px-2 w-10 text-center">#</th>
                <th className="py-2.5 px-2">Service Description</th>
                <th className="py-2.5 px-2 w-24 text-center">Qty</th>
                <th className="py-2.5 px-2 w-28 text-right">Rate</th>
                <th className="py-2.5 px-2 w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => {
                const total = item.price * (item.quantity || 1);
                return (
                  <tr key={item.id} className="text-gray-800">
                    <td className="py-3 px-2 text-center text-gray-400 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2 font-medium">
                      {item.serviceName}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {item.quantity || 1}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-600">
                      {formatBDT(item.price)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold font-mono text-gray-900">
                      {formatBDT(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-gray-200">
          {/* Notes & Payment Info with Bangla QR Code */}
          <div className="space-y-3 max-w-sm text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Payment Method:</span>
              <PaymentMethodBadge method={invoice.paymentMethod} />
            </div>

            {/* Bangla QR Scan & Pay Box */}
            <div className="p-3 bg-white rounded-xl border-2 border-dashed border-gray-300 flex items-center gap-3.5 shadow-2xs">
              <div className="bg-white p-1 rounded-lg border border-gray-200 shrink-0">
                <img
                  src={banglaQrImg}
                  alt="Bangla QR - Scan and Pay"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <p className="font-bold text-gray-900 text-xs font-heading tracking-tight flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-[#C1121F]" />
                    <span>Scan & Pay (বাংলা QR)</span>
                  </p>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">
                  Scan with any Bank App, <strong className="text-gray-900">bKash, Nagad, Rocket</strong> or <strong className="text-gray-900">Upay</strong> to pay bill.
                </p>
                <div className="pt-0.5">
                  <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200">
                    Universal Bangla QR
                  </span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-700">
                <span className="font-semibold text-gray-800 block text-[11px]">Note / Remarks:</span>
                <span className="italic">{invoice.notes}</span>
              </div>
            )}
          </div>

          {/* Totals Calculation */}
          <div className="w-full sm:w-72 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
              <span>Subtotal:</span>
              <span className="font-semibold font-mono text-gray-900">{formatBDT(invoice.subtotal)}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between py-1 text-rose-700 border-b border-gray-100">
                <span>Special Discount:</span>
                <span className="font-semibold font-mono">- {formatBDT(invoice.discount)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 text-base font-bold text-gray-900 border-b-2 border-gray-300">
              <span className="font-heading">Grand Total:</span>
              <span className="font-mono text-lg font-extrabold text-[#C1121F]">
                {formatBDT(invoice.grandTotal)}
              </span>
            </div>

            <div className="flex justify-between py-1 text-emerald-800 font-medium">
              <span>Amount Paid:</span>
              <span className="font-bold font-mono">{formatBDT(invoice.paid)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-sm font-bold bg-gray-50 px-2 rounded-lg border border-gray-200">
              <span className="text-gray-800">Remaining Due:</span>
              <span className={`font-mono font-extrabold ${invoice.due > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {formatBDT(invoice.due)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3">
          <p className="text-center sm:text-left font-medium">
            {settings?.defaultFooterText || 'Thank you for choosing Arshi Automobile & Car Hub.'}
          </p>
          <div className="text-center sm:text-right pt-6 sm:pt-0">
            <div className="w-36 border-t border-gray-400 mx-auto sm:ml-auto"></div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Authorized Signature</p>
          </div>
        </div>
      </div>

      {/* Email Address Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Email Invoice"
        subtitle={`${invoice.customerName} • ${invoice.invoiceNumber}`}
        maxWidth="sm"
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Customer Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              autoFocus
              required
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="e.g. customer@example.com"
              className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              We'll save this to the customer's profile for next time.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => sendInvoiceEmail(emailInput.trim())}
              disabled={isSendingEmail || !emailInput.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-lg transition-colors shadow-xs disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingEmail ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
