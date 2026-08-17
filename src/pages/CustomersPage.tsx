import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Car, 
  Calendar, 
  Clock, 
  FileText, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Customer, Invoice, Quotation, JobCard } from '../types';
import { InvoiceStatusBadge, QuotationStatusBadge, JobCardStatusBadge } from '../components/common/Badge';
import { formatBDT, formatDate } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger, openCustomerModal } = useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [historyTab, setHistoryTab] = useState<'job-cards' | 'quotations' | 'invoices'>('job-cards');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected customer for history view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cList, invList, qList, jcList] = await Promise.all([
          api.getCustomers(),
          api.getInvoices(),
          api.getQuotations(),
          api.getJobCards()
        ]);
        setCustomers(cList);
        setInvoices(invList);
        setQuotations(qList);
        setJobCards(jcList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!Array.isArray(customers)) return [];
    if (!q) return customers;
    return customers.filter(c => {
      const nameMatch = c.name ? c.name.toLowerCase().includes(q) : false;
      const phoneMatch = c.phone ? c.phone.toLowerCase().includes(q) : false;
      const addressMatch = c.address ? c.address.toLowerCase().includes(q) : false;
      const vehicleMatch = Array.isArray(c.vehicles) && c.vehicles.some(v => {
        const reg = (v.registrationNumber || (v as any).regNo || '').toLowerCase();
        const model = (v.model || '').toLowerCase();
        return reg.includes(q) || model.includes(q);
      });
      return nameMatch || phoneMatch || addressMatch || vehicleMatch;
    });
  }, [customers, search]);

  const customerJobCards = useMemo(() => {
    if (!selectedCustomer) return [];
    return jobCards.filter(jc => 
      (jc.customerId && jc.customerId === selectedCustomer.id) ||
      (jc.customerPhone && jc.customerPhone === selectedCustomer.phone) ||
      (jc.customerName && jc.customerName.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [selectedCustomer, jobCards]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(inv => 
      (inv.customerId && inv.customerId === selectedCustomer.id) ||
      (inv.customerPhone && inv.customerPhone === selectedCustomer.phone) ||
      (inv.customerName && inv.customerName.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [selectedCustomer, invoices]);

  const customerQuotations = useMemo(() => {
    if (!selectedCustomer) return [];
    return quotations.filter(q => 
      (q.customerId && q.customerId === selectedCustomer.id) ||
      (q.customerPhone && q.customerPhone === selectedCustomer.phone) ||
      (q.customerName && q.customerName.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [selectedCustomer, quotations]);

  const totalCustomerSpend = useMemo(() => {
    return customerInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [customerInvoices]);

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Customer Directory
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Registered vehicle owners, contact details, visit history, and previous service records
          </p>
        </div>

        <button
          type="button"
          onClick={openCustomerModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Registered Clients"
          value={customers.length}
          subtitle="Unique vehicle owners"
          icon={Users}
          variant="primary"
        />

        <StatCard
          title="Total Vehicles"
          value={customers.reduce((sum, c) => sum + (c.vehicles?.length || 0), 0)}
          subtitle="Serviced cars in database"
          icon={Car}
          variant="default"
        />

        <StatCard
          title="Repeat Clients"
          value={customers.filter(c => c.totalVisits > 1).length}
          subtitle="More than 1 workshop visit"
          icon={Clock}
          variant="success"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, phone number, vehicle registration or model..."
            className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="No customers matched your search query."
            actionText="+ Add New Customer"
            onAction={openCustomerModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Customer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Primary Vehicle</th>
                  <th className="py-3.5 px-4 text-center">Visits</th>
                  <th className="py-3.5 px-4">Last Service</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map(cust => {
                  const primaryVehicle = cust.vehicles?.[0];
                  return (
                    <tr 
                      key={cust.id} 
                      onClick={() => setSelectedCustomer(cust)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-gray-900">{cust.name}</div>
                        {cust.address && (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-gray-700 font-medium">{cust.phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {primaryVehicle ? (
                          <div>
                            <div className="font-medium text-gray-800">{primaryVehicle.model || 'Vehicle'}</div>
                            <div className="text-[11px] text-gray-500 font-mono">{primaryVehicle.registrationNumber || (primaryVehicle as any).regNo || 'No Reg'}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No vehicle added</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                          {cust.totalVisits} {cust.totalVisits === 1 ? 'visit' : 'visits'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        {cust.lastServiceDate ? formatDate(cust.lastServiceDate) : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                          }}
                          className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>History</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Service History Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.name}
          subtitle={`Customer Profile & Service History`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Customer Details Header Card */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Contact</span>
                  <p className="font-mono text-sm font-semibold text-gray-900">{selectedCustomer.phone}</p>
                  {selectedCustomer.address && (
                    <p className="text-gray-600 mt-0.5">{selectedCustomer.address}</p>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Registered Vehicles</span>
                  {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 ? (
                    selectedCustomer.vehicles.map(v => (
                      <div key={v.id} className="mt-0.5">
                        <span className="font-semibold text-gray-900">{v.model}</span>
                        <span className="font-mono text-gray-500 block text-[11px]">{v.registrationNumber}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No vehicles registered</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
                <span>Total Lifetime Visits: <strong>{selectedCustomer.totalVisits}</strong></span>
                <span>Total Billed: <strong className="text-emerald-700 font-bold">{formatBDT(totalCustomerSpend)}</strong></span>
              </div>
            </div>

            {/* Tabs for Job Cards vs Quotations vs Invoices */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('job-cards')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      historyTab === 'job-cards'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Job Cards ({customerJobCards.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('quotations')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      historyTab === 'quotations'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quotations ({customerQuotations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('invoices')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      historyTab === 'invoices'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Invoices ({customerInvoices.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      navigate('/job-cards/new');
                    }}
                    className="text-gray-700 font-semibold hover:underline"
                  >
                    + Job Card
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      navigate('/quotations/new');
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    + Quotation
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      navigate('/invoices/new');
                    }}
                    className="text-[#C1121F] font-semibold hover:underline"
                  >
                    + Invoice
                  </button>
                </div>
              </div>

              {/* Job Cards Tab View */}
              {historyTab === 'job-cards' && (
                <div>
                  {customerJobCards.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                      No job cards recorded yet for this customer.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                      {customerJobCards.map(jc => (
                        <div 
                          key={jc.id} 
                          className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900">{jc.jobCardNumber}</span>
                              <span className="text-[11px] text-gray-400">{formatDate(jc.date)}</span>
                              <JobCardStatusBadge status={jc.status} />
                            </div>
                            <p className="text-xs text-gray-700 truncate">
                              {jc.requiredWork.map(w => w.serviceName).join(', ') || 'Inspection'}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              {jc.vehicleModel} ({jc.vehicleRegistration}) • <span className="text-gray-600">{jc.assignedTo}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                navigate(`/job-cards/${jc.id}`);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-900 rounded"
                              title="View Job Card"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Invoices Tab View */}
              {historyTab === 'invoices' && (
                <div>
                  {customerInvoices.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                      No invoices recorded yet for this customer.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                      {customerInvoices.map(inv => (
                        <div 
                          key={inv.id} 
                          className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900">{inv.invoiceNumber}</span>
                              <span className="text-[11px] text-gray-400">{formatDate(inv.date)}</span>
                              <InvoiceStatusBadge status={inv.status} />
                            </div>
                            <p className="text-xs text-gray-700 truncate">
                              {inv.items.map(i => i.serviceName).join(', ')}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">{inv.vehicleModel} ({inv.vehicleRegistration})</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-bold text-xs sm:text-sm text-gray-900">{formatBDT(inv.grandTotal)}</p>
                              {inv.due > 0 && <p className="text-[10px] text-rose-600 font-semibold">Due: {formatBDT(inv.due)}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                navigate(`/invoices/${inv.id}`);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-900 rounded"
                              title="View Invoice"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quotations Tab View */}
              {historyTab === 'quotations' && (
                <div>
                  {customerQuotations.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                      No quotations created yet for this customer.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                      {customerQuotations.map(qt => (
                        <div 
                          key={qt.id} 
                          className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900">{qt.quotationNumber}</span>
                              <span className="text-[11px] text-gray-400">{formatDate(qt.date)}</span>
                              <QuotationStatusBadge status={qt.status} />
                            </div>
                            <p className="text-xs text-gray-700 truncate">
                              {qt.items.map(i => i.serviceName).join(', ')}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">{qt.vehicleModel} ({qt.vehicleRegistration})</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-bold text-xs sm:text-sm text-gray-900">{formatBDT(qt.grandTotal)}</p>
                              <p className="text-[10px] text-gray-400">Valid: {formatDate(qt.validUntil)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                navigate(`/quotations/${qt.id}`);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-900 rounded"
                              title="View Quotation"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
