import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Plus,
  Search,
  Eye,
  Phone,
  Users,
  Sparkles,
  ClipboardCheck,
  CalendarCheck,
  Wrench,
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { LeadStatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { leadsService } from '../services/leadsService';
import { LEAD_STAFF_NAMES, LEAD_SOURCES, LEAD_STATUSES } from '../mock/leadsData';
import { Lead, LeadStats, LeadStatus } from '../types';
import { formatDate } from '../utils/formatters';

type DatePreset = 'All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Last Month' | 'Custom';

const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

function computeDateRange(preset: DatePreset, customStart: string, customEnd: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = toDateStr(now);
  switch (preset) {
    case 'Today':
      return { startDate: today, endDate: today };
    case 'Yesterday': {
      const y = toDateStr(new Date(now.getTime() - 86400000));
      return { startDate: y, endDate: y };
    }
    case 'This Week': {
      const day = now.getDay(); // 0 = Sunday
      const start = toDateStr(new Date(now.getTime() - day * 86400000));
      return { startDate: start, endDate: today };
    }
    case 'This Month': {
      const start = `${today.substring(0, 7)}-01`;
      return { startDate: start, endDate: today };
    }
    case 'Last Month': {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 86400000);
      const start = `${toDateStr(lastOfPrevMonth).substring(0, 7)}-01`;
      return { startDate: start, endDate: toDateStr(lastOfPrevMonth) };
    }
    case 'Custom':
      return { startDate: customStart || undefined, endDate: customEnd || undefined };
    case 'All Time':
    default:
      return {};
  }
}

