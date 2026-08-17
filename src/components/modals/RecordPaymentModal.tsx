import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { PaymentMethod } from '../../types';
import { formatBDT } from '../../utils/formatters';
import { CheckCircle2, User, Car } from 'lucide-react';

export const RecordPaymentModal: React.FC = () => {
  const { paymentModalInvoice, closePaymentModal, showToast, triggerRefresh } = useApp();

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (paymentModalInvoice) {
      setPaymentAmount(paymentModalInvoice.due.toString());
      setPaymentMethod('Cash');
      setNote(`Due payment collected for ${paymentModalInvoice.invoiceNumber}`);
    }
  }, [paymentModalInvoice]);

  if (!paymentModalInvoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid positive payment amount', 'error');
      return;
    }

    if (amountNum > paymentModalInvoice.due) {
      showToast(`Amount cannot exceed remaining due of ${formatBDT(paymentModalInvoice.due)}`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.recordDuePayment(
        paymentModalInvoice.id,
        amountNum,
        paymentMethod,
        note.trim() || undefined
      );

      showToast(`Payment of ${formatBDT(amountNum)} recorded for ${paymentModalInvoice.invoiceNumber}!`, 'success');
      triggerRefresh();
      closePaymentModal();
    } catch (err) {
      console.error(err);
      showToast('Failed to record payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={!!paymentModalInvoice}
      onClose={closePaymentModal}
      title="Collect Due Payment"
      subtitle={`Invoice: ${paymentModalInvoice.invoiceNumber}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer & Vehicle Info Header */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-gray-800">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span>{paymentModalInvoice.customerName}</span>
            </div>
            <span className="text-gray-500">{paymentModalInvoice.customerPhone}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Car className="w-3.5 h-3.5 text-gray-500" />
              <span>{paymentModalInvoice.vehicleModel}</span>
            </div>
            <span className="font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
              {paymentModalInvoice.vehicleRegistration}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
            <span className="text-gray-500">Total: {formatBDT(paymentModalInvoice.grandTotal)} | Paid: {formatBDT(paymentModalInvoice.paid)}</span>
            <span className="font-bold text-rose-600 text-sm">Due: {formatBDT(paymentModalInvoice.due)}</span>
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Payment Amount to Collect (৳) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm font-bold">৳</span>
            <input
              type="number"
              min="1"
              max={paymentModalInvoice.due}
              step="any"
              required
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="w-full text-base font-bold pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-700"
            />
          </div>
          {parseFloat(paymentAmount) < paymentModalInvoice.due && (
            <p className="text-[11px] text-amber-600 mt-1">
              * Remaining due after this payment: {formatBDT(paymentModalInvoice.due - (parseFloat(paymentAmount) || 0))}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Payment Method <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Cash', 'bKash', 'Bank'] as PaymentMethod[]).map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  paymentMethod === method
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Note / Payment Reference
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. bKash TrxID or hand cash receipt"
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={closePaymentModal}
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
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : 'Confirm & Collect'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
