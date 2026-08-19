import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Phone,
  Plus,
  UserPlus,
  CheckCircle2,
  Car,
  ClipboardCheck,
  ClipboardList,
  FileText,
  MessageSquare,
  Clock,
  XCircle,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { LeadStatusBadge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { leadsService, statusTier, isTerminalStatus } from '../services/leadsService';
import { LEAD_STAFF_NAMES, LEAD_STATUSES } from '../mock/leadsData';
import { Lead, LeadStatus, JobCard, Quotation, Invoice } from '../types';
import { formatDate } from '../utils/formatters';

const JOURNEY_STAGES: LeadStatus[] = ['New', 'Called', 'Interested', 'Visit Agreed', 'Visited', 'Service Taken'];

export const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, triggerRefresh, refreshTrigger } = useApp();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [fuStatus, setFuStatus] = useState<LeadStatus>('Called');
  const [fuDate, setFuDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuStaff, setFuStaff] = useState(LEAD_STAFF_NAMES[0] || '');
  const [fuNote, setFuNote] = useState('');
  const [fuNextFollowUp, setFuNextFollowUp] = useState('');
  const [fuVisitDate, setFuVisitDate] = useState('');
  const [fuVisitTime, setFuVisitTime] = useState('');
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const ld = await leadsService.getLeadById(id);
        if (ld) {
          setLead(ld);
          setFuStaff(ld.assignedTo);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Best-effort: related records live in the real backend, so a
    // backend outage should not block the (locally-stored) lead itself.
    api.getJobCards().then(setJobCards).catch(err => console.error(err));
    api.getQuotations().then(setQuotations).catch(err => console.error(err));
    api.getInvoices().then(setInvoices).catch(err => console.error(err));
  }, [id, refreshTrigger]);

  const isVisitStatus = fuStatus === 'Visit Agreed' || fuStatus === 'Visit Scheduled' || fuStatus === 'Visited';
  const isFuTerminal = isTerminalStatus(fuStatus);

  const handleAssign = async (staffName: string) => {
    if (!lead) return;
    try {
      const updated = await leadsService.assignLead(lead.id, staffName);
      if (updated) {
        setLead(updated);
        showToast(`Lead reassigned to ${staffName}`, 'success');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to reassign lead', 'error');
    }
  };

  const handleAddFollowUp = async () => {
    if (!lead) return;
    if (!fuNote.trim()) {
      showToast('Please add a follow-up note', 'error');
      return;
    }
    setIsSavingFollowUp(true);
    try {
      const updated = await leadsService.addFollowUp(lead.id, {
        staffId: fuStaff,
        contactDate: fuDate,
        status: fuStatus,
        note: fuNote,
        nextFollowUpDate: fuNextFollowUp || undefined,
        visitDate: isVisitStatus ? (fuVisitDate || undefined) : undefined,
        visitTime: isVisitStatus ? (fuVisitTime || undefined) : undefined,
      });
      if (updated) {
        setLead(updated);
        showToast('Follow-up added', 'success');
        triggerRefresh();
        setIsFollowUpOpen(false);
        setFuNote('');
        setFuNextFollowUp('');
        setFuVisitDate('');
        setFuVisitTime('');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to add follow-up', 'error');
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!lead) return;
    setIsConverting(true);
    try {
      const customer = await leadsService.convertLeadToCustomer(lead.id);
      if (customer) {
        setLead(prev => prev ? { ...prev, customerId: customer.id } : prev);
        showToast(`Lead converted to customer "${customer.name}"`, 'success');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to convert lead to customer', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleLink = async (
    type: 'jobCard' | 'quotation' | 'invoice',
    recordId: string
  ) => {
    if (!lead || !recordId) return;
    try {
      let updated: Lead | null = null;
      if (type === 'jobCard') {
        const jc = jobCards.find(j => j.id === recordId);
        if (jc) updated = await leadsService.linkLeadRecord(lead.id, { jobCardId: jc.id, jobCardNumber: jc.jobCardNumber });
      } else if (type === 'quotation') {
        const qt = quotations.find(q => q.id === recordId);
        if (qt) updated = await leadsService.linkLeadRecord(lead.id, { quotationId: qt.id, quotationNumber: qt.quotationNumber });
      } else {
        const inv = invoices.find(i => i.id === recordId);
        if (inv) updated = await leadsService.linkLeadRecord(lead.id, { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber });
      }
      if (updated) {
        setLead(updated);
        showToast('Linked successfully', 'success');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to link record', 'error');
    }
  };

  const sortedFollowUps = useMemo(() => {
    if (!lead) return [];
    return [...lead.followUps].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [lead]);

  const openFollowUpModal = () => {
    if (!lead) return;
    setFuStatus(lead.status === 'New' ? 'Called' : lead.status);
    setFuDate(new Date().toISOString().split('T')[0]);
    setFuStaff(lead.assignedTo);
    setIsFollowUpOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm">Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4 max-w-md mx-auto">
        <UserPlus className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Lead Not Found</h3>
        <p className="text-xs text-gray-500">The requested lead ID could not be retrieved.</p>
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] rounded-lg"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  const closed = isTerminalStatus(lead.status) && lead.status !== 'Service Taken';
  const currentTier = statusTier(lead.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Call {lead.phone}</span>
          </a>
          <button
            type="button"
            onClick={() => navigate(`/leads/edit/${lead.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={openFollowUpModal}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Follow-up</span>
          </button>
        </div>
      </div>

      {/* Lead Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">{lead.customerName}</h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">{lead.leadNumber}</p>
            {lead.vehicleModel && (
              <p className="text-xs text-gray-600 mt-1 inline-flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-gray-400" /> {lead.vehicleModel}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Source</span>
              <span className="font-semibold text-gray-800">{lead.source}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Lead Date</span>
              <span className="font-semibold text-gray-800">{formatDate(lead.leadDate)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Assigned Staff</span>
              <select
                value={lead.assignedTo}
                onChange={e => handleAssign(e.target.value)}
                className="text-xs font-semibold text-gray-800 border border-gray-200 rounded-md px-1.5 py-0.5 mt-0.5 bg-white"
              >
                {LEAD_STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Next Follow-up</span>
              <span className="font-semibold text-gray-800">
                {lead.nextFollowUpDate ? formatDate(lead.nextFollowUpDate) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Journey Progress */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading mb-4">
          Lead Journey
        </h3>
        {closed ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">This lead is closed ({lead.status}). No further follow-up is expected.</span>
          </div>
        ) : (
          <div className="flex items-center overflow-x-auto pb-1">
            {JOURNEY_STAGES.map((stage, idx) => {
              const stageTier = stage === 'New' ? 0 : stage === 'Called' ? 1 : stage === 'Interested' ? 2 : stage === 'Visit Agreed' ? 3 : stage === 'Visited' ? 4 : 5;
              const reached = currentTier >= stageTier;
              const isCurrent = currentTier === stageTier || (stage === 'Called' && currentTier === 1);
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-24">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        reached
                          ? isCurrent
                            ? 'bg-[#C1121F] border-[#C1121F] text-white'
                            : 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}
                    >
                      {reached && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] font-semibold text-center ${reached ? 'text-gray-900' : 'text-gray-400'}`}>
                      {stage}
                    </span>
                  </div>
                  {idx < JOURNEY_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 min-w-6 ${currentTier > stageTier ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
        {lead.status === 'No Answer' && !closed && (
          <p className="text-[11px] text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mt-3">
            Customer did not answer on the last attempt. A follow-up is needed to re-attempt contact.
          </p>
        )}
      </div>

      {/* Customer Inquiry */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#C1121F]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">Customer Inquiry</h3>
        </div>
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3.5 italic">
          {lead.inquiry ? `"${lead.inquiry}"` : 'No inquiry text recorded.'}
        </p>
        {lead.notes && (
          <div className="pt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notes</span>
            <p className="text-xs text-gray-600 mt-0.5">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Follow-up History Timeline */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Follow-up History
            </h3>
          </div>
          <button
            type="button"
            onClick={openFollowUpModal}
            className="text-xs font-semibold text-[#C1121F] hover:underline"
          >
            + Add Follow-up
          </button>
        </div>

        {sortedFollowUps.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">No follow-ups recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {sortedFollowUps.map((fu, idx) => (
              <div key={fu.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C1121F] mt-1.5 shrink-0" />
                  {idx < sortedFollowUps.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
                </div>
                <div className="pb-5 min-w-0">
                  <p className="text-xs font-bold text-gray-900">
                    {formatDate(fu.contactDate)} <span className="text-gray-400 font-normal">— {fu.staffId}</span>
                  </p>
                  <div className="mt-0.5"><LeadStatusBadge status={fu.status} size="sm" /></div>
                  <p className="text-xs text-gray-600 mt-1">{fu.note}</p>
                  {fu.nextFollowUpDate && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Next follow-up: {formatDate(fu.nextFollowUpDate)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convert to Customer */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 font-heading">Customer Conversion</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {lead.customerId
              ? 'This lead is linked to a customer record.'
              : 'Once the customer agrees to visit or takes a service, convert them into a customer record.'}
          </p>
        </div>
        {lead.customerId ? (
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>View in Customers</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConvertToCustomer}
            disabled={isConverting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isConverting ? 'Converting...' : 'Convert to Customer'}</span>
          </button>
        )}
      </div>

      {/* Related Records */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-2 border-b border-gray-100">
          Related Records
        </h3>

        {/* Job Card */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <ClipboardCheck className="w-4 h-4 text-gray-400" />
            <span>Job Card</span>
          </div>
          {lead.jobCardId ? (
            <button
              type="button"
              onClick={() => navigate(`/job-cards/${lead.jobCardId}`)}
              className="text-xs font-mono font-bold text-[#C1121F] hover:underline"
            >
              {lead.jobCardNumber}
            </button>
          ) : (
            <select
              defaultValue=""
              onChange={e => handleLink('jobCard', e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded-lg bg-white max-w-[60%]"
            >
              <option value="" disabled>Link existing job card...</option>
              {jobCards.map(jc => <option key={jc.id} value={jc.id}>{jc.jobCardNumber} — {jc.customerName}</option>)}
            </select>
          )}
        </div>

        {/* Quotation */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span>Quotation</span>
          </div>
          {lead.quotationId ? (
            <button
              type="button"
              onClick={() => navigate(`/quotations/${lead.quotationId}`)}
              className="text-xs font-mono font-bold text-[#C1121F] hover:underline"
            >
              {lead.quotationNumber}
            </button>
          ) : (
            <select
              defaultValue=""
              onChange={e => handleLink('quotation', e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded-lg bg-white max-w-[60%]"
            >
              <option value="" disabled>Link existing quotation...</option>
              {quotations.map(qt => <option key={qt.id} value={qt.id}>{qt.quotationNumber} — {qt.customerName}</option>)}
            </select>
          )}
        </div>

        {/* Invoice */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <FileText className="w-4 h-4 text-gray-400" />
            <span>Invoice</span>
          </div>
          {lead.invoiceId ? (
            <button
              type="button"
              onClick={() => navigate(`/invoices/${lead.invoiceId}`)}
              className="text-xs font-mono font-bold text-[#C1121F] hover:underline"
            >
              {lead.invoiceNumber}
            </button>
          ) : (
            <select
              defaultValue=""
              onChange={e => handleLink('invoice', e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded-lg bg-white max-w-[60%]"
            >
              <option value="" disabled>Link existing invoice...</option>
              {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.customerName}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Add Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Add Follow-up"
        subtitle={`${lead.customerName} • ${lead.leadNumber}`}
        maxWidth="md"
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Date</label>
              <input
                type="date"
                value={fuDate}
                onChange={e => setFuDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Called By</label>
              <select
                value={fuStaff}
                onChange={e => setFuStaff(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                {LEAD_STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">New Status</label>
            <select
              value={fuStatus}
              onChange={e => setFuStatus(e.target.value as LeadStatus)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              {LEAD_STATUSES.filter(s => s !== 'New').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Follow-up Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={fuNote}
              onChange={e => setFuNote(e.target.value)}
              placeholder="e.g. Customer interested in full car wash. Will visit after office."
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {isVisitStatus && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Date</label>
                <input
                  type="date"
                  value={fuVisitDate}
                  onChange={e => setFuVisitDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Time</label>
                <input
                  type="time"
                  value={fuVisitTime}
                  onChange={e => setFuVisitTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {!isFuTerminal && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Next Follow-up (Optional)</label>
              <input
                type="date"
                value={fuNextFollowUp}
                onChange={e => setFuNextFollowUp(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsFollowUpOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddFollowUp}
              disabled={isSavingFollowUp}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isSavingFollowUp ? 'Saving...' : 'Save Follow-up'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
