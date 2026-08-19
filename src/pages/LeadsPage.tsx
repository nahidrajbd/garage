import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Plus,
  Search,
  Eye,
  Phone,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { LeadStatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { leadsService } from '../services/leadsService';
import { LEAD_STATUSES } from '../mock/leadsData';
import { Lead, LeadStatus } from '../types';
import { formatDate } from '../utils/formatters';

const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

type ViewFilter = 'All' | 'Today' | 'Overdue' | LeadStatus;

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger } = useApp();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const leadList = await leadsService.getLeads();
        setLeads(leadList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const today = toDateStr(new Date());

  const followUpsToday = useMemo(
    () => leads.filter(l => l.nextFollowUpDate === today),
    [leads, today]
  );

  const overdueFollowUps = useMemo(
    () =>
      leads.filter(
        l => l.nextFollowUpDate && l.nextFollowUpDate < today &&
          l.status !== 'Service Taken' && l.status !== 'Not Interested' && l.status !== 'Lost'
      ),
    [leads, today]
  );

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (viewFilter === 'Today') {
      result = result.filter(l => l.nextFollowUpDate === today);
    } else if (viewFilter === 'Overdue') {
      result = overdueFollowUps;
    } else if (viewFilter !== 'All') {
      result = result.filter(l => l.status === viewFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        l =>
          l.customerName.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.leadNumber.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, viewFilter, search, today, overdueFollowUps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Lead Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Customer inquiries and who to call next
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/leads/new')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Lead</span>
        </button>
      </div>

      {/* Follow-ups Today & Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Clock className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Call Today ({followUpsToday.length})
            </h3>
          </div>
          {followUpsToday.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No calls scheduled for today.</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {followUpsToday.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-lg px-1.5 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{lead.customerName}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {lead.vehicleModel || 'Vehicle N/A'}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Overdue ({overdueFollowUps.length})
            </h3>
          </div>
          {overdueFollowUps.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No overdue calls. Good job!</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {overdueFollowUps.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-amber-50/60 rounded-lg px-1.5 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{lead.customerName}</p>
                    <p className="text-[11px] text-amber-700 font-medium truncate">
                      Was due {formatDate(lead.nextFollowUpDate)}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or lead ID..."
            className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <select
          value={viewFilter}
          onChange={e => setViewFilter(e.target.value as ViewFilter)}
          className="text-xs sm:text-sm px-3 py-2.5 border border-gray-300 rounded-xl bg-white sm:w-56"
        >
          <option value="All">All Leads</option>
          <option value="Today">Call Today</option>
          <option value="Overdue">Overdue</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Lead List */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No leads found"
            description="No leads matched your search or filter."
            actionText="+ New Lead"
            onAction={() => navigate('/leads/new')}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Lead</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Next Call</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map(lead => (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-gray-900">{lead.customerName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{lead.leadNumber}{lead.vehicleModel ? ` • ${lead.vehicleModel}` : ''}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-gray-700">{lead.phone}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap"><LeadStatusBadge status={lead.status} size="sm" /></td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lead.nextFollowUpDate ? (
                          <span className={lead.nextFollowUpDate < today ? 'text-amber-700 font-semibold' : 'text-gray-600'}>
                            {formatDate(lead.nextFollowUpDate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Lead"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="p-4 space-y-2 active:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{lead.customerName}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{lead.leadNumber}</p>
                    </div>
                    <LeadStatusBadge status={lead.status} size="sm" />
                  </div>
                  <p className="text-xs text-gray-600">
                    {lead.vehicleModel || 'Vehicle N/A'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Next: {lead.nextFollowUpDate ? formatDate(lead.nextFollowUpDate) : '—'}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
