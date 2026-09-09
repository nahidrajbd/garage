import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  Edit3,
  Wrench,
  CheckCircle2,
  FileText,
  ClipboardList,
  Camera,
  Phone,
  MapPin,
  Car,
  User,
  AlertCircle,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { JobCardStatusBadge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { JobCard, Settings, JobCardStatus } from '../types';
import { formatDate } from '../utils/formatters';

export const JobCardDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, triggerRefresh, refreshTrigger } = useApp();

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [jc, sett] = await Promise.all([
          api.getJobCardById(id),
          api.getSettings()
        ]);
        if (jc) setJobCard(jc);
        if (sett) setSettings(sett);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, refreshTrigger]);

  // Auto-trigger print if query param is set
  useEffect(() => {
    if (searchParams.get('print') === 'true' && jobCard) {
      setTimeout(() => {
        window.print();
      }, 400);
    }
  }, [searchParams, jobCard]);

  const handleUpdateStatus = async (newStatus: JobCardStatus) => {
    if (!jobCard) return;
    try {
      const updated = await api.updateJobCardStatus(jobCard.id, newStatus);
      if (updated) {
        setJobCard(prev => (prev ? { ...prev, ...updated } : updated));
        showToast(`Job Card status updated to ${newStatus}`, 'success');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleCreateQuotation = () => {
    if (!jobCard) return;
    navigate(`/quotations/new?fromJobCard=${jobCard.id}`);
  };

  const handleCreateInvoice = () => {
    if (!jobCard) return;
    navigate(`/invoices/new?fromJobCard=${jobCard.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm">Loading job card details...</div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4 max-w-md mx-auto">
        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Job Card Not Found</h3>
        <p className="text-xs text-gray-500">The requested job card ID could not be retrieved.</p>
        <button
          type="button"
          onClick={() => navigate('/job-cards')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] rounded-lg"
        >
          Back to Job Cards
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/job-cards')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Job Cards</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Status Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {jobCard.status !== 'In Progress' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('In Progress')}
                className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-white rounded-lg transition-colors inline-flex items-center gap-1"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>In Progress</span>
              </button>
            )}
            {jobCard.status !== 'Completed' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('Completed')}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-white rounded-lg transition-colors inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
              </button>
            )}
          </div>

          {/* Edit */}
          <button
            type="button"
            onClick={() => navigate(`/job-cards/edit/${jobCard.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
            <span>Edit</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Job Card</span>
          </button>

          {/* Create Quotation */}
          <button
            type="button"
            onClick={handleCreateQuotation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
            title="Create pre-filled Quotation from this Job Card"
          >
            <ClipboardList className="w-4 h-4" />
            <span>+ Create Quotation</span>
          </button>

          {/* Create Invoice */}
          <button
            type="button"
            onClick={handleCreateInvoice}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-xl shadow-xs transition-colors"
            title="Create pre-filled Invoice from this Job Card"
          >
            <FileText className="w-4 h-4" />
            <span>+ Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Connected Documents Relationship Banner (Hidden on Print) */}
      {(jobCard.quotationId || jobCard.invoiceId) && (
        <div className="no-print p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <span>Linked Documents:</span>
          </div>

          <div className="flex items-center gap-2">
            {jobCard.quotationId && (
              <button
                type="button"
                onClick={() => navigate(`/quotations/${jobCard.quotationId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-mono font-bold transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Quotation: {jobCard.quotationNumber || 'QT'}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            )}

            {jobCard.invoiceId && (
              <button
                type="button"
                onClick={() => navigate(`/invoices/${jobCard.invoiceId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-mono font-bold transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice: {jobCard.invoiceNumber || 'INV'}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Job Card Sheet */}
      <div className="printable-invoice bg-white p-8 sm:p-10 rounded-2xl border border-gray-200/90 shadow-md text-gray-900 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#C1121F] uppercase font-mono">
                NEXTGARAGE
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <div className="w-8 h-8 rounded-lg bg-[#C1121F] flex items-center justify-center text-white shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-extrabold font-heading text-gray-900 tracking-tight uppercase">
                {settings?.businessName || 'Arshi Automobile & Car Hub'}
              </h1>
            </div>
            <p className="text-xs font-medium text-gray-600 mt-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C1121F] shrink-0" />
              <span>{settings?.address || 'Rajshahi, Bangladesh'}</span>
            </p>
            <p className="text-xs font-medium text-gray-800 mt-1 flex items-center gap-1.5 font-mono">
              <Phone className="w-3.5 h-3.5 text-[#C1121F] shrink-0" />
              <span>Phone: {settings?.phone || '01712110902'}</span>
              {settings?.altPhone && <span>/ {settings.altPhone}</span>}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="inline-block bg-gray-900 text-white font-mono text-xs px-3 py-1 rounded font-bold uppercase tracking-wider mb-1">
              WORKSHOP JOB CARD
            </div>
            <p className="font-mono text-lg font-extrabold text-[#C1121F]">
              {jobCard.jobCardNumber}
            </p>
            <p className="text-xs text-gray-600">
              Intake Date: <strong>{formatDate(jobCard.date)}</strong>
            </p>
            {jobCard.expectedDeliveryDate && (
              <p className="text-xs text-gray-600">
                Expected Delivery: <strong>{formatDate(jobCard.expectedDeliveryDate)}</strong>
              </p>
            )}
            <div className="pt-1">
              <JobCardStatusBadge status={jobCard.status} />
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-gray-200 text-xs">
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Customer Information
            </p>
            <p className="text-sm font-bold text-gray-900">{jobCard.customerName}</p>
            <p className="font-mono text-gray-600">Phone: {jobCard.customerPhone}</p>
          </div>

          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Vehicle & Assignment
            </p>
            <p className="text-sm font-bold text-gray-900">{jobCard.vehicleModel}</p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-mono font-medium text-gray-800 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                {jobCard.vehicleRegistration}
              </span>
              {jobCard.mileage && (
                <span className="font-mono text-gray-500">
                  Mileage: {jobCard.mileage}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 pt-1">
              Assigned To: <strong className="text-gray-900">{jobCard.assignedTo}</strong>
            </p>
          </div>
        </div>

        {/* Customer Complaint / Request */}
        <div className="py-5 border-b border-gray-200 space-y-1.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-heading">
            Customer Complaint / Request
          </p>
          <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-100 text-gray-900 text-xs leading-relaxed font-medium">
            {jobCard.customerComplaint}
          </div>
        </div>

        {/* Required Work Table */}
        <div className="py-5 border-b border-gray-200 space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-heading">
            Required Work / Tasks Checklist
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600 uppercase text-[10px] font-bold">
                  <th className="py-2 px-2 w-10 text-center">#</th>
                  <th className="py-2 px-2 w-1/3">Service / Task</th>
                  <th className="py-2 px-2">Work Scope / Details</th>
                  <th className="py-2 px-2 w-20 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobCard.requiredWork.map((work, idx) => (
                  <tr key={work.id}>
                    <td className="py-2.5 px-2 text-center text-gray-400 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-gray-900">
                      {work.serviceName}
                    </td>
                    <td className="py-2.5 px-2 text-gray-600">
                      {work.description || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block w-4 h-4 border border-gray-400 rounded"></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Condition / Notes */}
        {jobCard.vehicleCondition && (
          <div className="py-5 border-b border-gray-200 space-y-1.5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Vehicle Condition / Pre-existing Remarks
            </p>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-950 text-xs leading-relaxed">
              {jobCard.vehicleCondition}
            </div>
          </div>
        )}

        {/* Photos Preview (if any) */}
        {((jobCard.beforePhotos && jobCard.beforePhotos.length > 0) ||
          (jobCard.afterPhotos && jobCard.afterPhotos.length > 0)) && (
          <div className="py-5 border-b border-gray-200 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-heading">
              Vehicle Inspection Photos
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jobCard.beforePhotos && jobCard.beforePhotos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Before Photos</span>
                  <div className="grid grid-cols-2 gap-2">
                    {jobCard.beforePhotos.map((photo, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                        <img src={photo} alt="Before" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jobCard.afterPhotos && jobCard.afterPhotos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">After Photos</span>
                  <div className="grid grid-cols-2 gap-2">
                    {jobCard.afterPhotos.map((photo, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                        <img src={photo} alt="After" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Staff Notes */}
        {jobCard.notes && (
          <div className="py-4 border-b border-gray-200 text-xs text-gray-600">
            <span className="font-bold text-gray-800">Workshop Remarks: </span>
            <span>{jobCard.notes}</span>
          </div>
        )}

        {/* Blank Handwritten Notes Table */}
        <div className="py-4 border-b border-gray-200">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 h-9 w-1/2"></td>
                  <td className="border border-gray-300 h-9 w-1/2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures & Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-2 gap-6 text-xs text-gray-500">
          <div className="text-center sm:text-left">
            <div className="w-40 border-t border-gray-400 mx-auto sm:mr-auto"></div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Customer Acknowledgement</p>
          </div>
          <div className="text-center sm:text-right">
            <div className="w-40 border-t border-gray-400 mx-auto sm:ml-auto"></div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Workshop In-Charge Signature</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-8">
          {settings?.defaultFooterText || 'Thank you for choosing Arshi Automobile & Car Hub.'}
        </p>
      </div>
    </div>
  );
};
