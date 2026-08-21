import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { leadsService } from '../services/leadsService';

export const CreateLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { showToast, triggerRefresh } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [inquiry, setInquiry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loadLead = async () => {
      const existing = await leadsService.getLeadById(id);
      if (existing) {
        setCustomerName(existing.customerName);
        setPhone(existing.phone || '');
        setVehicleModel(existing.vehicleModel || '');
        setInquiry(existing.inquiry);
      }
    };
    loadLead();
  }, [id]);

  const handleSave = async () => {
    if (!customerName.trim() || !phone.trim()) {
      showToast('Please provide customer name and phone number', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (id) {
        await leadsService.updateLead(id, {
          customerName: customerName.trim(),
          phone: phone.trim(),
          vehicleModel: vehicleModel.trim() || undefined,
          inquiry: inquiry.trim(),
        });
        showToast('Lead updated successfully!', 'success');
        triggerRefresh();
        navigate(`/leads/${id}`);
      } else {
        const created = await leadsService.createLead({
          customerName: customerName.trim(),
          phone: phone.trim(),
          source: 'Facebook',
          inquiry: inquiry.trim(),
          vehicleModel: vehicleModel.trim() || undefined,
        });
        showToast(`Lead ${created.leadNumber} created successfully!`, 'success');
        triggerRefresh();
        navigate(`/leads/${created.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save lead', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          title="Back to Leads"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            {id ? 'Edit Lead' : 'New Lead'}
          </h2>
          <p className="text-xs text-gray-500">
            Just the basics — you can add details later
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Customer Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="e.g. Rahim Mia"
            className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. 01712-556601"
            className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle (optional)</label>
          <input
            type="text"
            value={vehicleModel}
            onChange={e => setVehicleModel(e.target.value)}
            placeholder="e.g. Toyota Axio"
            className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">What do they need? (optional)</label>
          <textarea
            rows={3}
            value={inquiry}
            onChange={e => setInquiry(e.target.value)}
            placeholder='e.g. "Toyota Premio-এর dent paint করতে কত লাগবে?"'
            className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving...' : id ? 'Save Changes' : 'Save Lead'}</span>
        </button>
      </div>
    </div>
  );
};
