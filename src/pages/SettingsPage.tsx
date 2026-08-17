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
  CheckCircle2
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Settings, ServiceItem } from '../types';
import { formatBDT } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { showToast, triggerRefresh } = useApp();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // New Service state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('General');

  // New Category state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Reset Confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const [sett, srvs, cats] = await Promise.all([
          api.getSettings(),
          api.getServices(),
          api.getExpenseCategories()
        ]);
        setSettings(sett);
        setServices(srvs);
        setCategories(cats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

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
    try {
      await api.deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      showToast('Service removed', 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete service', 'error');
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
    try {
      const updated = await api.deleteExpenseCategory(cat);
      setCategories(updated);
      showToast(`Category "${cat}" removed`, 'info');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      await api.resetToDefault();
      showToast('All data has been reset to default demo dataset', 'success');
      // Reload page state
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
            Manage garage profile, invoice formatting, service pricing, and expense categories
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* 1. Business Information & Invoice Settings Form */}
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
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] active:bg-[#800C15] rounded-xl transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save General Settings'}</span>
          </button>
        </div>
      </form>

      {/* 2. Service Catalog Management */}
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
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors shadow-xs"
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
                <button
                  type="button"
                  onClick={() => handleDeleteService(s.id)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded"
                  title="Remove Service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Expense Categories Management */}
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors shadow-xs shrink-0"
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
              {!['Salary', 'Purchase', 'Loan Repayment'].includes(cat) && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat)}
                  className="text-gray-400 hover:text-rose-600 rounded-full"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

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
