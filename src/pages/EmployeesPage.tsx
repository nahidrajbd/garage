import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Trash2,
  Edit2,
  Check,
  Phone,
  FileText,
  Printer,
  UserX,
  RotateCcw
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings, Technician } from '../types';
import { formatDate } from '../utils/formatters';

interface TechnicianFormState {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  facebookLink: string;
  photo: string;
  bloodGroup: string;
  nidOrBirthCert: string;
  identificationMark: string;
  reference: string;
  presentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  joiningDate: string;
}

type DocType = 'appointment' | 'termination' | 'experience' | 'noc';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  appointment: 'Appointment Letter',
  termination: 'Termination Letter',
  experience: 'Work Experience Letter',
  noc: 'No Objection Certificate (NOC)'
};

interface DocFormState {
  date: string;
  designation: string;
  effectiveDate: string;
  experienceEndDate: string;
  purpose: string;
  reason: string;
  extraNotes: string;
}

const today = () => new Date().toISOString().split('T')[0];

export const EmployeesPage: React.FC = () => {
  const { showToast, triggerRefresh } = useApp();
  const { canDelete } = useAuth();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTerminated, setShowTerminated] = useState(false);

  const emptyTechForm: TechnicianFormState = {
    name: '', specialty: '', phone: '', email: '', facebookLink: '', photo: '',
    bloodGroup: '', nidOrBirthCert: '', identificationMark: '', reference: '',
    presentAddress: '', permanentAddress: '', emergencyContactName: '', emergencyContactPhone: '', joiningDate: ''
  };
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [techForm, setTechForm] = useState<TechnicianFormState>(emptyTechForm);
  const updateTechForm = (field: keyof TechnicianFormState, value: string) => {
    setTechForm(prev => ({ ...prev, [field]: value }));
  };

  // Document generation state
  const [docModalTech, setDocModalTech] = useState<Technician | null>(null);
  const [docType, setDocType] = useState<DocType>('appointment');
  const emptyDocForm: DocFormState = {
    date: today(), designation: '', effectiveDate: '', experienceEndDate: today(), purpose: '', reason: '', extraNotes: ''
  };
  const [docForm, setDocForm] = useState<DocFormState>(emptyDocForm);
  const [printDoc, setPrintDoc] = useState<{ tech: Technician; type: DocType; form: DocFormState } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sett, techs] = await Promise.all([
          api.getSettings(),
          api.getTechniciansAll()
        ]);
        setSettings(sett);
        setTechnicians(techs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (printDoc) {
      const t = setTimeout(() => window.print(), 150);
      return () => clearTimeout(t);
    }
  }, [printDoc]);

  // Technician Handlers
  const handleOpenAddTech = () => {
    setEditingTechId(null);
    setTechForm(emptyTechForm);
    setIsTechModalOpen(true);
  };

  const handleStartEditTech = (tech: Technician) => {
    setEditingTechId(tech.id);
    setTechForm({
      name: tech.name || '',
      specialty: tech.specialty || '',
      phone: tech.phone || '',
      email: tech.email || '',
      facebookLink: tech.facebookLink || '',
      photo: tech.photo || '',
      bloodGroup: tech.bloodGroup || '',
      nidOrBirthCert: tech.nidOrBirthCert || '',
      identificationMark: tech.identificationMark || '',
      reference: tech.reference || '',
      presentAddress: tech.presentAddress || '',
      permanentAddress: tech.permanentAddress || '',
      emergencyContactName: tech.emergencyContactName || '',
      emergencyContactPhone: tech.emergencyContactPhone || '',
      joiningDate: tech.joiningDate || ''
    });
    setIsTechModalOpen(true);
  };

  const handleTechPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (!dataUrl) return;
      // Phone camera photos can be several MB, which is too large to send in a
      // single JSON request reliably - downscale to a small square thumbnail first.
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          updateTechForm('photo', dataUrl);
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
        updateTechForm('photo', canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.name.trim()) return;
    try {
      if (editingTechId) {
        const updated = await api.updateTechnician(editingTechId, techForm);
        setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
        showToast(`Technician "${updated.name}" updated successfully!`, 'success');
      } else {
        const created = await api.createTechnician(techForm);
        setTechnicians(prev => [...prev, created]);
        showToast(`Technician "${created.name}" added successfully!`, 'success');
      }
      setIsTechModalOpen(false);
      setEditingTechId(null);
      setTechForm(emptyTechForm);
      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save technician', 'error');
    }
  };

  const handleDeleteTechnician = async (id: string, name: string) => {
    if (!canDelete) {
      showToast('Staff users are not permitted to delete technicians.', 'error');
      return;
    }
    try {
      await api.deleteTechnician(id);
      setTechnicians(prev => prev.filter(t => t.id !== id));
      showToast(`Technician "${name}" removed`, 'info');
      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete technician', 'error');
    }
  };

  const handleTerminateTechnician = async (id: string, name: string) => {
    try {
      await api.terminateTechnician(id);
      setTechnicians(prev => prev.map(t =>
        t.id === id ? { ...t, status: 'inactive' as const, terminatedDate: new Date().toISOString().split('T')[0] } : t
      ));
      showToast(`${name} has been marked as terminated.`, 'info');
      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to terminate technician', 'error');
    }
  };

  const handleReinstateTechnician = async (id: string, name: string) => {
    try {
      await api.reinstateTechnician(id);
      setTechnicians(prev => prev.map(t =>
        t.id === id ? { ...t, status: 'active' as const, terminatedDate: '' } : t
      ));
      showToast(`${name} has been reinstated as active.`, 'success');
      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to reinstate technician', 'error');
    }
  };

  // Document Handlers
  const handleOpenDocModal = (tech: Technician) => {
    setDocModalTech(tech);
    setDocType('appointment');
    setDocForm({
      ...emptyDocForm,
      designation: tech.specialty || '',
      effectiveDate: tech.joiningDate || today()
    });
  };

  const handleGenerateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModalTech) return;
    setPrintDoc({ tech: docModalTech, type: docType, form: docForm });
    setDocModalTech(null);
  };

  return (
    <>
    <div className="space-y-6 no-print">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Employee Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Workshop technicians & specialists — full profiles and employment documents.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTerminated(v => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
            showTerminated
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          {showTerminated ? 'Hide Terminated' : 'Show Terminated'}
          {technicians.filter(t => t.status === 'inactive').length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              showTerminated ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-700'
            }`}>
              {technicians.filter(t => t.status === 'inactive').length}
            </span>
          )}
        </button>
      </div>

      {/* Technicians Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Workshop Technicians & Specialists
              </h3>
              <p className="text-xs text-gray-500">
                Add, rename, and manage technicians available for Job Card assignment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              {technicians.filter(t => t.status === 'active').length} Active
            </span>
            <button
              type="button"
              onClick={handleOpenAddTech}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#C1121F] hover:bg-[#A30F1A] rounded-xl transition-all shadow-xs cursor-pointer font-heading uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Technician</span>
            </button>
          </div>
        </div>

        {/* Technicians List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {technicians.filter(t => showTerminated ? t.status === 'inactive' : t.status === 'active').map(tech => (
            <div
              key={tech.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                tech.status === 'inactive'
                  ? 'bg-gray-50 border-gray-200 opacity-75'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {tech.photo ? (
                      <img src={tech.photo} alt={tech.name} className={`w-12 h-12 rounded-full object-cover border border-gray-200 ${
                        tech.status === 'inactive' ? 'grayscale' : ''
                      }`} />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold font-heading ${
                        tech.status === 'inactive' ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {tech.status === 'inactive' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                        <UserX className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold font-heading ${
                      tech.status === 'inactive' ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-900'
                    }`}>{tech.name}</h4>
                    {tech.status === 'inactive' && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-md border border-amber-200">
                        Terminated
                      </span>
                    )}
                    {tech.status === 'active' && tech.specialty && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-700 text-[11px] font-medium rounded-md border border-red-100">
                        {tech.specialty}
                      </span>
                    )}
                    {tech.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-mono">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{tech.phone}</span>
                      </div>
                    )}
                    {tech.bloodGroup && (
                      <div className="mt-1 text-[11px] text-gray-500">
                        Blood Group: <span className="font-semibold text-gray-700">{tech.bloodGroup}</span>
                      </div>
                    )}
                    {tech.joiningDate && (
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        Joined: <span className="font-semibold text-gray-700">{tech.joiningDate}</span>
                      </div>
                    )}
                    {tech.status === 'inactive' && tech.terminatedDate && (
                      <div className="mt-0.5 text-[11px] text-amber-600 font-medium">
                        Terminated: <span className="font-semibold">{tech.terminatedDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {tech.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleStartEditTech(tech)}
                      title="Edit Full Profile"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {tech.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleTerminateTechnician(tech.id, tech.name)}
                      title="Mark as Terminated"
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {tech.status === 'inactive' && (
                    <button
                      type="button"
                      onClick={() => handleReinstateTechnician(tech.id, tech.name)}
                      title="Reinstate Employee"
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTechnician(tech.id, tech.name)}
                      title="Delete Permanently"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {tech.status === 'active' && (
                <button
                  type="button"
                  onClick={() => handleOpenDocModal(tech)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              )}
              {tech.status === 'inactive' && (
                <button
                  type="button"
                  onClick={() => handleOpenDocModal(tech)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Print Termination Doc</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {!loading && technicians.filter(t => showTerminated ? t.status === 'inactive' : t.status === 'active').length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            {showTerminated
              ? 'No terminated employees. Active employees can be marked as terminated using the ⊗ button.'
              : 'No active technicians. Click "Add Technician" to create the first employee profile.'}
          </div>
        )}
      </div>

      {/* Technician Full Profile Modal (Add / Edit) */}
      <Modal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
        title={editingTechId ? 'Edit Technician Profile' : 'Add New Technician'}
        subtitle="Full employee record for workshop staff."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTechnician} className="space-y-5">
          {/* Photo + Basic Info */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col items-center gap-2 shrink-0">
              {techForm.photo ? (
                <img src={techForm.photo} alt="Technician" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                  <UserCog className="w-8 h-8" />
                </div>
              )}
              <label className="cursor-pointer text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors">
                Upload Photo
                <input type="file" accept="image/*" onChange={handleTechPhotoUpload} className="hidden" />
              </label>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text" required value={techForm.name}
                  onChange={e => updateTechForm('name', e.target.value)}
                  placeholder="e.g. Karim Uddin"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Specialty / Department</label>
                <input
                  type="text" value={techForm.specialty}
                  onChange={e => updateTechForm('specialty', e.target.value)}
                  placeholder="e.g. Engine & Mechanical"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Blood Group</label>
                <input
                  type="text" value={techForm.bloodGroup}
                  onChange={e => updateTechForm('bloodGroup', e.target.value)}
                  placeholder="e.g. O+"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date" value={techForm.joiningDate}
                  onChange={e => updateTechForm('joiningDate', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider font-heading mb-2 pb-1 border-b border-gray-100">
              Contact Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text" value={techForm.phone}
                  onChange={e => updateTechForm('phone', e.target.value)}
                  placeholder="e.g. 01712-345678"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email" value={techForm.email}
                  onChange={e => updateTechForm('email', e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Facebook Profile Link</label>
                <input
                  type="text" value={techForm.facebookLink}
                  onChange={e => updateTechForm('facebookLink', e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider font-heading mb-2 pb-1 border-b border-gray-100">
              Emergency Contact
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text" value={techForm.emergencyContactName}
                  onChange={e => updateTechForm('emergencyContactName', e.target.value)}
                  placeholder="e.g. Father / Brother / Spouse name"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text" value={techForm.emergencyContactPhone}
                  onChange={e => updateTechForm('emergencyContactPhone', e.target.value)}
                  placeholder="e.g. 01812-345678"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Identification */}
          <div>
            <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider font-heading mb-2 pb-1 border-b border-gray-100">
              Identification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">NID / Birth Certificate No.</label>
                <input
                  type="text" value={techForm.nidOrBirthCert}
                  onChange={e => updateTechForm('nidOrBirthCert', e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Identification Mark on Body</label>
                <input
                  type="text" value={techForm.identificationMark}
                  onChange={e => updateTechForm('identificationMark', e.target.value)}
                  placeholder="e.g. Scar on left hand"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Reference</label>
                <input
                  type="text" value={techForm.reference}
                  onChange={e => updateTechForm('reference', e.target.value)}
                  placeholder="Someone who referred / vouched for this employee"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div>
            <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider font-heading mb-2 pb-1 border-b border-gray-100">
              Address
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Present Address</label>
                <textarea
                  rows={2} value={techForm.presentAddress}
                  onChange={e => updateTechForm('presentAddress', e.target.value)}
                  placeholder="Current residence address"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Permanent Address</label>
                <textarea
                  rows={2} value={techForm.permanentAddress}
                  onChange={e => updateTechForm('permanentAddress', e.target.value)}
                  placeholder="Permanent / village address"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsTechModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] hover:bg-[#A30F1A] rounded-xl cursor-pointer font-heading uppercase tracking-wider shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingTechId ? 'Save Changes' : 'Add Technician'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Document Generation Modal */}
      <Modal
        isOpen={!!docModalTech}
        onClose={() => setDocModalTech(null)}
        title={`Print Document — ${docModalTech?.name || ''}`}
        subtitle="Generate a printable employment letter for this employee."
        maxWidth="md"
      >
        <form onSubmit={handleGenerateDocument} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as DocType)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map(key => (
                <option key={key} value={key}>{DOC_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Letter Date</label>
            <input
              type="date" value={docForm.date}
              onChange={e => setDocForm(prev => ({ ...prev, date: e.target.value }))}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Designation</label>
            <input
              type="text" value={docForm.designation}
              onChange={e => setDocForm(prev => ({ ...prev, designation: e.target.value }))}
              placeholder="e.g. Senior Technician"
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {docType === 'appointment' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Effective / Joining Date</label>
              <input
                type="date" value={docForm.effectiveDate}
                onChange={e => setDocForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          )}

          {docType === 'termination' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Last Working Date</label>
                <input
                  type="date" value={docForm.effectiveDate}
                  onChange={e => setDocForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Reason (Optional)</label>
                <input
                  type="text" value={docForm.reason}
                  onChange={e => setDocForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Leave blank to omit"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {docType === 'experience' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Employment End Date</label>
              <input
                type="date" value={docForm.experienceEndDate}
                onChange={e => setDocForm(prev => ({ ...prev, experienceEndDate: e.target.value }))}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Uses this employee's Joining Date as the start date.</p>
            </div>
          )}

          {docType === 'noc' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Purpose</label>
              <input
                type="text" value={docForm.purpose}
                onChange={e => setDocForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="e.g. applying for a passport / visa"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Additional Notes (Optional)</label>
            <textarea
              rows={2} value={docForm.extraNotes}
              onChange={e => setDocForm(prev => ({ ...prev, extraNotes: e.target.value }))}
              placeholder="Any extra line to add to the letter body"
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDocModalTech(null)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] hover:bg-[#A30F1A] rounded-xl cursor-pointer font-heading uppercase tracking-wider shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate & Print</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>

    {/* Printable Employment Letter (A4) — screen-hidden, shown only when printing */}
    {printDoc && (
        <div className="print-only printable-invoice bg-white p-10 text-gray-900 font-sans">
          <div className="text-center pb-6 border-b-2 border-gray-800">
            <h1 className="text-xl font-extrabold font-heading text-gray-900 tracking-tight uppercase">
              {settings?.businessName || 'Arshi Automobile & Car Hub'}
            </h1>
            <p className="text-xs text-gray-600 mt-1">{settings?.address || 'Rajshahi, Bangladesh'}</p>
            <p className="text-xs text-gray-800 mt-0.5 font-mono">
              Phone: {settings?.phone || '01712110902'}
              {settings?.email ? ` | Email: ${settings.email}` : ''}
            </p>
          </div>

          <p className="text-right text-sm mt-8">{formatDate(printDoc.form.date)}</p>

          <h2 className="text-center text-base font-bold uppercase tracking-wider mt-6 underline">
            {DOC_TYPE_LABELS[printDoc.type]}
          </h2>

          <div className="mt-8 text-sm leading-relaxed space-y-4">
            {printDoc.type === 'appointment' && (
              <>
                <p>To,<br />{printDoc.tech.name}{printDoc.tech.presentAddress ? <><br />{printDoc.tech.presentAddress}</> : null}</p>
                <p>Dear {printDoc.tech.name},</p>
                <p>
                  We are pleased to offer you the position of <strong>{printDoc.form.designation || printDoc.tech.specialty || 'Technician'}</strong> at{' '}
                  {settings?.businessName || 'our workshop'}, effective from <strong>{formatDate(printDoc.form.effectiveDate)}</strong>.
                  Your employment will be governed by the standard policies and work expectations of the company.
                </p>
                {printDoc.form.extraNotes && <p>{printDoc.form.extraNotes}</p>}
                <p>We look forward to your valuable contribution to our team. Please sign and return a copy of this letter as a token of your acceptance.</p>
              </>
            )}

            {printDoc.type === 'termination' && (
              <>
                <p>To,<br />{printDoc.tech.name}{printDoc.tech.presentAddress ? <><br />{printDoc.tech.presentAddress}</> : null}</p>
                <p>Dear {printDoc.tech.name},</p>
                <p>
                  This is to inform you that your employment with {settings?.businessName || 'our workshop'} as{' '}
                  <strong>{printDoc.form.designation || printDoc.tech.specialty || 'Technician'}</strong> stands terminated,
                  effective <strong>{formatDate(printDoc.form.effectiveDate)}</strong>.
                  {printDoc.form.reason ? ` Reason: ${printDoc.form.reason}.` : ''}
                </p>
                {printDoc.form.extraNotes && <p>{printDoc.form.extraNotes}</p>}
                <p>We wish you the best in your future endeavors.</p>
              </>
            )}

            {printDoc.type === 'experience' && (
              <>
                <p>To Whom It May Concern,</p>
                <p>
                  This is to certify that <strong>{printDoc.tech.name}</strong> worked at {settings?.businessName || 'our workshop'} as{' '}
                  <strong>{printDoc.form.designation || printDoc.tech.specialty || 'Technician'}</strong> from{' '}
                  <strong>{printDoc.tech.joiningDate ? formatDate(printDoc.tech.joiningDate) : '____________'}</strong> to{' '}
                  <strong>{formatDate(printDoc.form.experienceEndDate)}</strong>.
                  During this period, we found {printDoc.tech.name} to be sincere, hardworking, and diligent in carrying out assigned duties.
                </p>
                {printDoc.form.extraNotes && <p>{printDoc.form.extraNotes}</p>}
                <p>We wish {printDoc.tech.name} success in all future endeavors.</p>
              </>
            )}

            {printDoc.type === 'noc' && (
              <>
                <p>To Whom It May Concern,</p>
                <p>
                  This is to certify that <strong>{printDoc.tech.name}</strong>, currently working at {settings?.businessName || 'our workshop'} as{' '}
                  <strong>{printDoc.form.designation || printDoc.tech.specialty || 'Technician'}</strong>, has no objection from our side
                  for {printDoc.form.purpose || 'the stated purpose'}.
                </p>
                {printDoc.form.extraNotes && <p>{printDoc.form.extraNotes}</p>}
                <p>This certificate is issued upon the request of the employee for whatever purpose it may serve.</p>
              </>
            )}
          </div>

          <div className="mt-20 flex justify-between items-end text-sm">
            <div>
              <p className="border-t border-gray-800 pt-1 w-48 text-center">Employee Signature</p>
            </div>
            <div>
              <p className="border-t border-gray-800 pt-1 w-48 text-center">
                Authorized Signatory<br />
                <span className="text-xs text-gray-600">{settings?.businessName || 'Arshi Automobile & Car Hub'}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
