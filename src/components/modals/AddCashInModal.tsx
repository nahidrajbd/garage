import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { CashInType, PaymentMethod, Invoice } from '../../types';
import { ArrowDownLeft, AlertCircle } from 'lucide-react';
import { formatBDT } from '../../utils/formatters';

export const AddCashInModal: React.FC = () => {
  const { isCashInModalOpen, closeCashInModal, showToast, triggerRefresh } = useApp();

  const [type, setType] = useState<CashInType>('Service Payment');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Optional link to invoice
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCashInModalOpen) {
      api.getInvoices().then(list => {
        setInvoices(list.filter(inv => inv.status === 'Due' || inv.status === 'Partial'));
      });
      // Reset form
      setType('Service Payment');
      setAmount('');
      setPaymentMethod('Cash');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setReference('');
      setNote('');
      setSelectedInvoiceId('');
    }
  }, [isCashInModalOpen]);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) return;
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setAmount(inv.due.toString());
      setDescription(`Payment for ${inv.invoiceNumber} - ${inv.customerName}`);
      setReference(inv.invoiceNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (type === 'Service Payment' && selectedInvoiceId) {
        // Record as invoice due payment
        await api.recordDuePayment(selectedInvoiceId, numAmount, paymentMethod, note);
      } else {
        // Standard cash in
        let desc = description.trim();
        if (!desc) {
          if (type === 'Loan from MD') desc = 'Loan Capital Received from MD';
          else if (type === 'Service Payment') desc = 'Workshop Service Payment';
          else desc = 'Other Income';
        }

        await api.createCashIn({
          date,
          time: nowTime,
          type,
          description: desc,
          reference: reference.trim() || undefined,
          paymentMethod,
          amount: numAmount,
          note: note.trim() || undefined
        });
      }

      showToast(`Cash In of ${formatBDT(numAmount)} recorded successfully!`, 'success');
      triggerRefresh();
      closeCashInModal();
    } catch (err) {
      console.error(err);
      showToast('Failed to record cash in', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isCashInModalOpen}
      onClose={closeCashInModal}
      title="Record Cash In"
      subtitle="Add incoming money from service payments, MD loans, or other sources"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Cash In Type
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
            {(['Service Payment', 'Loan from MD', 'Other Income'] as CashInType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (t === 'Loan from MD') {
                    setDescription('Loan capital from MD');
                    setReference('MD-INFLOW');
                  } else if (t === 'Other Income') {
                    setDescription('');
                    setReference('');
                  }
                }}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center truncate ${
                  type === t
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Note for MD Loan */}
        {type === 'Loan from MD' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>MD Loan Notice:</strong> This increases available cash reserves and updates the MD Loan tracking balance without double-counting as sales revenue.
            </p>
          </div>
        )}

        {/* Service Payment: Optional Due Invoice Link */}
        {type === 'Service Payment' && invoices.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Link to Due / Partial Invoice (Optional)
            </label>
            <select
              value={selectedInvoiceId}
              onChange={e => handleInvoiceChange(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="">-- No specific invoice (Direct service payment) --</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.customerName} ({inv.vehicleModel}) | Due: {formatBDT(inv.due)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={
              type === 'Service Payment'
                ? 'e.g. Service Payment - Toyota Axio (Foam Wash & Oil)'
                : type === 'Loan from MD'
                ? 'e.g. Working capital injection from MD'
                : 'e.g. Scrap metal sale / Old battery sale'
            }
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Amount & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Amount (৳) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm font-bold">৳</span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full text-sm pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
        </div>

        {/* Reference & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reference / Invoice #
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. INV-2026-001 or TrxID"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Additional details..."
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={closeCashInModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording...' : 'Save Cash In'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
