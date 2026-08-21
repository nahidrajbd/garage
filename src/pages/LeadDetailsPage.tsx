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
  MessageSquare,
  MessageCircle,
  Clock,
  XCircle,
  Send,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { LeadStatusBadge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { leadsService, statusTier, isTerminalStatus } from '../services/leadsService';
import { LEAD_STAFF_NAMES, LEAD_STATUSES } from '../mock/leadsData';
import { Lead, LeadStatus } from '../types';
import { formatDate } from '../utils/formatters';

const JOURNEY_STAGES: LeadStatus[] = ['New', 'Called', 'Interested', 'Visit Agreed', 'Visited', 'Service Taken'];

export const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, triggerRefresh, refreshTrigger } = useApp();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [fuStatus, setFuStatus] = useState<LeadStatus>('Called');
  const [fuDate, setFuDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuStaff, setFuStaff] = useState(LEAD_STAFF_NAMES[0] || '');
  const [fuNote, setFuNote] = useState('');
  const [fuNextFollowUp, setFuNextFollowUp] = useState('');
  const [fuVisitDate, setFuVisitDate] = useState('');
  const [fuVisitTime, setFuVisitTime] = useState('');
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);

  const [fbReplyText, setFbReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const ld = await leadsService.getLeadById(id);
        if (ld) {
          setLead(ld);
          const lastFollowUp = [...ld.followUps].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).pop();
          if (lastFollowUp) setFuStaff(lastFollowUp.staffId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, refreshTrigger]);

  const isVisitStatus = fuStatus === 'Visit Agreed' || fuStatus === 'Visit Scheduled' || fuStatus === 'Visited';
  const isFuTerminal = isTerminalStatus(fuStatus);

  const handleAddFollowUp = async () => {
    if (!lead) return;
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

  const handleSendFacebookReply = async () => {
    if (!lead || !fbReplyText.trim()) return;
    setIsSendingReply(true);
    try {
      const updated = await leadsService.sendFacebookReply(lead.id, fbReplyText.trim());
      if (updated) {
        setLead(updated);
        setFbReplyText('');
        showToast('Message sent on Facebook', 'success');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    } finally {
      setIsSendingReply(false);
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

  const sortedFollowUps = useMemo(() => {
    if (!lead) return [];
    return [...lead.followUps].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [lead]);

  const messengerThread = useMemo(() => sortedFollowUps.filter(fu => fu.channel === 'facebook'), [sortedFollowUps]);
  const callHistory = useMemo(() => sortedFollowUps.filter(fu => fu.channel !== 'facebook'), [sortedFollowUps]);

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const openFollowUpModal = () => {
    if (!lead) return;
    setFuStatus(lead.status === 'New' ? 'Called' : lead.status);
    setFuDate(new Date().toISOString().split('T')[0]);
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
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call {lead.phone}</span>
            </a>
          )}
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

      {/* Messenger Conversation */}
      {lead.fbPsid && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
            <MessageCircle className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">Messenger Conversation</h3>
          </div>

          {messengerThread.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No messages yet.</p>
          ) : (
            <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto bg-gray-50/60">
              {messengerThread.map(fu => (
                <div key={fu.id} className={`flex ${fu.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                    fu.direction === 'outbound'
                      ? 'bg-[#C1121F] text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{fu.note}</p>
                    <p className={`text-[10px] mt-1 ${fu.direction === 'outbound' ? 'text-red-100' : 'text-gray-400'}`}>
                      {fu.direction === 'outbound' ? fu.staffId : lead.customerName} &middot; {formatTime(fu.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-gray-100 space-y-1.5">
            <div className="flex gap-2">
              <textarea
                rows={1}
                value={fbReplyText}
                onChange={e => setFbReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendFacebookReply();
                  }
                }}
                placeholder="Type a reply to send on Messenger..."
                className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleSendFacebookReply}
                disabled={isSendingReply || !fbReplyText.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-lg shadow-xs transition-colors disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingReply ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Facebook only allows replies within 24 hours of the customer's last message.
            </p>
          </div>
        </div>
      )}

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

        {callHistory.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">No follow-ups recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {callHistory.map((fu, idx) => (
              <div key={fu.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C1121F] mt-1.5 shrink-0" />
                  {idx < callHistory.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
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

      {/* Add Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Add Follow-up"
        subtitle={`${lead.customerName} • ${lead.leadNumber}`}
        maxWidth="md"
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">What happened?</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LEAD_STATUSES.filter(s => s !== 'New').map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFuStatus(s)}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-lg border text-center transition-colors ${
                    fuStatus === s
                      ? 'bg-[#C1121F] border-[#C1121F] text-white'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={fuNote}
              onChange={e => setFuNote(e.target.value)}
              placeholder="e.g. Interested in full car wash, will visit after office."
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>

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
