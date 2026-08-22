import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ExpenseCategory, PaymentMethod } from '../../types';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { formatBDT } from '../../utils/formatters';

export const AddExpenseModal: React.FC = () => {
  const { isExpenseModalOpen, editingExpense, closeExpenseModal, showToast, triggerRefresh } = useApp();
  const isEditing = Boolean(editingExpense);

  const [category, setCategory] = useState<ExpenseCategory>('Purchase');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paidFromLoan, setPaidFromLoan] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isExpenseModalOpen) {
      api.getExpenseCategories().then(cats => setCategories(cats));
      if (editingExpense) {
        setCategory(editingExpense.category);
        setDescription(editingExpense.description);
        setAmount(String(editingExpense.amount));
        setPaymentMethod(editingExpense.paymentMethod);
        setDate(editingExpense.date);
        setRecipient(editingExpense.recipient || '');
        setNote(editingExpense.note || '');
        setPaidFromLoan(Boolean(editingExpense.paidFromLoan));
      } else {
        setCategory('Purchase');
        setDescription('');
        setAmount('');
        setPaymentMethod('Cash');
        setDate(new Date().toISOString().split('T')[0]);
        setRecipient('');
        setNote('');
        setPaidFromLoan(false);
      }
    }
  }, [isExpenseModalOpen, editingExpense]);

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

      const payload = {
        date,
        time: nowTime,
        category,
        description: description.trim(),
        paymentMethod,
        amount: numAmount,
        recipient: recipient.trim() || undefined,
        note: note.trim() || undefined,
        paidFromLoan
      };

      if (isEditing && editingExpense) {
        await api.updateExpense(editingExpense.id, payload);
        showToast(`Expense updated successfully!`, 'success');
      } else {
        await api.createExpense(payload);
        showToast(
          paidFromLoan
            ? `Expense of ${formatBDT(numAmount)} added and ${formatBDT(numAmount)} added to Loan from MD!`
            : `Expense of ${formatBDT(numAmount)} added successfully!`,
          'success'
        );
      }

      triggerRefresh();
      closeExpenseModal();
    } catch (err) {
      console.error(err);
      showToast(isEditing ? 'Failed to update expense' : 'Failed to record expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isExpenseModalOpen}
      onClose={closeExpenseModal}
      title={isEditing ? 'Edit Expense' : 'Record Expense'}
      subtitle={isEditing ? 'Update this expense entry' : 'Add workshop outgoing expenses, material purchases, or salaries'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Expense Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(categories.length > 0 ? categories : ['Salary', 'Purchase', 'Food', 'Rent', 'Loan Repayment', 'Other']).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat as ExpenseCategory)}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all text-center truncate ${
                  category === cat
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loan Repayment Notice */}
        {category === 'Loan Repayment' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Loan Repayment:</strong> This cash out transaction directly reduces the remaining loan balance owed to the MD.
            </p>
          </div>
        )}

        {/* Paid Directly by MD */}
        {category !== 'Loan Repayment' && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={paidFromLoan}
              onChange={e => setPaidFromLoan(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-gray-700">
              <strong className="text-gray-900">Paid directly by MD</strong> — not from company cash. This will add {formatBDT(parseFloat(amount) || 0)} to the Loan from MD.
            </span>
          </label>
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
              category === 'Salary'
                ? 'e.g. Weekly technician wages (Karim & Sohel)'
                : category === 'Purchase'
                ? 'e.g. 5L Car Shampoo, Microfiber cloths & Polisher disc'
                : category === 'Food'
                ? 'e.g. Workshop staff lunch & afternoon tea'
                : category === 'Rent'
                ? 'e.g. Garage premise rent payment'
                : 'e.g. Compressor filter & electrical tool repair'
            }
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                className="w-full text-sm pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold text-gray-900"
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
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
        </div>

        {/* Recipient / Vendor & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Paid To / Vendor
            </label>
            <input
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="e.g. Rajshahi Auto Mart / Staff Name"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
            placeholder="Voucher or invoice reference, remarks..."
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={closeExpenseModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg transition-colors shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{isSubmitting ? (isEditing ? 'Saving...' : 'Recording...') : isEditing ? 'Save Changes' : 'Save Expense'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
