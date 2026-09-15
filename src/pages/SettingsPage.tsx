import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Building2, 
  FileText, 
  Wrench, 
  Tag,
  Users,
  ShieldCheck,
  UserCheck,
  Key,
  Lock,
  UserPlus,
  UserCog,
  Phone,
  Edit2,
  Check
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings, ServiceItem, User, UserRole, Technician } from '../types';
import { formatBDT } from '../utils/formatters';

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

export const SettingsPage: React.FC = () => {
  const { showToast, triggerRefresh } = useApp();
  const { user: currentUser, isSuperAdmin, canDelete, canManageUsers } = useAuth();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  // New Service state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('General');

  // New Category state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Technicians state
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

  // New User state (Super Admin only)
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Password reset modal state
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  // Reset Confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const promises: [Promise<Settings>, Promise<ServiceItem[]>, Promise<string[]>, Promise<Technician[]>] = [
          api.getSettings(),
          api.getServices(),
          api.getExpenseCategories(),
          api.getTechnicians()
        ];
        const [sett, srvs, cats, techs] = await Promise.all(promises);
        setSettings(sett);
        setServices(srvs);
        setCategories(cats);
        setTechnicians(techs);

        if (canManageUsers) {
          try {
            const uList = await api.getUsers();
            setUsersList(uList);
          } catch (e) {
            console.error('Failed to load users:', e);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [canManageUsers]);

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      showToast('Settings updated successfully!', 'success');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const price = parseFloat(newServicePrice) || 0;
    try {
      const created = await api.createService({
        name: newServiceName.trim(),
        defaultPrice: price,
        category: newServiceCategory.trim() || 'General'
      });
      setServices(prev => [...prev, created]);
      setNewServiceName('');
      setNewServicePrice('');
      showToast(`Service "${created.name}" added`, 'success');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to add service', 'error');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!canDelete) {
      showToast('Staff users are not permitted to delete services.', 'error');
      return;
    }
    try {
      await api.deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      showToast('Service removed', 'info');
      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete service', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const updated = await api.addExpenseCategory(newCategoryName.trim());
      setCategories(updated);
      setNewCategoryName('');
      showToast('Expense category added', 'success');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to add category', 'error');
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    if (!canDelete) {
      showToast('Staff users are not permitted to delete categories.', 'error');
      return;
    }
    try {
      const updated = await api.deleteExpenseCategory(cat);
      setCategories(updated);
      showToast(`Category "${cat}" removed`, 'info');
      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  // User Management Handlers (Super Admin Only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword) {
      showToast('Please fill all user fields', 'error');
      return;
    }

    setIsCreatingUser(true);
    try {
      const created = await api.createUser({
        name: newUserName.trim(),
        username: newUserUsername.trim(),
        password: newUserPassword,
        role: newUserRole
      });
      setUsersList(prev => [...prev, created]);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('staff');
      showToast(`User "${created.name}" created successfully (${created.role})!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser?.id) {
      showToast('You cannot delete your own account while signed in.', 'error');
      return;
    }
    try {
      await api.deleteUser(userToDelete.id);
      setUsersList(prev => prev.filter(u => u.id !== userToDelete.id));
      showToast(`User ${userToDelete.name} removed`, 'info');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !resetPasswordInput) return;
    try {
      await api.resetUserPassword(selectedUserForReset.id, resetPasswordInput);
      showToast(`Password for ${selectedUserForReset.name} reset successfully`, 'success');
      setSelectedUserForReset(null);
      setResetPasswordInput('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to reset password', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      await api.resetToDefault();
      showToast('All data has been reset to default demo dataset', 'success');
      const [sett, srvs, cats] = await Promise.all([
        api.getSettings(),
        api.getServices(),
        api.getExpenseCategories()
      ]);
      setSettings(sett);
      setServices(srvs);
      setCategories(cats);
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to reset data', 'error');
    }
  };

  if (!settings) {
    return <div className="text-gray-500 text-sm">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            System & Business Settings
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage garage profile, invoice formatting, user access control, and services catalog.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        )}
      </div>

      {/* 1. User & Access Control Management (Super Admin Exclusive) */}
      {canManageUsers && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                  User Accounts & Access Control
                </h3>
                <p className="text-xs text-gray-500">
                  Super Admin can add/remove users and manage permissions. Staff accounts cannot delete records.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              {usersList.length} Accounts
            </span>
          </div>

          {/* Add New User Form */}
          <form onSubmit={handleCreateUser} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider font-heading mb-1">
              <UserPlus className="w-4 h-4 text-[#C1121F]" />
              <span>Create New User Account</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Role Permission</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="staff">Staff (Create/Edit Only)</option>
                  <option value="super_admin">Super Admin (Full Access & Delete)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isCreatingUser}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#C1121F] hover:bg-[#A30F1A] rounded-xl transition-all shadow-xs cursor-pointer font-heading uppercase tracking-wider disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingUser ? 'Creating...' : 'Add User'}</span>
              </button>
            </div>
          </form>

          {/* Users Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usersList.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isSuper = u.role === 'super_admin';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] ${
                            isSuper ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{u.name}</span>
                            {isCurrent && (
                              <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700">{u.username}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          isSuper 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isSuper ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{isSuper ? 'Super Admin' : 'Staff'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          u.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        <span className="capitalize text-gray-700">{u.status}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForReset(u)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Business Information & Invoice Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Info */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Building2 className="w-4 h-4 text-[#C1121F]" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Workshop Profile
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={settings.businessName}
                  onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Phone</label>
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Alt Phone</label>
                  <input
                    type="text"
                    value={settings.altPhone || ''}
                    onChange={e => setSettings({ ...settings, altPhone: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Workshop Address</label>
                <input
                  type="text"
                  required
                  value={settings.address}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Invoice Config */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <FileText className="w-4 h-4 text-[#C1121F]" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
                Invoice & Print Format
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  required
                  value={settings.invoicePrefix}
                  onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Footer Message on Invoice</label>
                <textarea
                  rows={3}
                  value={settings.defaultFooterText}
                  onChange={e => setSettings({ ...settings, defaultFooterText: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  disabled
                  className="w-24 text-xs sm:text-sm px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save General Settings'}</span>
          </button>
        </div>
      </form>

      {/* 3. Service Catalog Management */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Service Catalog & Default Prices
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">{services.length} services</span>
        </div>

        {/* Add Service Form */}
        <form onSubmit={handleAddService} className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">New Service Name</label>
            <input
              type="text"
              required
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              placeholder="e.g. Ceramic Coating / Wheel Alignment"
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Default Price (৳)</label>
            <input
              type="number"
              min="0"
              required
              value={newServicePrice}
              onChange={e => setNewServicePrice(e.target.value)}
              placeholder="0"
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white font-bold"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </form>

        {/* Services List Table */}
        <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {services.map(s => (
            <div key={s.id} className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                {s.category && (
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {s.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-xs sm:text-sm font-mono text-gray-900">{formatBDT(s.defaultPrice)}</span>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteService(s.id)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remove Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Workshop Technicians & Staff Management */}
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
              {technicians.length} Technicians
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
          {technicians.map(tech => (
            <div
              key={tech.id}
              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  {tech.photo ? (
                    <img src={tech.photo} alt={tech.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0 font-bold font-heading">
                      {tech.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 font-heading">{tech.name}</h4>
                    {tech.specialty && (
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
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEditTech(tech)}
                    title="Edit Full Profile"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTechnician(tech.id, tech.name)}
                      title="Delete Technician"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Expense Categories Management */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#C1121F]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-heading">
              Expense Categories
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">{categories.length} categories</span>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex gap-2 items-center">
          <input
            type="text"
            required
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="e.g. Utility Bills, Equipment Maintenance..."
            className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 bg-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </form>

        {/* Categories Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map(cat => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-xs font-semibold border border-gray-200"
            >
              <span>{cat}</span>
              {canDelete && !['Salary', 'Purchase', 'Loan Repayment'].includes(cat) && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat)}
                  className="text-gray-400 hover:text-rose-600 rounded-full cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
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

      {/* Password Reset Dialog */}
      {selectedUserForReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold font-heading">
              <Lock className="w-5 h-5 text-[#C1121F]" />
              <span>Reset Password for {selectedUserForReset.name}</span>
            </div>
            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetPasswordInput}
                  onChange={e => setResetPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#C1121F] hover:bg-[#A30F1A] rounded-lg cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset Demo Data to Initial State"
        message="This will replace any newly added customers, invoices, cash in, or expenses with the fresh Bangladeshi sample dataset. Are you sure?"
        confirmText="Reset Everything"
        isDestructive={true}
      />
    </div>
  );
};
