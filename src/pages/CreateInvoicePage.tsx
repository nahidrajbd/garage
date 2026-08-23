import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  ArrowLeft, 
  User, 
  Car, 
  Wrench, 
  Calculator,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InvoiceStatusBadge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Customer, 
  ServiceItem, 
  InvoiceItem, 
  PaymentMethod, 
  InvoiceStatus,
  JobCard
} from '../types';
import { formatBDT, normalizePhoneDigits } from '../utils/formatters';

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJobCardId = searchParams.get('fromJobCard');
  const { showToast, triggerRefresh } = useApp();

  // Reference Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceItem[]>([]);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [linkedJobCard, setLinkedJobCard] = useState<JobCard | null>(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Invoice Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', serviceName: 'Full Periodic Car Servicing', price: 5000, quantity: 1 }
  ]);

  // Financials
  const [discount, setDiscount] = useState<string>('0');
  const [paid, setPaid] = useState<string>('5000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [custList, srvList, invList] = await Promise.all([
          api.getCustomers(),
          api.getServices(),
          api.getInvoices()
        ]);
        setCustomers(custList);
        setServicesCatalog(srvList);
        setInvoicesCount(invList.length);

        if (fromJobCardId) {
          const jc = await api.getJobCardById(fromJobCardId);
          if (jc) {
            setLinkedJobCard(jc);
            setCustomerName(jc.customerName);
            setCustomerPhone(jc.customerPhone);
            setVehicleReg(jc.vehicleRegistration);
            setVehicleModel(jc.vehicleModel);
            if (jc.customerId) setSelectedCustomerId(jc.customerId);

            if (jc.requiredWork && jc.requiredWork.length > 0) {
              const prefilledItems = jc.requiredWork.map((w, idx) => {
                const catalogMatch = srvList.find(s => s.name.toLowerCase() === w.serviceName.toLowerCase());
                const price = catalogMatch ? catalogMatch.defaultPrice : 0;
                return {
                  id: `item-${idx + 1}`,
                  serviceId: catalogMatch?.id,
                  serviceName: w.serviceName,
                  price,
                  quantity: 1
                };
              });
              setItems(prefilledItems);
              const sum = prefilledItems.reduce((acc, curr) => acc + curr.price, 0);
              setPaid(String(sum));
            }

            setNotes(`Created from Job Card ${jc.jobCardNumber}. Request: ${jc.customerComplaint}`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    initData();
  }, [fromJobCardId]);

  // Customer Selection Auto-fill
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      if (cust.vehicles && cust.vehicles.length > 0) {
        setVehicleReg(cust.vehicles[0].registrationNumber);
        setVehicleModel(cust.vehicles[0].model);
      }
    }
  };

  // Auto-fill customer details as soon as a matching phone number is typed
  useEffect(() => {
    const digits = normalizePhoneDigits(customerPhone);
    if (!digits) {
      setSelectedCustomerId('');
      return;
    }
    const match = customers.find(c => normalizePhoneDigits(c.phone) === digits);
    if (match) {
      setSelectedCustomerId(match.id);
      setCustomerName(match.name);
      if (match.vehicles && match.vehicles.length > 0) {
        setVehicleReg(match.vehicles[0].registrationNumber);
        setVehicleModel(match.vehicles[0].model);
      }
    } else {
      setSelectedCustomerId('');
    }
  }, [customerPhone, customers]);

  // Add Item Row
  const handleAddItem = (service?: ServiceItem) => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      serviceId: service?.id,
      serviceName: service ? service.name : '',
      price: service ? service.defaultPrice : 0,
      quantity: 1
    };
    setItems(prev => [...prev, newItem]);
  };

  // Update Item Row
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      if (field === 'serviceName') {
        // Check if matching a catalog item
        const matched = servicesCatalog.find(s => s.name.toLowerCase() === String(value).toLowerCase());
        return {
          ...item,
          serviceName: value,
          serviceId: matched?.id,
          price: matched ? matched.defaultPrice : item.price
        };
      }

      return {
        ...item,
        [field]: value
      };
    }));
  };

  // Remove Item Row
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('Invoice must contain at least one service item', 'error');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [items]);

  const discountNum = Math.max(0, parseFloat(discount) || 0);
  const grandTotal = Math.max(0, subtotal - discountNum);

  const paidNum = Math.max(0, parseFloat(paid) || 0);
  const due = Math.max(0, grandTotal - paidNum);

  const calculatedStatus: InvoiceStatus = useMemo(() => {
    if (grandTotal === 0) return 'Paid';
    if (paidNum >= grandTotal) return 'Paid';
    if (paidNum > 0) return 'Partial';
    return 'Due';
  }, [grandTotal, paidNum]);

  // Set paid to full automatically if user wants full paid
  const setFullPaid = () => {
    setPaid(grandTotal.toString());
  };

  const setZeroPaid = () => {
    setPaid('0');
  };

  // Save invoice handler
  const handleSave = async (andPrint = false) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Please provide customer name and phone number', 'error');
      return;
    }
    if (!vehicleReg.trim()) {
      showToast('Please provide vehicle registration number', 'error');
      return;
    }
    if (items.some(i => !i.serviceName.trim() || i.price < 0)) {
      showToast('Please check service items for empty names or invalid prices', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createInvoice({
        invoiceNumber,
        date,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleRegistration: vehicleReg.trim(),
        vehicleModel: vehicleModel.trim() || 'Vehicle',
        items: items.map(i => ({
          id: i.id,
          serviceName: i.serviceName.trim(),
          price: Number(i.price),
          quantity: Number(i.quantity) || 1
        })),
        subtotal,
        discount: discountNum,
        grandTotal,
        paid: Math.min(paidNum, grandTotal),
        due,
        status: calculatedStatus,
        paymentMethod,
        notes: notes.trim() || undefined,
        jobCardId: linkedJobCard?.id || undefined,
        jobCardNumber: linkedJobCard?.jobCardNumber || undefined
      });

      if (linkedJobCard) {
        await api.linkJobCardInvoice(linkedJobCard.id, created.id, created.invoiceNumber);
      }

      showToast(`Invoice ${created.invoiceNumber} created successfully!`, 'success');
      triggerRefresh();

      if (andPrint) {
        navigate(`/invoices/${created.id}?print=true`);
      } else {
        navigate(`/invoices/${created.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              Create New Invoice
            </h2>
            <p className="text-xs text-gray-500">
              Generate itemized service bill with live payment and due calculations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-400 font-mono">Invoice Number</span>
            <p className="font-mono text-base font-bold text-gray-400 italic">Assigned on save</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Customer & Vehicle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#C1121F]" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Customer Details
              </h3>
            </div>
            {customers.length > 0 && (
              <select
                value={selectedCustomerId}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white"
              >
                <option value="">-- Auto-select existing --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                autoFocus
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g. 01712-345678"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
              />
              {selectedCustomerId && (
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">✓ Existing customer found — details auto-filled</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Md. Rahim Uddin"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Car className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Vehicle Information
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vehicle Registration Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleReg}
                onChange={e => setVehicleReg(e.target.value)}
                placeholder="e.g. Rajshahi Metro-Ga 11-4521"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Car Model & Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                placeholder="e.g. Toyota Axio 2017 / Honda Vezel"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Remarks / Special Instructions (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Clean oil stains, check AC gas pressure"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Services & Repair Items
            </h3>
          </div>

          {/* Quick Add from Service Catalog */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Quick Add:</span>
            <select
              onChange={e => {
                const srv = servicesCatalog.find(s => s.id === e.target.value);
                if (srv) handleAddItem(srv);
                e.target.value = '';
              }}
              defaultValue=""
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white"
            >
              <option value="" disabled>+ Add standard service...</option>
              {servicesCatalog.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatBDT(s.defaultPrice)})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleAddItem()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Custom Item</span>
            </button>
          </div>
        </div>

        {/* Services Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Service Name / Description</th>
                <th className="py-2.5 px-3 w-28 sm:w-36 text-right">Price (৳)</th>
                <th className="py-2.5 px-3 w-20 sm:w-24 text-center">Qty</th>
                <th className="py-2.5 px-3 w-28 sm:w-36 text-right">Total (৳)</th>
                <th className="py-2.5 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const rowTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-xs">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        required
                        value={item.serviceName}
                        onChange={e => handleUpdateItem(item.id, 'serviceName', e.target.value)}
                        placeholder="e.g. Foam Wash / Engine Oil Change"
                        className="w-full text-xs sm:text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.price}
                        onChange={e => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs sm:text-sm px-2 py-1.5 border border-gray-300 rounded-md text-right font-medium focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full text-xs sm:text-sm px-2 py-1.5 border border-gray-300 rounded-md text-center focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      {formatBDT(rowTotal)}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Calculation & Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Configuration */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-2 border-b border-gray-100">
            Payment & Settlement
          </h3>

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
                      ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Pay Buttons */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Quick Paid Amount Helpers
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={setFullPaid}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
              >
                Full Paid ({formatBDT(grandTotal)})
              </button>
              <button
                type="button"
                onClick={setZeroPaid}
                className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
              >
                Full Due (৳0 Paid)
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Calculated Invoice Status:</span>
            <InvoiceStatusBadge status={calculatedStatus} />
          </div>
        </div>

        {/* Financial Breakdown Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-2 border-b border-gray-100">
            Bill Calculation
          </h3>

          <div className="space-y-2.5 text-xs sm:text-sm">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">{formatBDT(subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Special Discount (৳):</span>
              <div className="w-32">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-full text-right px-2 py-1 border border-gray-300 rounded-md font-medium text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-base font-bold text-gray-900">
              <span className="font-heading">Grand Total:</span>
              <span className="text-xl text-[#C1121F] font-heading font-extrabold">{formatBDT(grandTotal)}</span>
            </div>

            {/* Paid Amount */}
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-emerald-800">Amount Paid Now (৳):</span>
              <div className="w-32">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={paid}
                  onChange={e => setPaid(e.target.value)}
                  className="w-full text-right px-2 py-1.5 border border-emerald-400 bg-emerald-50/50 rounded-md font-bold text-sm text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Due Amount */}
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-bold">
              <span className="text-gray-700">Outstanding Due:</span>
              <span className={`text-base font-extrabold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatBDT(due)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all shadow-2xs"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving...' : 'Save Invoice'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Save & Print Invoice</span>
        </button>
      </div>
    </div>
  );
};
