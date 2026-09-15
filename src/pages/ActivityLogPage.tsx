import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, ShieldAlert } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ActivityLog } from '../types';

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  create: 'Created',
  create_draft: 'Created (Draft)',
  update: 'Edited',
  delete: 'Deleted',
  status_change: 'Status Changed',
  payment: 'Payment Recorded',
  convert: 'Converted',
  reset_password: 'Password Reset'
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-gray-100 text-gray-700',
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  create_draft: 'bg-amber-50 text-amber-700 border-amber-200',
  update: 'bg-blue-50 text-blue-700 border-blue-200',
  delete: 'bg-rose-50 text-rose-700 border-rose-200',
  status_change: 'bg-purple-50 text-purple-700 border-purple-200',
  payment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  convert: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  reset_password: 'bg-orange-50 text-orange-700 border-orange-200'
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  job_card: 'Job Card',
  customer: 'Customer',
  user: 'User',
  auth: 'Auth'
};

const formatTimestamp = (value: string) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export const ActivityLogPage: React.FC = () => {
  const { refreshTrigger } = useApp();
  const { isSuperAdmin } = useAuth();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!isSuperAdmin) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getActivityLogs(300);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshTrigger, isSuperAdmin]);

  const actionOptions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);
  const entityOptions = useMemo(() => Array.from(new Set(logs.map(l => l.entityType))), [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(l => {
      const matchesSearch =
        !q ||
        l.description.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.entityLabel || '').toLowerCase().includes(q);
      const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
      const matchesEntity = entityFilter === 'ALL' || l.entityType === entityFilter;
      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [logs, search, actionFilter, entityFilter]);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Super Admin Only</h3>
        <p className="text-xs text-gray-500">Only a Super Admin can view the activity log.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-gray-900 flex items-center gap-2.5">
          <History className="w-6 h-6 text-[#C1121F]" />
          Activity Log
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          A record of key actions taken by staff and admin accounts across NextGarage.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, description, or reference..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
        >
          <option value="ALL">All Actions</option>
          {actionOptions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
        >
          <option value="ALL">All Types</option>
          {entityOptions.map(t => (
            <option key={t} value={t}>{ENTITY_TYPE_LABELS[t] || t}</option>
          ))}
        </select>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading activity log...</div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity found"
            description="No actions match your search or selected filters."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-3.5 sm:p-4 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                <span
                  className={`shrink-0 mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-900 leading-snug">{log.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                    {formatTimestamp(log.createdAt)} · {log.userRole === 'super_admin' ? 'Super Admin' : 'Staff'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