const QUICK_FILTERS: Array<{ label: string; value: 'All' | 'Follow-up Today' | LeadStatus }> = [
  { label: 'All', value: 'All' },
  { label: 'New', value: 'New' },
  { label: 'Follow-up Today', value: 'Follow-up Today' },
  { label: 'No Answer', value: 'No Answer' },
  { label: 'Interested', value: 'Interested' },
  { label: 'Visit Agreed', value: 'Visit Agreed' },
  { label: 'Visited', value: 'Visited' },
  { label: 'Service Taken', value: 'Service Taken' },
  { label: 'Not Interested', value: 'Not Interested' },
  { label: 'Lost', value: 'Lost' },
];

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger } = useApp();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [datePreset, setDatePreset] = useState<DatePreset>('All Time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [quickFilter, setQuickFilter] = useState<'All' | 'Follow-up Today' | LeadStatus>('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [search, setSearch] = useState('');

  const range = useMemo(() => computeDateRange(datePreset, customStart, customEnd), [datePreset, customStart, customEnd]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leadList, leadStats] = await Promise.all([
          leadsService.getLeads(),
          leadsService.getLeadStats(range),
        ]);
        setLeads(leadList);
        setStats(leadStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger, range]);

  const today = toDateStr(new Date());

  const dateFilteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (range.startDate && l.leadDate < range.startDate) return false;
      if (range.endDate && l.leadDate > range.endDate) return false;
      return true;
    });
  }, [leads, range]);

  const followUpsToday = useMemo(
    () => dateFilteredLeads.filter(l => l.nextFollowUpDate === today),
    [dateFilteredLeads, today]
  );

  const overdueFollowUps = useMemo(
    () =>
      dateFilteredLeads.filter(
        l => l.nextFollowUpDate && l.nextFollowUpDate < today &&
          l.status !== 'Service Taken' && l.status !== 'Not Interested' && l.status !== 'Lost'
      ),
    [dateFilteredLeads, today]
  );

  const filteredLeads = useMemo(() => {
    let result = dateFilteredLeads;

    if (quickFilter === 'Follow-up Today') {
      result = result.filter(l => l.nextFollowUpDate === today);
    } else if (quickFilter !== 'All') {
      result = result.filter(l => l.status === quickFilter);
    }

    if (staffFilter !== 'All') {
      result = result.filter(l => l.assignedTo === staffFilter);
    }
    if (sourceFilter !== 'All') {
      result = result.filter(l => l.source === sourceFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        l =>
          l.customerName.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.leadNumber.toLowerCase().includes(q) ||
          l.inquiry.toLowerCase().includes(q)
      );
    }

    return result;
  }, [dateFilteredLeads, quickFilter, staffFilter, sourceFilter, search, today]);

  const funnelStages = stats
    ? [
        { label: 'Total Leads', value: stats.funnel.total, icon: Users },
        { label: 'Contacted', value: stats.funnel.contacted, icon: Phone },
        { label: 'Interested', value: stats.funnel.interested, icon: Sparkles },
        { label: 'Visit Agreed', value: stats.funnel.visitAgreed, icon: CalendarCheck },
        { label: 'Visited', value: stats.funnel.visited, icon: ClipboardCheck },
        { label: 'Service Taken', value: stats.funnel.serviceTaken, icon: Wrench },
      ]
    : [];
  const funnelMax = funnelStages.length > 0 ? Math.max(1, funnelStages[0].value) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Lead Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track Facebook inquiries and staff follow-ups from first contact to service
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={datePreset}
            onChange={e => setDatePreset(e.target.value as DatePreset)}
            className="text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-1 focus:ring-red-500 bg-white"
          >
            {(['All Time', 'Today', 'Yesterday', 'This Week', 'This Month', 'Last Month', 'Custom'] as DatePreset[]).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {datePreset === 'Custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="text-xs px-2.5 py-2.5 border border-gray-300 rounded-xl"
              />
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="text-xs px-2.5 py-2.5 border border-gray-300 rounded-xl"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => navigate('/leads/new')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Lead</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard title="Total Leads" value={stats?.totalLeads ?? 0} icon={Users} variant="primary" />
        <StatCard title="New" value={stats?.newCount ?? 0} icon={Sparkles} variant="default" />
        <StatCard title="Follow-up Required" value={stats?.followUpRequiredCount ?? 0} icon={Clock} variant="warning" />
        <StatCard title="Visit Agreed" value={stats?.visitAgreedCount ?? 0} icon={CalendarCheck} variant="default" />
        <StatCard title="Visited" value={stats?.visitedCount ?? 0} icon={ClipboardCheck} variant="default" />
        <StatCard title="Service Taken" value={stats?.serviceTakenCount ?? 0} icon={Wrench} variant="success" />
      </div>

      {/* Lead Funnel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
          Lead Funnel
        </h3>
        <div className="space-y-3">
          {funnelStages.map(stage => {
            const Icon = stage.icon;
            const widthPct = Math.max(4, Math.round((stage.value / funnelMax) * 100));
            return (
              <div key={stage.label} className="flex items-center gap-3">
                <div className="w-32 sm:w-36 shrink-0 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{stage.label}</span>
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-[#C1121F]/85 rounded-lg transition-all flex items-center justify-end px-2"
                    style={{ width: `${widthPct}%` }}
                  >
                    <span className="text-[11px] font-bold text-white">{stage.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lost / Unresponsive */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-100">
            <p className="text-lg font-bold text-orange-700 font-heading">{stats?.funnel.noAnswer ?? 0}</p>
            <p className="text-[11px] text-orange-700 font-medium">No Answer</p>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-lg font-bold text-rose-700 font-heading">{stats?.funnel.notInterested ?? 0}</p>
            <p className="text-[11px] text-rose-700 font-medium">Not Interested</p>
          </div>
          <div className="p-2.5 bg-gray-100 rounded-xl border border-gray-200">
            <p className="text-lg font-bold text-gray-700 font-heading">{stats?.funnel.lost ?? 0}</p>
            <p className="text-[11px] text-gray-600 font-medium">Lost</p>
          </div>
        </div>
      </div>

      {/* Follow-ups Today & Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Clock className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Follow-ups Today ({followUpsToday.length})
            </h3>
          </div>
          {followUpsToday.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No follow-ups scheduled for today.</p>
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
                      {lead.vehicleModel || 'Vehicle N/A'} • Assigned to {lead.assignedTo}
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
              Overdue Follow-ups ({overdueFollowUps.length})
            </h3>
          </div>
          {overdueFollowUps.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No overdue follow-ups. Good job!</p>
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
                      Was due {formatDate(lead.nextFollowUpDate)} • {lead.assignedTo}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, lead ID, or inquiry text..."
            className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white"
          >
            <option value="All">All Staff</option>
            {LEAD_STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white"
          >
            <option value="All">All Sources</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={LEAD_STATUSES.includes(quickFilter as LeadStatus) ? quickFilter : 'All'}
            onChange={e => setQuickFilter(e.target.value as LeadStatus | 'All')}
            className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white"
          >
            <option value="All">All Statuses</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {QUICK_FILTERS.map(f => (
            <button
              key={f.label}
              type="button"
              onClick={() => setQuickFilter(f.value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                quickFilter === f.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lead List */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No leads found"
            description="No leads matched your filters. Try adjusting the search or filters above."
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
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">Assigned To</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Contact</th>
                    <th className="py-3.5 px-4">Next Follow-up</th>
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
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">{lead.source}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-700 font-medium">{lead.assignedTo}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap"><LeadStatusBadge status={lead.status} size="sm" /></td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">{lead.lastContactDate ? formatDate(lead.lastContactDate) : '—'}</td>
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
                    {lead.vehicleModel || 'Vehicle N/A'} • {lead.source} • {lead.assignedTo}
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

      {/* Staff Performance */}
      {stats && stats.staffPerformance.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-3 border-b border-gray-100 mb-3">
            Staff Performance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.staffPerformance.map(sp => (
              <div key={sp.staff} className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80">
                <p className="text-sm font-bold text-gray-900">{sp.staff}</p>
                <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                  <div className="flex justify-between"><span>Leads</span><strong className="text-gray-900">{sp.total}</strong></div>
                  <div className="flex justify-between"><span>Contacted</span><strong className="text-gray-900">{sp.contacted}</strong></div>
                  <div className="flex justify-between"><span>Visit Agreed</span><strong className="text-gray-900">{sp.visitAgreed}</strong></div>
                  <div className="flex justify-between"><span>Visited</span><strong className="text-gray-900">{sp.visited}</strong></div>
                  <div className="flex justify-between"><span>Service Taken</span><strong className="text-emerald-700">{sp.serviceTaken}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Basic Lead Metrics */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
          <TrendingUp className="w-4 h-4 text-[#C1121F]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
            Conversion Metrics
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 text-center">
            <p className="text-2xl font-heading font-bold text-gray-900">{stats?.contactRate ?? 0}%</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Contact Rate</p>
          </div>
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 text-center">
            <p className="text-2xl font-heading font-bold text-gray-900">{stats?.visitAgreementRate ?? 0}%</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Visit Agreement Rate</p>
          </div>
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 text-center">
            <p className="text-2xl font-heading font-bold text-gray-900">{stats?.visitRate ?? 0}%</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Visit Rate</p>
          </div>
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 text-center">
            <p className="text-2xl font-heading font-bold text-emerald-700">{stats?.serviceConversionRate ?? 0}%</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Service Conversion Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};
