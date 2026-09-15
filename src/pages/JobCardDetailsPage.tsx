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
  Download,
  Phone,
  Mail,
  MapPin,
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

  const printDateTime = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Compact letterhead repeated at the top of every printed page
  const renderLetterhead = () => (
    <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-gray-900">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-white shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-extrabold font-heading text-gray-900 tracking-tight uppercase leading-tight">
            {settings?.businessName || 'Arshi Automobile & Car Hub'}
          </h1>
          <p className="text-[10px] text-gray-500 font-medium">Your Trusted Automobile Partner in Rajshahi</p>
        </div>
      </div>
      <div className="text-right text-[10px] text-gray-700 space-y-0.5 shrink-0">
        <p className="flex items-center justify-end gap-1.5">
          <span>{settings?.address || 'Rajshahi, Bangladesh'}</span>
          <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
        </p>
        <p className="flex items-center justify-end gap-1.5 font-mono">
          <span>
            {settings?.phone || '01712110902'}
            {settings?.altPhone && ` / ${settings.altPhone}`}
          </span>
          <Phone className="w-3 h-3 text-gray-500 shrink-0" />
        </p>
        {settings?.email && (
          <p className="flex items-center justify-end gap-1.5">
            <span>{settings.email}</span>
            <Mail className="w-3 h-3 text-gray-500 shrink-0" />
          </p>
        )}
      </div>
    </div>
  );

  // Shared signature block used at the bottom of every printed page
  const renderSignatures = () => (
    <div className="mt-8 pt-4 grid grid-cols-3 gap-4 text-[10px] text-gray-600">
      <div className="text-center">
        <div className="border-t border-gray-400 pt-1">Customer Signature</div>
      </div>
      <div className="text-center">
        <div className="border-t border-gray-400 pt-1">Supervised By</div>
      </div>
      <div className="text-center">
        <div className="border-t border-gray-400 pt-1">Authorized Signature</div>
      </div>
    </div>
  );

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

          {/* Download PDF - reuses the browser's print dialog, where "Save as PDF" is a destination */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl shadow-2xs transition-colors"
            title="Use 'Save as PDF' as the destination in the print dialog"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
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

      {/* Printable Job Card Sheet - A4, 2 pages */}
      <div className="printable-invoice bg-white text-gray-900 font-sans text-xs">

        {/* ============ PAGE 1: JOB CARD / SERVICE DETAILS ============ */}
        <div className="print-page avoid-break bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/90 shadow-md print:rounded-none print:border-0 print:shadow-none">
          {renderLetterhead()}

          {/* Title + Meta */}
          <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-300">
            <h2 className="text-xl font-extrabold font-heading uppercase tracking-widest text-gray-900">
              Job Card
            </h2>
            <table className="text-[10px] text-gray-700">
              <tbody>
                <tr>
                  <td className="pr-2 font-bold text-gray-500 uppercase">Job Card No:</td>
                  <td className="font-mono font-bold text-gray-900">{jobCard.jobCardNumber}</td>
                </tr>
                <tr>
                  <td className="pr-2 font-bold text-gray-500 uppercase">Job Date:</td>
                  <td className="font-mono">{formatDate(jobCard.date)}</td>
                </tr>
                <tr>
                  <td className="pr-2 font-bold text-gray-500 uppercase">Expected Delivery:</td>
                  <td className="font-mono">{jobCard.expectedDeliveryDate ? formatDate(jobCard.expectedDeliveryDate) : '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 font-bold text-gray-500 uppercase">Print Date:</td>
                  <td className="font-mono">{printDateTime}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Customer & Vehicle Details */}
          <div className="grid grid-cols-2 gap-0 border border-gray-300 border-t-0 text-[11px]">
            <div className="p-2.5 border-r border-gray-300">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                Customer Details
              </p>
              <p><span className="font-bold text-gray-500">Name:</span> {jobCard.customerName}</p>
              <p><span className="font-bold text-gray-500">Phone:</span> {jobCard.customerPhone}</p>
              <p><span className="font-bold text-gray-500">Address:</span> ____________________</p>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                Vehicle Details
              </p>
              <p><span className="font-bold text-gray-500">Vehicle:</span> {jobCard.vehicleModel}</p>
              <p><span className="font-bold text-gray-500">Registration:</span> {jobCard.vehicleRegistration}</p>
              <p><span className="font-bold text-gray-500">Chassis No:</span> ____________________</p>
              <p><span className="font-bold text-gray-500">Engine No:</span> ____________________</p>
              <p><span className="font-bold text-gray-500">KM:</span> {jobCard.mileage || '____________'}</p>
            </div>
          </div>

          {/* Staff / Status / Fuel */}
          <div className="grid grid-cols-3 gap-0 border border-gray-300 border-t-0 text-[11px]">
            <div className="p-2.5 border-r border-gray-300">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                Staff / Responsibility
              </p>
              <p><span className="font-bold text-gray-500">Supervised By:</span> ________________</p>
              <p><span className="font-bold text-gray-500">Technician:</span> {jobCard.assignedTo}</p>
              <p><span className="font-bold text-gray-500">Created By:</span> ________________</p>
            </div>
            <div className="p-2.5 border-r border-gray-300">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                Fuel Level
              </p>
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-0.5">
                {['Empty', '1/4', '1/2', '3/4', 'Full'].map(level => (
                  <span key={level} className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border border-gray-500"></span>
                    {level}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                Service Status
              </p>
              <JobCardStatusBadge status={jobCard.status} />
            </div>
          </div>

          {/* Complaint + Vehicle Condition Diagram */}
          <div className="grid grid-cols-2 gap-0 border border-gray-300 border-t-0 text-[11px]">
            <div className="p-2.5 border-r border-gray-300 space-y-2">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                  Customer Complaint
                </p>
                <p className="leading-relaxed">{jobCard.customerComplaint}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                  Reported Defects / Inspection Notes
                </p>
                <p className="leading-relaxed text-gray-700">{jobCard.vehicleCondition || '____________________________________'}</p>
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5">
                Vehicle Condition / Damage Diagram
              </p>
              <div className="flex items-center justify-center py-2">
                <svg viewBox="0 0 200 90" className="w-full max-w-[220px] h-auto text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="20" y="20" width="160" height="50" rx="10" />
                  <rect x="45" y="8" width="90" height="20" rx="6" />
                  <line x1="60" y1="20" x2="60" y2="70" />
                  <line x1="140" y1="20" x2="140" y2="70" />
                  <circle cx="50" cy="72" r="7" />
                  <circle cx="150" cy="72" r="7" />
                </svg>
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed">
                Mark affected area(s): Front / Rear Bumper, Bonnet, Roof, L/R Doors, L/R Fenders, Trunk —
                <span className="italic"> note below.</span>
              </p>
              <p className="border-b border-gray-300 h-4 mt-1"></p>
            </div>
          </div>

          {/* Service / Work List */}
          <div className="border border-gray-300 border-t-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2.5 pt-2">
              Service / Work List
            </p>
            <table className="w-full text-left text-[11px] mt-1">
              <thead>
                <tr className="border-y border-gray-300 bg-gray-50 text-gray-600 uppercase text-[9px] font-bold">
                  <th className="py-1.5 px-2 w-8 text-center">SL</th>
                  <th className="py-1.5 px-2">Service / Work Description</th>
                  <th className="py-1.5 px-2 w-24 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobCard.requiredWork.map((work, idx) => (
                  <tr key={work.id}>
                    <td className="py-1.5 px-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <span className="font-bold text-gray-900">{work.serviceName}</span>
                      {work.description && <span className="text-gray-600"> — {work.description}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-400">৳</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 font-bold">
                  <td className="py-1.5 px-2" colSpan={2}>Subtotal</td>
                  <td className="py-1.5 px-2 text-right">৳</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Workshop Notes */}
          <div className="p-2.5 border border-gray-300 border-t-0 text-[11px]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-1 mb-1">
              Workshop Notes
            </p>
            <p className="leading-relaxed text-gray-700">{jobCard.notes || '____________________________________________________________'}</p>
          </div>

          {renderSignatures()}

          <p className="text-center text-[9px] text-gray-400 mt-4">Page 1 of 2</p>
        </div>

        {/* ============ PAGE 2: PARTS / PRODUCTS ============ */}
        <div className="print-page avoid-break bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/90 shadow-md print:rounded-none print:border-0 print:shadow-none">
          {renderLetterhead()}

          <h2 className="text-lg font-extrabold font-heading uppercase tracking-widest text-gray-900 text-center py-3 border-b border-gray-300">
            Parts / Products
          </h2>

          <table className="w-full text-left text-[11px] border border-gray-300">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50 text-gray-600 uppercase text-[9px] font-bold">
                <th className="py-1.5 px-2 w-8 text-center border-r border-gray-300">SL</th>
                <th className="py-1.5 px-2 border-r border-gray-300">Product</th>
                <th className="py-1.5 px-2 w-20 border-r border-gray-300">SP Code</th>
                <th className="py-1.5 px-2 w-16 text-right border-r border-gray-300">Req. Qty</th>
                <th className="py-1.5 px-2 w-16 text-right border-r border-gray-300">Dis. Qty</th>
                <th className="py-1.5 px-2 w-20 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-2 px-2 text-center text-gray-400 font-mono border-r border-gray-200">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-gray-200">&nbsp;</td>
                  <td className="py-2 px-2 border-r border-gray-200">&nbsp;</td>
                  <td className="py-2 px-2 border-r border-gray-200">&nbsp;</td>
                  <td className="py-2 px-2 border-r border-gray-200">&nbsp;</td>
                  <td className="py-2 px-2">&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 font-bold">
                <td className="py-2 px-2" colSpan={5}>Subtotal</td>
                <td className="py-2 px-2 text-right">৳ 0.00</td>
              </tr>
            </tfoot>
          </table>

          {renderSignatures()}

          <p className="text-center text-[9px] text-gray-400 mt-4">Page 2 of 2</p>
        </div>
      </div>
    </div>
  );
};
