import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ClipboardList,
  FileText,
  Users,
  Package,
  Search,
  Plus,
  Phone,
  MapPin,
  Car,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  ArrowRight,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { JobCard, Quotation, Invoice, Customer } from '../types';
import { JobCardStatusBadge, QuotationStatusBadge, InvoiceStatusBadge } from '../components/common/Badge';

export const CoverPage: React.FC = () => {
  const navigate = useNavigate();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jcs, qts, invs, custs] = await Promise.all([
          api.getJobCards(),
          api.getQuotations(),
          api.getInvoices(),
          api.getCustomers()
        ]);
        setJobCards(jcs);
        setQuotations(qts);
        setInvoices(invs);
        setCustomers(custs);
      } catch (err) {
        console.error('Error loading cover page data:', err);
      }
    };
    loadData();
  }, []);

  // Quick Access lists (top 5 of each)
  const recentJobCards = useMemo(() => jobCards.slice(0, 5), [jobCards]);
  const recentQuotations = useMemo(() => quotations.slice(0, 5), [quotations]);
  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

  // Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { jobCards: [], quotations: [], invoices: [], customers: [] };

    return {
      jobCards: jobCards.filter(
        j =>
          j.jobCardNumber.toLowerCase().includes(q) ||
          j.customerName.toLowerCase().includes(q) ||
          j.vehicleModel.toLowerCase().includes(q) ||
          j.vehicleRegistration.toLowerCase().includes(q)
      ),
      quotations: quotations.filter(
        qt =>
          qt.quotationNumber.toLowerCase().includes(q) ||
          qt.customerName.toLowerCase().includes(q) ||
          qt.vehicleModel.toLowerCase().includes(q) ||
          qt.vehicleRegistration.toLowerCase().includes(q)
      ),
      invoices: invoices.filter(
        inv =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.vehicleModel.toLowerCase().includes(q) ||
          inv.vehicleRegistration.toLowerCase().includes(q)
      ),
      customers: customers.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.vehicles.some(v =>
            v.model.toLowerCase().includes(q) || v.registrationNumber.toLowerCase().includes(q)
          )
      )
    };
  }, [searchQuery, jobCards, quotations, invoices, customers]);

  const totalSearchResults =
    searchResults.jobCards.length +
    searchResults.quotations.length +
    searchResults.invoices.length +
    searchResults.customers.length;

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Top Hero Section */}
      <section className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50/70 via-slate-50/40 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Brand & Workshop Info */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#2563EB] text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NEXTGARAGE</span>
              <span className="text-slate-300">•</span>
              <span className="text-[#64748B] normal-case font-medium">Simple Garage Management</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#1E293B] tracking-tight">
                Arshi Automobile & Car Hub
              </h1>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-[#64748B] mt-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Rajshahi, Bangladesh</span>
                </div>
                <span className="hidden sm:inline text-slate-300">•</span>
                <div className="flex items-center gap-1.5 font-mono text-[#1E293B]">
                  <Phone className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <a href="tel:01712110902" className="hover:underline">
                    01712110902
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Indicator & Management Link */}
          <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs font-medium text-[#64748B]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Customer-Safe View</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1E293B] bg-slate-100 hover:bg-slate-200 border border-[#E2E8F0] rounded-xl transition-all active:scale-98"
              title="Open Management Dashboard with Financial Summary"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-600 shrink-0" />
              <span>Management Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Quick Actions Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] font-heading">
            Quick Actions
          </h2>
          <span className="text-xs text-[#64748B]">Fast Workshop Operations</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. + New Job Card */}
          <button
            type="button"
            onClick={() => navigate('/job-cards/new')}
            className="group text-left p-4 sm:p-5 bg-white hover:bg-blue-50/40 border-2 border-blue-600/30 hover:border-blue-600 rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between min-h-[115px] sm:min-h-[130px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                + Primary
              </span>
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E293B] group-hover:text-blue-600 transition-colors">
                + New Job Card
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 line-clamp-1">
                Technician repair sheet
              </p>
            </div>
          </button>

          {/* 2. + New Quotation */}
          <button
            type="button"
            onClick={() => navigate('/quotations/new')}
            className="group text-left p-4 sm:p-5 bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between min-h-[115px] sm:min-h-[130px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                + New Quotation
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 line-clamp-1">
                Estimate repair & parts
              </p>
            </div>
          </button>

          {/* 3. + New Invoice */}
          <button
            type="button"
            onClick={() => navigate('/invoices/new')}
            className="group text-left p-4 sm:p-5 bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between min-h-[115px] sm:min-h-[130px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                + New Invoice
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 line-clamp-1">
                Customer vehicle billing
              </p>
            </div>
          </button>

          {/* 4. Customers */}
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="group text-left p-4 sm:p-5 bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between min-h-[115px] sm:min-h-[130px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                Customers
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 line-clamp-1">
                Vehicle owners & profiles
              </p>
            </div>
          </button>

          {/* 5. Inventory */}
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="group text-left p-4 sm:p-5 bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between min-h-[115px] sm:min-h-[130px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                Inventory
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 line-clamp-1">
                Parts & services catalog
              </p>
            </div>
          </button>

          {/* 6. Search */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="group text-left p-4 sm:p-5 bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between min-h-[115px] sm:min-h-[130px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                Search
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 line-clamp-1">
                Find vehicle, card or client
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Quick Search Modal / Popup */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
          />

          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[80vh]">
            {/* Search Input Header */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone, vehicle reg, or document ID..."
                className="flex-1 text-sm sm:text-base bg-transparent border-none outline-none text-[#1E293B] placeholder:text-[#64748B]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Container */}
            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {!searchQuery ? (
                <div className="text-center py-8 text-xs text-[#64748B]">
                  Type any vehicle registration (e.g. <em>11-4521</em>), customer name, or ID (e.g. <em>JC-</em>, <em>QT-</em>, <em>INV-</em>)
                </div>
              ) : totalSearchResults === 0 ? (
                <div className="text-center py-8 text-xs text-[#64748B]">
                  No matching records found for "{searchQuery}"
                </div>
              ) : (
                <>
                  {/* Job Cards Results */}
                  {searchResults.jobCards.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                        Job Cards ({searchResults.jobCards.length})
                      </div>
                      <div className="space-y-1.5">
                        {searchResults.jobCards.map(jc => (
                          <div
                            key={jc.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/job-cards/${jc.id}`);
                            }}
                            className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-[#E2E8F0] cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#1E293B]">
                                  {jc.jobCardNumber}
                                </span>
                                <JobCardStatusBadge status={jc.status} />
                              </div>
                              <p className="text-xs text-[#1E293B] font-medium truncate mt-0.5">
                                {jc.customerName} • {jc.vehicleModel}
                              </p>
                              <p className="text-[11px] text-[#64748B] font-mono truncate">
                                {jc.vehicleRegistration}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quotations Results */}
                  {searchResults.quotations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                        Quotations ({searchResults.quotations.length})
                      </div>
                      <div className="space-y-1.5">
                        {searchResults.quotations.map(qt => (
                          <div
                            key={qt.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/quotations/${qt.id}`);
                            }}
                            className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-[#E2E8F0] cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#1E293B]">
                                  {qt.quotationNumber}
                                </span>
                                <QuotationStatusBadge status={qt.status} />
                              </div>
                              <p className="text-xs text-[#1E293B] font-medium truncate mt-0.5">
                                {qt.customerName} • {qt.vehicleModel}
                              </p>
                              <p className="text-[11px] text-[#64748B] font-mono truncate">
                                {qt.vehicleRegistration}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices Results */}
                  {searchResults.invoices.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                        Invoices ({searchResults.invoices.length})
                      </div>
                      <div className="space-y-1.5">
                        {searchResults.invoices.map(inv => (
                          <div
                            key={inv.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/invoices/${inv.id}`);
                            }}
                            className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-[#E2E8F0] cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#1E293B]">
                                  {inv.invoiceNumber}
                                </span>
                                <InvoiceStatusBadge status={inv.status} />
                              </div>
                              <p className="text-xs text-[#1E293B] font-medium truncate mt-0.5">
                                {inv.customerName} • {inv.vehicleModel}
                              </p>
                              <p className="text-[11px] text-[#64748B] font-mono truncate">
                                {inv.vehicleRegistration}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers Results */}
                  {searchResults.customers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                        Customers ({searchResults.customers.length})
                      </div>
                      <div className="space-y-1.5">
                        {searchResults.customers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/customers');
                            }}
                            className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-[#E2E8F0] cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1E293B] truncate">
                                {c.name}
                              </p>
                              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                                {c.phone}
                              </p>
                              {c.vehicles.length > 0 && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {c.vehicles.map(v => `${v.model} (${v.registrationNumber})`).join(', ')}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="p-3 bg-slate-50 border-t border-[#E2E8F0] text-center text-[11px] text-[#64748B]">
              Privacy-safe lookup: Financial values are excluded from search preview.
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACCESS SECTION: Recent Job Cards, Recent Quotations, Recent Invoices */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1E293B] font-heading">
              Quick Access & Recent Activity
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live garage updates (Financial amounts strictly hidden for screen privacy)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Recent Job Cards */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB]">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1E293B] font-heading">
                    Recent Job Cards
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/job-cards')}
                  className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentJobCards.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No job cards created yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {recentJobCards.map(jc => (
                    <div
                      key={jc.id}
                      onClick={() => navigate(`/job-cards/${jc.id}`)}
                      className="py-3 px-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                            {jc.jobCardNumber}
                          </span>
                          <JobCardStatusBadge status={jc.status} />
                        </div>
                        <p className="text-xs text-[#1E293B] font-medium truncate">
                          {jc.customerName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] truncate">
                          <Car className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{jc.vehicleModel}</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] mt-2">
              <button
                type="button"
                onClick={() => navigate('/job-cards/new')}
                className="w-full py-2 text-xs font-semibold text-[#2563EB] bg-blue-50/60 hover:bg-blue-100/60 rounded-xl transition-colors inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Job Card
              </button>
            </div>
          </div>

          {/* 2. Recent Quotations */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1E293B] font-heading">
                    Recent Quotations
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/quotations')}
                  className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentQuotations.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No quotations created yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {recentQuotations.map(qt => (
                    <div
                      key={qt.id}
                      onClick={() => navigate(`/quotations/${qt.id}`)}
                      className="py-3 px-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                            {qt.quotationNumber}
                          </span>
                          <QuotationStatusBadge status={qt.status} />
                        </div>
                        <p className="text-xs text-[#1E293B] font-medium truncate">
                          {qt.customerName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] truncate">
                          <Car className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{qt.vehicleModel}</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] mt-2">
              <button
                type="button"
                onClick={() => navigate('/quotations/new')}
                className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Quotation
              </button>
            </div>
          </div>

          {/* 3. Recent Invoices */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1E293B] font-heading">
                    Recent Invoices
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No invoices created yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {recentInvoices.map(inv => (
                    <div
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="py-3 px-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                            {inv.invoiceNumber}
                          </span>
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                        <p className="text-xs text-[#1E293B] font-medium truncate">
                          {inv.customerName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] truncate">
                          <Car className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{inv.vehicleModel}</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] mt-2">
              <button
                type="button"
                onClick={() => navigate('/invoices/new')}
                className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Invoice
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Safe Status Banner */}
      <section className="bg-slate-100/70 rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Cover screen is active. Financial balances and revenue metrics remain confidential.</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-[#2563EB] hover:underline shrink-0"
        >
          Go to Management Dashboard →
        </button>
      </section>
    </div>
  );
};
