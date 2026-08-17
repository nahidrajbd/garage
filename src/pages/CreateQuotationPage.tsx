import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Customer, 
  ServiceItem, 
  QuotationItem, 
  QuotationStatus,
  JobCard
} from '../types';
import { formatBDT, generateQuotationNumber } from '../utils/formatters';

export const CreateQuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const fromJobCardId = searchParams.get('fromJobCard');
  const { showToast, triggerRefresh } = useApp();

  // Reference Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceItem[]>([]);
  const [linkedJobCard, setLinkedJobCard] = useState<JobCard | null>(null);

  // Form State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<QuotationStatus>('Draft');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Quotation Items
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: '1',
      serviceName: 'Dent & Paint',
      description: 'Front bumper & door touchup',
      quantity: 1,
      unitPrice: 4500,
      total: 4500
    }
  ]);

  // Financials
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState(
    'This quotation is an estimated cost. Final cost may change after vehicle inspection or if additional work is required.'
  );
  const [terms, setTerms] = useState(
    '1. Quotation valid for 7 days from issue date.\n2. Genuine spare parts provided with warranty.\n3. Estimated delivery time given on confirmation.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [custList, srvList, qtList] = await Promise.all([
          api.getCustomers(),
          api.getServices(),
          api.getQuotations()
        ]);
        setCustomers(custList);
        setServicesCatalog(srvList);

        if (id) {
          // Edit existing quotation
          const existing = await api.getQuotationById(id);
          if (existing) {
            setQuotationNumber(existing.quotationNumber);
            setDate(existing.date);
            setValidUntil(existing.validUntil);
            setStatus(existing.status);
            setCustomerName(existing.customerName);
            setCustomerPhone(existing.customerPhone);
            setVehicleReg(existing.vehicleRegistration);
            setVehicleModel(existing.vehicleModel);
            setSelectedCustomerId(existing.customerId || '');
            setItems(existing.items);
            setDiscount(existing.discount.toString());
            setNotes(existing.notes || '');
            setTerms(existing.terms || '');
          }
        } else if (fromJobCardId) {
          // Pre-fill from Job Card
          const jc = await api.getJobCardById(fromJobCardId);
          if (jc) {
            setLinkedJobCard(jc);
            setQuotationNumber(generateQuotationNumber(qtList.length));
            setCustomerName(jc.customerName);
            setCustomerPhone(jc.customerPhone);
            setVehicleReg(jc.vehicleRegistration);
            setVehicleModel(jc.vehicleModel);
            if (jc.customerId) setSelectedCustomerId(jc.customerId);

            if (jc.requiredWork && jc.requiredWork.length > 0) {
              const prefilledItems = jc.requiredWork.map((w, idx) => {
                const catalogMatch = srvList.find(s => s.name.toLowerCase() === w.serviceName.toLowerCase());
                const unitPrice = catalogMatch ? catalogMatch.defaultPrice : 0;
                return {
                  id: `qitem-${idx + 1}`,
                  serviceName: w.serviceName,
                  description: w.description || '',
                  quantity: 1,
                  unitPrice,
                  total: unitPrice
                };
              });
              setItems(prefilledItems);
            }

            setNotes(`Estimated for Job Card ${jc.jobCardNumber}. Customer request: ${jc.customerComplaint}`);
          }
        } else {
          // New quotation
          setQuotationNumber(generateQuotationNumber(qtList.length));
        }
      } catch (err) {
        console.error(err);
      }
    };
    initData();
  }, [id, fromJobCardId]);

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

  // Add Item Row
  const handleAddItem = (service?: ServiceItem) => {
    const newItem: QuotationItem = {
      id: `qitem-${Date.now()}-${Math.random()}`,
      serviceName: service ? service.name : '',
      description: service?.description || '',
      quantity: 1,
      unitPrice: service ? service.defaultPrice : 0,
      total: service ? service.defaultPrice : 0
    };
    setItems(prev => [...prev, newItem]);
  };

  // Update Item Row
  const handleUpdateItem = (itemId: string, field: keyof QuotationItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      let updated = { ...item, [field]: value };

      if (field === 'serviceName') {
        const matched = servicesCatalog.find(s => s.name.toLowerCase() === String(value).toLowerCase());
        if (matched) {
          updated.unitPrice = matched.defaultPrice;
        }
      }

      const qty = field === 'quantity' ? Number(value) || 1 : Number(updated.quantity) || 1;
      const unitP = field === 'unitPrice' ? Number(value) || 0 : Number(updated.unitPrice) || 0;
      updated.total = qty * unitP;

      return updated;
    }));
  };

  // Remove Item Row
  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      showToast('Quotation must contain at least one item', 'error');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [items]);

  const discountNum = Math.max(0, parseFloat(discount) || 0);
  const grandTotal = Math.max(0, subtotal - discountNum);

  // Save quotation handler
  const handleSave = async (andPrint = false, markAsSent = false) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Please provide customer name and phone number', 'error');
      return;
    }
    if (!vehicleReg.trim()) {
      showToast('Please provide vehicle registration number', 'error');
      return;
    }
    if (items.some(i => !i.serviceName.trim() || i.unitPrice < 0)) {
      showToast('Please check service items for empty names or invalid prices', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalStatus: QuotationStatus = markAsSent ? 'Sent' : (status === 'Converted' ? 'Converted' : status);

      const quotationData = {
        quotationNumber,
        date,
        validUntil,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleRegistration: vehicleReg.trim(),
        vehicleModel: vehicleModel.trim() || 'Vehicle',
        items: items.map(i => ({
          id: i.id,
          serviceName: i.serviceName.trim(),
          description: i.description?.trim() || '',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          total: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0)
        })),
        subtotal,
        discount: discountNum,
        grandTotal,
        status: finalStatus,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        jobCardId: linkedJobCard?.id || undefined,
        jobCardNumber: linkedJobCard?.jobCardNumber || undefined
      };

      let resultId = id;
      if (id) {
        await api.updateQuotation(id, quotationData);
        showToast(`Quotation ${quotationNumber} updated successfully!`, 'success');
      } else {
        const created = await api.createQuotation(quotationData);
        resultId = created.id;
        if (linkedJobCard) {
          await api.linkJobCardQuotation(linkedJobCard.id, created.id, created.quotationNumber);
        }
        showToast(`Quotation ${created.quotationNumber} created successfully!`, 'success');
      }

      triggerRefresh();

      if (andPrint) {
        navigate(`/quotations/${resultId}?print=true`);
      } else {
        navigate(`/quotations/${resultId}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save quotation', 'error');
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
            onClick={() => navigate('/quotations')}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Back to Quotations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              {id ? 'Edit Quotation' : 'Create Quotation'}
            </h2>
            <p className="text-xs text-gray-500">
              Provide repair estimate to customer without altering business balance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-gray-400 font-mono">Quotation No.</span>
            <p className="font-mono text-base font-bold text-gray-900">{quotationNumber}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Customer & Quotation Info */}
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
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g. 01712-345678"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
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
                Quotation Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as QuotationStatus)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent to Customer</option>
                <option value="Accepted">Accepted by Customer</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
                {status === 'Converted' && <option value="Converted">Converted</option>}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Services & Estimate Items Section (Responsive Table on desktop, cards on mobile) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Estimated Services & Spare Parts
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
              <option value="" disabled>+ Add catalog service...</option>
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
              <span>Custom Row</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Service Name</th>
                <th className="py-2.5 px-3">Description / Work Scope</th>
                <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                <th className="py-2.5 px-3 w-28 text-right">Unit Price (৳)</th>
                <th className="py-2.5 px-3 w-28 text-right">Total (৳)</th>
                <th className="py-2.5 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
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
                      placeholder="e.g. Dent & Paint"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                      placeholder="e.g. Front bumper repair & color match"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-md text-center focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={item.unitPrice}
                      onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-md text-right font-medium focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatBDT(item.total)}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-30 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards View */}
        <div className="sm:hidden space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 font-mono">Item #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length <= 1}
                  className="p-1 text-gray-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600">Service Name</label>
                <input
                  type="text"
                  required
                  value={item.serviceName}
                  onChange={e => handleUpdateItem(item.id, 'serviceName', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-md bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600">Scope / Description</label>
                <input
                  type="text"
                  value={item.description || ''}
                  onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-md bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600">Unit (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={item.unitPrice}
                    onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 text-right">Total</label>
                  <p className="text-xs font-bold text-gray-900 text-right pt-1.5">{formatBDT(item.total)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes & Terms + Bill Calculation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notes and Terms & Conditions */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-2 border-b border-gray-100">
            Quotation Notes & Terms
          </h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Quotation Note (Editable)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={e => setTerms(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-2 border-b border-gray-100">
              Quotation Estimate Total
            </h3>

            <div className="space-y-2.5 text-xs sm:text-sm pt-2">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900 font-mono">{formatBDT(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estimated Discount (৳):</span>
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

              <div className="pt-2 border-t-2 border-gray-200 flex justify-between items-center text-base font-bold text-gray-900">
                <span className="font-heading">Estimated Grand Total:</span>
                <span className="text-xl text-[#C1121F] font-heading font-extrabold">{formatBDT(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This quotation does not record revenue or cash flow until converted to an invoice.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => handleSave(false, false)}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all shadow-2xs"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave(true, true)}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Save & Print Quotation</span>
        </button>
      </div>
    </div>
  );
};
