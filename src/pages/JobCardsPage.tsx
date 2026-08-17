import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  Truck, 
  Calendar,
  Edit3,
  User,
  Car
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { JobCardStatusBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { JobCard, JobCardStatus } from '../types';
import { formatDate } from '../utils/formatters';

export const JobCardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger, showToast, triggerRefresh } = useApp();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Deletion
  const [cardToDelete, setCardToDelete] = useState<JobCard | null>(null);

  useEffect(() => {
    const fetchJobCards = async () => {
      setLoading(true);
      try {
        const data = await api.getJobCards();
        setJobCards(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobCards();
  }, [refreshTrigger]);

  const filteredJobCards = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    return jobCards.filter(jc => {
      const q = search.toLowerCase();
      const matchesSearch = 
        jc.jobCardNumber.toLowerCase().includes(q) ||
        jc.customerName.toLowerCase().includes(q) ||
        jc.customerPhone.toLowerCase().includes(q) ||
        jc.vehicleRegistration.toLowerCase().includes(q) ||
        jc.vehicleModel.toLowerCase().includes(q) ||
        jc.assignedTo.toLowerCase().includes(q) ||
        jc.requiredWork.some(w => w.serviceName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || jc.status === statusFilter;

      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        matchesDate = jc.date === todayStr;
      } else if (dateFilter === 'WEEK') {
        matchesDate = jc.date >= oneWeekAgo && jc.date <= todayStr;
      } else if (dateFilter === 'MONTH') {
        matchesDate = jc.date.startsWith(currentMonthStr);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [jobCards, search, statusFilter, dateFilter]);

  // Summaries
  const todayStr = new Date().toISOString().split('T')[0];
  const waitingCount = jobCards.filter(j => j.status === 'Waiting').length;
  const inProgressCount = jobCards.filter(j => j.status === 'In Progress').length;
  const activeCount = waitingCount + inProgressCount;
  const completedTodayCount = jobCards.filter(
    j => (j.status === 'Completed' || j.status === 'Delivered') && j.date === todayStr
  ).length;

  const handleDelete = async () => {
    if (!cardToDelete) return;
    try {
      await api.deleteJobCard(cardToDelete.id);
      showToast(`Job Card ${cardToDelete.jobCardNumber} deleted`, 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete job card', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Job Card Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Workshop Job Cards
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track active repair jobs, customer complaints, technician assignments, and vehicle statuses
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/job-cards/new')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Job Card</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Job Cards"
          value={activeCount}
          subtitle="Currently inside workshop"
          icon={ClipboardCheck}
          variant="primary"
        />

        <StatCard
          title="Waiting for Service"
          value={waitingCount}
          subtitle="In queue / inspection"
          icon={Clock}
          variant="default"
        />

        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Technicians currently working"
          icon={Wrench}
          variant="warning"
        />

        <StatCard
          title="Completed Today"
          value={completedTodayCount}
          subtitle="Finished or delivered today"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search job card #, customer, phone, vehicle, or technician..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Date Filter Dropdown */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-red-500 bg-white font-medium text-gray-700"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
          </select>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {['ALL', 'Waiting', 'In Progress', 'Completed', 'Delivered', 'Cancelled'].map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Job Cards Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredJobCards.length === 0 ? (
          <EmptyState
            title="No job cards found"
            description="No job cards match your search query or selected filter."
            actionText="+ Create New Job Card"
            onAction={() => navigate('/job-cards/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/70 text-gray-500 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Job Card No.</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Work / Request</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredJobCards.map(jc => (
                  <tr key={jc.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/job-cards/${jc.id}`)}
                        className="font-mono font-bold text-gray-900 hover:text-[#C1121F] hover:underline"
                      >
                        {jc.jobCardNumber}
                      </button>
                      {jc.mileage && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          {jc.mileage}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                      <div>{formatDate(jc.date)}</div>
                      {jc.expectedDeliveryDate && (
                        <div className="text-[10px] text-gray-400">
                          Due: {formatDate(jc.expectedDeliveryDate)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{jc.customerName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{jc.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{jc.vehicleModel}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{jc.vehicleRegistration}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-gray-900 truncate">
                        {jc.requiredWork.map(w => w.serviceName).join(', ') || 'General Inspection'}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {jc.customerComplaint}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-700">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        {jc.assignedTo}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <JobCardStatusBadge status={jc.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/job-cards/${jc.id}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View / Print Job Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/job-cards/edit/${jc.id}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Job Card"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardToDelete(jc)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Job Card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Job Card"
        message={`Are you sure you want to delete job card ${cardToDelete?.jobCardNumber} for ${cardToDelete?.customerName}?`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};
