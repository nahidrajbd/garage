import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  ArrowLeft, 
  User, 
  Car, 
  Wrench, 
  Calendar,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  X,
  Upload
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Customer, 
  ServiceItem, 
  JobCardWorkItem, 
  JobCardStatus 
} from '../types';
import { generateJobCardNumber, normalizePhoneDigits } from '../utils/formatters';

export const CreateJobCardPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { showToast, triggerRefresh } = useApp();

  // Reference Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceItem[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);

  // Form State
  const [jobCardNumber, setJobCardNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<JobCardStatus>('In Progress');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const [customerComplaint, setCustomerComplaint] = useState('');
  const [vehicleCondition, setVehicleCondition] = useState('');
  const [assignedTo, setAssignedTo] = useState('Technician 1 (Karim - Engine)');
  const [notes, setNotes] = useState('');

  // Required Work Items
  const [workItems, setWorkItems] = useState<JobCardWorkItem[]>([
    {
      id: 'jw-1',
      serviceName: 'General Inspection',
      description: 'Initial workshop inspection and scan'
    }
  ]);

  // Vehicle Photos
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [custList, srvList, staff, jcList] = await Promise.all([
          api.getCustomers(),
          api.getServices(),
          api.getStaffList(),
          api.getJobCards()
        ]);
        setCustomers(custList);
        setServicesCatalog(srvList);
        setStaffList(staff);
        if (staff.length > 0) setAssignedTo(staff[0]);

        if (id) {
          // Edit existing Job Card
          const existing = await api.getJobCardById(id);
          if (existing) {
            setJobCardNumber(existing.jobCardNumber);
            setDate(existing.date);
            if (existing.expectedDeliveryDate) setExpectedDeliveryDate(existing.expectedDeliveryDate);
            setStatus(existing.status);
            setCustomerName(existing.customerName);
            setCustomerPhone(existing.customerPhone);
            setVehicleReg(existing.vehicleRegistration);
            setVehicleModel(existing.vehicleModel);
            if (existing.mileage) setMileage(String(existing.mileage));
            setSelectedCustomerId(existing.customerId || '');
            setCustomerComplaint(existing.customerComplaint);
            setWorkItems(existing.requiredWork || []);
            setVehicleCondition(existing.vehicleCondition || '');
            setAssignedTo(existing.assignedTo);
            setNotes(existing.notes || '');
            setBeforePhotos(existing.beforePhotos || []);
            setAfterPhotos(existing.afterPhotos || []);
          }
        } else {
          // New Job Card
          setJobCardNumber(generateJobCardNumber(jcList.length));
        }
      } catch (err) {
        console.error(err);
      }
    };
    initData();
  }, [id]);

  // Customer Selection Auto-fill
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      if (cust.vehicles && cust.vehicles.length > 0) {
        setVehicleReg(cust.vehicles[0].registrationNumber);
        setVehicleModel(cust.vehicles[0].model);
        if (cust.vehicles[0].mileage) setMileage(String(cust.vehicles[0].mileage));
      }
    }
  };

  // Auto-fill customer details as soon as a matching phone number is typed
  useEffect(() => {
    const digits = normalizePhoneDigits(customerPhone);
    if (!digits) {
      setSelectedCustomerId('');
      return;
    }
    const match = customers.find(c => normalizePhoneDigits(c.phone) === digits);
    if (match) {
      setSelectedCustomerId(match.id);
      setCustomerName(match.name);
      if (match.vehicles && match.vehicles.length > 0) {
        setVehicleReg(match.vehicles[0].registrationNumber);
        setVehicleModel(match.vehicles[0].model);
        if (match.vehicles[0].mileage) setMileage(String(match.vehicles[0].mileage));
      }
    } else {
      setSelectedCustomerId('');
    }
  }, [customerPhone, customers]);

  // Add Work Item Row
  const handleAddWorkItem = (service?: ServiceItem) => {
    const newItem: JobCardWorkItem = {
      id: `jw-${Date.now()}-${Math.random()}`,
      serviceName: service ? service.name : '',
      description: service?.description || ''
    };
    setWorkItems(prev => [...prev, newItem]);
  };

  // Update Work Item Row
  const handleUpdateWorkItem = (itemId: string, field: keyof JobCardWorkItem, value: string) => {
    setWorkItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, [field]: value };
    }));
  };

  // Remove Work Item Row
  const handleRemoveWorkItem = (itemId: string) => {
    if (workItems.length <= 1) {
      showToast('Job card must contain at least one work item', 'error');
      return;
    }
    setWorkItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Photo Upload Handlers (mock frontend data-URL / thumbnail)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          if (type === 'before') {
            setBeforePhotos(prev => [...prev, result]);
          } else {
            setAfterPhotos(prev => [...prev, result]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      setBeforePhotos(prev => prev.filter((_, idx) => idx !== index));
    } else {
      setAfterPhotos(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  // Save Job Card handler
  const handleSave = async (andPrint = false) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Please provide customer name and phone number', 'error');
      return;
    }
    if (!vehicleReg.trim()) {
      showToast('Please provide vehicle registration number', 'error');
      return;
    }
    if (!customerComplaint.trim()) {
      showToast('Please enter the customer complaint / request', 'error');
      return;
    }
    if (workItems.some(w => !w.serviceName.trim())) {
      showToast('Please specify all required service names', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const jobCardData = {
        jobCardNumber,
        date,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        status,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleRegistration: vehicleReg.trim(),
        vehicleModel: vehicleModel.trim() || 'Vehicle',
        mileage: mileage.trim() || undefined,
        customerComplaint: customerComplaint.trim(),
        requiredWork: workItems.map(w => ({
          id: w.id,
          serviceName: w.serviceName.trim(),
          description: w.description?.trim() || ''
        })),
        vehicleCondition: vehicleCondition.trim() || undefined,
        assignedTo,
        beforePhotos,
        afterPhotos,
        notes: notes.trim() || undefined
      };

      let resultId = id;
      if (id) {
        await api.updateJobCard(id, jobCardData);
        showToast(`Job Card ${jobCardNumber} updated successfully!`, 'success');
      } else {
        const created = await api.createJobCard(jobCardData);
        resultId = created.id;
        showToast(`Job Card ${created.jobCardNumber} created successfully!`, 'success');
      }

      triggerRefresh();

      if (andPrint) {
        navigate(`/job-cards/${resultId}?print=true`);
      } else {
        navigate(`/job-cards/${resultId}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save job card', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/job-cards')}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Back to Job Cards"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              {id ? 'Edit Job Card' : 'New Job Card'}
            </h2>
            <p className="text-xs text-gray-500">
              Record vehicle intake, customer complaint, technician assignment, and required work
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-gray-400 font-mono">Job Card No.</span>
          <p className="font-mono text-base font-bold text-gray-900">{jobCardNumber}</p>
        </div>
      </div>

      {/* Grid: Customer & Vehicle Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#C1121F]" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Customer Details
              </h3>
            </div>
            {customers.length > 0 && (
              <select
                value={selectedCustomerId}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white"
              >
                <option value="">-- Auto-select existing --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                autoFocus
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g. 01712-345678"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
              />
              {selectedCustomerId && (
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">✓ Existing customer found — details auto-filled</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Md. Rahim Uddin"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Intake Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Expected Delivery
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={e => setExpectedDeliveryDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Car className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Vehicle & Assignment
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vehicle Registration Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleReg}
                onChange={e => setVehicleReg(e.target.value)}
                placeholder="e.g. Rajshahi Metro-Ga 11-4521"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vehicle Model <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  placeholder="e.g. Toyota Axio 2017"
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Current Mileage
                </label>
                <input
                  type="text"
                  value={mileage}
                  onChange={e => setMileage(e.target.value)}
                  placeholder="e.g. 68,450 km"
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assigned To
                </label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-medium"
                >
                  {staffList.map(staff => (
                    <option key={staff} value={staff}>{staff}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Job Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as JobCardStatus)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-semibold"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Complaint / Request (Prominent Main Field) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <AlertCircle className="w-4 h-4 text-[#C1121F]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
            Customer Complaint / Request <span className="text-rose-500">*</span>
          </h3>
        </div>
        <textarea
          rows={3}
          required
          value={customerComplaint}
          onChange={e => setCustomerComplaint(e.target.value)}
          placeholder="e.g. AC is not cooling properly during daytime. Slight vibration when accelerating above 60km/h. Complete car foam wash and interior vacuum required."
          className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
        />
      </div>

      {/* Required Work Items */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Required Work / Tasks
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Quick Add:</span>
            <select
              onChange={e => {
                const srv = servicesCatalog.find(s => s.id === e.target.value);
                if (srv) handleAddWorkItem(srv);
                e.target.value = '';
              }}
              defaultValue=""
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white"
            >
              <option value="" disabled>+ Add service...</option>
              {servicesCatalog.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleAddWorkItem()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Custom Work</span>
            </button>
          </div>
        </div>

        {/* Stacked Work Items */}
        <div className="space-y-3">
          {workItems.map((item, idx) => (
            <div key={item.id} className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-gray-400 font-mono w-6 text-center">
                #{idx + 1}
              </span>

              <div className="w-full sm:w-1/3">
                <input
                  type="text"
                  required
                  value={item.serviceName}
                  onChange={e => handleUpdateWorkItem(item.id, 'serviceName', e.target.value)}
                  placeholder="e.g. Brake Service / Dent & Paint"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-red-500 focus:outline-none font-medium"
                />
              </div>

              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  value={item.description || ''}
                  onChange={e => handleUpdateWorkItem(item.id, 'description', e.target.value)}
                  placeholder="Task scope details / instructions for technician..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveWorkItem(item.id)}
                disabled={workItems.length <= 1}
                className="p-1.5 text-gray-400 hover:text-rose-600 disabled:opacity-30 self-end sm:self-center rounded-lg"
                title="Remove Work Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Condition & Existing Notes */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading pb-2 border-b border-gray-100">
          Vehicle Condition / Existing Damage (Dispute Protection)
        </h3>
        <textarea
          rows={2}
          value={vehicleCondition}
          onChange={e => setVehicleCondition(e.target.value)}
          placeholder="e.g. Existing deep scratch on rear left door. Front bumper right side clip broken. Customer informed before vehicle intake."
          className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none"
        />
      </div>

      {/* Vehicle Photos (Before / After Mock Upload) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <Camera className="w-4 h-4 text-[#C1121F]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
            Vehicle Photos
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                Before Photos ({beforePhotos.length})
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>+ Upload Photo</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handlePhotoUpload(e, 'before')}
                  className="hidden"
                />
              </label>
            </div>

            {beforePhotos.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                No before photos uploaded
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {beforePhotos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                    <img src={photo} alt="Before" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto('before', idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                      title="Remove Photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* After Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                After Photos ({afterPhotos.length})
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>+ Upload Photo</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handlePhotoUpload(e, 'after')}
                  className="hidden"
                />
              </label>
            </div>

            {afterPhotos.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                No after photos uploaded
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {afterPhotos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                    <img src={photo} alt="After" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto('after', idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                      title="Remove Photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Internal Staff Notes */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
        <label className="block text-xs font-semibold text-gray-700">
          Internal Workshop Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Special customer request, delivery deadline, technician handover remarks..."
          className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate('/job-cards')}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all shadow-2xs"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving...' : 'Save Job Card'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Save & Print Job Card</span>
        </button>
      </div>
    </div>
  );
};
