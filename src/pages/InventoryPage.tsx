import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  AlertTriangle,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  History,
  X,
  AlertOctagon,
  Edit2,
  RotateCcw,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import {
  InventoryItem,
  InventoryCategory,
  StockMovement,
  InventorySummary
} from '../types';
import { formatBDT, formatDate } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { InventoryStockBadge, StockMovementTypeBadge } from '../components/common/Badge';

export const InventoryPage: React.FC = () => {
  const { showToast } = useApp();

  // Data states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
  const [showInactive, setShowInactive] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [selectedItemForDetails, setSelectedItemForDetails] = useState<InventoryItem | null>(null);
  const [itemMovements, setItemMovements] = useState<StockMovement[]>([]);

  // Selected item for quick modal actions
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Form states: Add / Edit Item
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUnit, setFormUnit] = useState('Piece');
  const [formInitialQty, setFormInitialQty] = useState('');
  const [formUnitCost, setFormUnitCost] = useState('');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formNotes, setFormNotes] = useState('');

  // Form states: Stock In
  const [stockInQty, setStockInQty] = useState('');
  const [stockInUnitCost, setStockInUnitCost] = useState('');
  const [stockInDate, setStockInDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockInReason, setStockInReason] = useState('Received');
  const [stockInNote, setStockInNote] = useState('');

  // Form states: Stock Out
  const [stockOutQty, setStockOutQty] = useState('');
  const [stockOutDate, setStockOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockOutReason, setStockOutReason] = useState<'Used' | 'Damaged' | 'Lost' | 'Other'>('Used');
  const [stockOutNote, setStockOutNote] = useState('');

  // Form states: Adjust Stock
  const [adjustPhysicalQty, setAdjustPhysicalQty] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjustReason, setAdjustReason] = useState('Physical Count');
  const [adjustNote, setAdjustNote] = useState('');

  // Form state: Category
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, catsData, sumData] = await Promise.all([
        api.getInventoryItems(true),
        api.getInventoryCategories(),
        api.getInventorySummary()
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setSummary(sumData);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      showToast('Error loading inventory data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Active filter
      if (!showInactive && !item.isActive) return false;

      // Status filter
      if (selectedStatus === 'In Stock') {
        if (item.quantity <= item.minimumStock || item.quantity === 0) return false;
      } else if (selectedStatus === 'Low Stock') {
        if (item.quantity === 0 || item.quantity > item.minimumStock) return false;
      } else if (selectedStatus === 'Out of Stock') {
        if (item.quantity > 0) return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && item.categoryId !== selectedCategory && item.categoryName !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCategory = (item.categoryName || '').toLowerCase().includes(q);
        const matchesNotes = (item.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesNotes) return false;
      }

      return true;
    });
  }, [items, showInactive, selectedStatus, selectedCategory, searchQuery]);

  // Handle open item details & fetch its ledger history
  const handleOpenDetails = async (item: InventoryItem) => {
    setSelectedItemForDetails(item);
    try {
      const history = await api.getStockHistory(item.id);
      setItemMovements(history);
    } catch (err) {
      console.error('Error loading item history:', err);
    }
  };

  // Re-fetch details when data updates
  const refreshDetailsIfOpen = async (itemId: string) => {
    const updated = await api.getInventoryItemById(itemId);
    if (updated && selectedItemForDetails?.id === itemId) {
      setSelectedItemForDetails(updated);
      const history = await api.getStockHistory(itemId);
      setItemMovements(history);
    }
  };

  // Handle Add Item modal open
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategoryId(categories[0]?.id || 'cat-1');
    setFormUnit('Bottle');
    setFormInitialQty('0');
    setFormUnitCost('0');
    setFormMinStock('5');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Handle Edit Item modal open
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategoryId(item.categoryId);
    setFormUnit(item.unit);
    setFormInitialQty(String(item.quantity));
    setFormUnitCost(String(item.averageUnitCost));
    setFormMinStock(String(item.minimumStock));
    setFormNotes(item.notes || '');
    setIsAddModalOpen(true);
  };

  // Save Item (Create or Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }
    if (!formCategoryId) {
      showToast('Please select a category', 'error');
      return;
    }

    try {
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, {
          name: formName.trim(),
          categoryId: formCategoryId,
          unit: formUnit.trim() || 'Piece',
          minimumStock: Math.max(0, Number(formMinStock) || 0),
          notes: formNotes.trim() || undefined
        });
        showToast('Item updated successfully', 'success');
      } else {
        await api.createInventoryItem({
          name: formName.trim(),
          categoryId: formCategoryId,
          unit: formUnit.trim() || 'Piece',
          initialQuantity: Math.max(0, Number(formInitialQty) || 0),
          unitCost: Math.max(0, Number(formUnitCost) || 0),
          minimumStock: Math.max(0, Number(formMinStock) || 0),
          notes: formNotes.trim() || undefined
        });
        showToast('New inventory item added', 'success');
      }

      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving inventory item:', err);
      showToast('Failed to save item', 'error');
    }
  };

  // Handle Stock In
  const handleOpenStockIn = (itemId?: string) => {
    const id = itemId || items[0]?.id || '';
    setSelectedItemId(id);
    const targetItem = items.find(i => i.id === id);
    setStockInQty('');
    setStockInUnitCost(targetItem ? String(targetItem.averageUnitCost) : '');
    setStockInDate(new Date().toISOString().split('T')[0]);
    setStockInReason('Received');
    setStockInNote('');
    setIsStockInModalOpen(true);
  };

  const handleSaveStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showToast('Please select an item', 'error');
      return;
    }
    const qty = Number(stockInQty);
    const cost = Number(stockInUnitCost);
    if (!qty || qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }
    if (cost < 0) {
      showToast('Unit cost cannot be negative', 'error');
      return;
    }

    try {
      const res = await api.stockIn(
        selectedItemId,
        qty,
        cost,
        stockInDate,
        stockInReason,
        stockInNote
      );
      if (res) {
        showToast(`Stock added! New unit cost: ${formatBDT(res.item.averageUnitCost)}`, 'success');
        setIsStockInModalOpen(false);
        loadData();
        refreshDetailsIfOpen(selectedItemId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add stock';
      showToast(msg, 'error');
    }
  };

  // Handle Stock Out
  const handleOpenStockOut = (itemId?: string) => {
    const id = itemId || items[0]?.id || '';
    setSelectedItemId(id);
    setStockOutQty('');
    setStockOutDate(new Date().toISOString().split('T')[0]);
    setStockOutReason('Used');
    setStockOutNote('');
    setIsStockOutModalOpen(true);
  };

  const handleSaveStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showToast('Please select an item', 'error');
      return;
    }
    const target = items.find(i => i.id === selectedItemId);
    const qty = Number(stockOutQty);
    if (!qty || qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }
    if (target && qty > target.quantity) {
      showToast(`Available stock is only ${target.quantity}. You cannot remove ${qty}.`, 'error');
      return;
    }

    try {
      const res = await api.stockOut(
        selectedItemId,
        qty,
        stockOutDate,
        stockOutReason,
        stockOutNote
      );
      if (res) {
        showToast(`Stock removed! Remaining: ${res.item.quantity} ${res.item.unit}`, 'success');
        setIsStockOutModalOpen(false);
        loadData();
        refreshDetailsIfOpen(selectedItemId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove stock';
      showToast(msg, 'error');
    }
  };

  // Handle Stock Adjustment
  const handleOpenAdjust = (itemId?: string) => {
    const id = itemId || items[0]?.id || '';
    setSelectedItemId(id);
    const target = items.find(i => i.id === id);
    setAdjustPhysicalQty(target ? String(target.quantity) : '0');
    setAdjustDate(new Date().toISOString().split('T')[0]);
    setAdjustReason('Physical Count');
    setAdjustNote('');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showToast('Please select an item', 'error');
      return;
    }
    const physicalQty = Number(adjustPhysicalQty);
    if (isNaN(physicalQty) || physicalQty < 0) {
      showToast('Physical quantity cannot be negative', 'error');
      return;
    }

    try {
      const res = await api.adjustStock(
        selectedItemId,
        physicalQty,
        adjustDate,
        adjustReason,
        adjustNote
      );
      if (res) {
        showToast(`Stock updated to ${res.item.quantity} ${res.item.unit}`, 'success');
        setIsAdjustModalOpen(false);
        loadData();
        refreshDetailsIfOpen(selectedItemId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust stock';
      showToast(msg, 'error');
    }
  };

  // Handle Add Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.addInventoryCategory(newCategoryName.trim());
      showToast('Category added', 'success');
      setNewCategoryName('');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to add category', 'error');
    }
  };

  // Handle Item Deactivate / Delete
  const handleDeleteOrDeactivate = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to remove or deactivate "${item.name}"?`)) return;

    try {
      const delRes = await api.deleteInventoryItem(item.id);
      if (delRes.success) {
        showToast('Item deleted from inventory', 'info');
        loadData();
        if (selectedItemForDetails?.id === item.id) setSelectedItemForDetails(null);
      } else {
        // Offer deactivation
        if (confirm(`${delRes.message}\n\nDo you want to DEACTIVATE this item instead?`)) {
          await api.deactivateInventoryItem(item.id);
          showToast('Item deactivated', 'info');
          loadData();
          if (selectedItemForDetails?.id === item.id) setSelectedItemForDetails(null);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error removing item', 'error');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.reactivateInventoryItem(id);
      showToast('Item reactivated', 'success');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Selected item for active modal calculation preview
  const currentModalItem = useMemo(() => {
    return items.find(i => i.id === selectedItemId);
  }, [items, selectedItemId]);

  // Weighted Average Live Preview for Stock In
  const weightedAveragePreview = useMemo(() => {
    if (!currentModalItem) return null;
    const currentQty = currentModalItem.quantity;
    const currentCost = currentModalItem.averageUnitCost;
    const inQty = Number(stockInQty) || 0;
    const inCost = Number(stockInUnitCost) || 0;

    const existingVal = currentQty * currentCost;
    const newVal = inQty * inCost;
    const resultingTotalQty = currentQty + inQty;
    const resultingAvgCost = resultingTotalQty > 0 ? (existingVal + newVal) / resultingTotalQty : inCost;
    const resultingTotalVal = resultingTotalQty * resultingAvgCost;

    return {
      currentQty,
      currentCost,
      existingVal,
      inQty,
      inCost,
      newVal,
      resultingTotalQty,
      resultingAvgCost,
      resultingTotalVal
    };
  }, [currentModalItem, stockInQty, stockInUnitCost]);

  // Summary statistics for item details modal
  const itemLedgerStats = useMemo(() => {
    if (!itemMovements.length) return { totalIn: 0, totalOut: 0, totalAdjustments: 0 };
    let totalIn = 0;
    let totalOut = 0;
    let totalAdjustments = 0;

    itemMovements.forEach(m => {
      if (m.type === 'IN') totalIn += m.quantity;
      else if (m.type === 'OUT') totalOut += Math.abs(m.quantity);
      else if (m.type === 'ADJUSTMENT') totalAdjustments += m.quantity;
    });

    return { totalIn, totalOut, totalAdjustments };
  }, [itemMovements]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shadow-2xs shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#1E293B] tracking-tight">
                Inventory & Stock Management
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Physical stock quantities, weighted average cost, and item valuation
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenStockIn()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all active:scale-98"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>+ Stock In</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenStockOut()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-all active:scale-98"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>- Stock Out</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Item</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={summary?.totalItems ?? 0}
          subtitle="Active catalog products in garage"
          icon={Package}
          variant="default"
        />

        <StatCard
          title="Low Stock Items"
          value={summary?.lowStockCount ?? 0}
          subtitle="At or below minimum threshold"
          icon={AlertTriangle}
          variant={summary?.lowStockCount ? 'warning' : 'default'}
          onClick={() => setSelectedStatus(selectedStatus === 'Low Stock' ? 'All' : 'Low Stock')}
        />

        <StatCard
          title="Out of Stock"
          value={summary?.outOfStockCount ?? 0}
          subtitle="Items with 0 quantity on shelf"
          icon={AlertOctagon}
          variant={summary?.outOfStockCount ? 'danger' : 'default'}
          onClick={() => setSelectedStatus(selectedStatus === 'Out of Stock' ? 'All' : 'Out of Stock')}
        />

        <StatCard
          title="Total Inventory Value"
          value={formatBDT(summary?.totalInventoryValue ?? 0)}
          subtitle="Physical cost valuation (Non-cash)"
          icon={Boxes}
          variant="primary"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by item name, category, or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] placeholder:text-[#64748B] focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Dropdown & Custom Category trigger */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              title="Manage Categories"
              className="p-2 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl border border-[#E2E8F0] transition-colors"
            >
              <Tag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary Bar: Active filter indicators & Inactive toggle */}
        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{filteredItems.length}</strong> of {items.length} items
            </span>
            {(selectedStatus !== 'All' || selectedCategory !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('All');
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>Show Deactivated</span>
          </label>
        </div>
      </div>

      {/* Main Items Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Stock Value</th>
                <th className="py-3 px-4 text-center">Min Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs text-[#1E293B]">
              {filteredItems.map(item => {
                const stockValue = item.quantity * item.averageUnitCost;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      !item.isActive ? 'opacity-60 bg-slate-50' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium">
                      <div
                        onClick={() => handleOpenDetails(item)}
                        className="cursor-pointer group flex items-start gap-2"
                      >
                        <div>
                          <p className="font-semibold text-sm text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                            {item.name}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-[#64748B] border border-slate-200">
                        {item.categoryName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      <span className="text-sm">{item.quantity}</span>{' '}
                      <span className="text-[11px] font-normal text-[#64748B]">{item.unit}</span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                      {formatBDT(item.averageUnitCost)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1E293B]">
                      {formatBDT(stockValue)}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                      {item.minimumStock}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <InventoryStockBadge
                        quantity={item.quantity}
                        minimumStock={item.minimumStock}
                        isActive={item.isActive}
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenStockIn(item.id)}
                          title="+ Stock In"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenStockOut(item.id)}
                          title="- Stock Out"
                          disabled={item.quantity === 0}
                          className="p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-rose-200 transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetails(item)}
                          title="View Ledger & Details"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit Item"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {item.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrDeactivate(item)}
                            title="Delete or Deactivate"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(item.id)}
                            title="Reactivate Item"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-[#E2E8F0]">
          {filteredItems.map(item => {
            const stockValue = item.quantity * item.averageUnitCost;
            return (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div onClick={() => handleOpenDetails(item)} className="cursor-pointer">
                    <h3 className="font-bold text-sm text-[#1E293B]">
                      {item.name}
                    </h3>
                    <span className="inline-block text-[11px] text-[#64748B] mt-0.5">
                      {item.categoryName}
                    </span>
                  </div>
                  <InventoryStockBadge
                    quantity={item.quantity}
                    minimumStock={item.minimumStock}
                    isActive={item.isActive}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Quantity:</span>
                    <span className="font-bold font-mono text-sm text-[#1E293B]">
                      {item.quantity} {item.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#64748B] block">Unit Cost:</span>
                    <span className="font-semibold font-mono text-xs text-slate-700">
                      {formatBDT(item.averageUnitCost)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#64748B] block">Stock Value:</span>
                    <span className="font-bold font-mono text-xs text-[#2563EB]">
                      {formatBDT(stockValue)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#64748B] block">Min Stock:</span>
                    <span className="font-mono text-xs text-slate-600">
                      {item.minimumStock}
                    </span>
                  </div>
                </div>

                {/* Mobile Quick Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenStockIn(item.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-1"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> + In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenStockOut(item.id)}
                      disabled={item.quantity === 0}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg inline-flex items-center gap-1 disabled:opacity-30"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> - Out
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(item)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdjust(item.id)}
                      className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg"
                      title="Adjust"
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search / Filter State */}
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#1E293B]">No items found</h3>
            <p className="text-xs text-[#64748B] mt-1">
              Try adjusting your search criteria or add a new item.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-xl"
            >
              + Add Item
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. ADD / EDIT ITEM MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        subtitle={editingItem ? 'Update specifications & minimum threshold' : 'Register physical stock item into workshop catalog'}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Engine Oil 5W-30 (Synthetic)"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Category *
              </label>
              <select
                required
                value={formCategoryId}
                onChange={e => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Unit of Measurement *
              </label>
              <input
                type="text"
                required
                placeholder="Bottle, Piece, Liter, Can, Roll, etc."
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {!editingItem ? (
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formInitialQty}
                  onChange={e => setFormInitialQty(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">
                  Current Quantity
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editingItem.quantity} ${editingItem.unit}`}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#64748B] font-mono cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                {editingItem ? 'Average Unit Cost (৳)' : 'Unit Cost (৳)'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                disabled={!!editingItem}
                value={formUnitCost}
                onChange={e => setFormUnitCost(e.target.value)}
                className={`w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500 ${
                  editingItem ? 'bg-slate-100 text-[#64748B] cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Minimum Stock
              </label>
              <input
                type="number"
                min="0"
                placeholder="5"
                value={formMinStock}
                onChange={e => setFormMinStock(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Initial Value Preview (Only on Add) */}
          {!editingItem && (
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Initial Stock Valuation:</span>
              <span className="font-bold font-mono text-sm text-[#2563EB]">
                {formatBDT((Number(formInitialQty) || 0) * (Number(formUnitCost) || 0))}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Recommended for 1500cc Japanese sedans"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {editingItem ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. STOCK IN MODAL (With Weighted Average Preview) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title="+ Stock In (Receive Items)"
        subtitle="Adds quantity and recalculates weighted average unit cost"
      >
        <form onSubmit={handleSaveStockIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Select Item *
            </label>
            <select
              required
              value={selectedItemId}
              onChange={e => {
                const id = e.target.value;
                setSelectedItemId(id);
                const t = items.find(i => i.id === id);
                if (t) setStockInUnitCost(String(t.averageUnitCost));
              }}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            >
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Current: {i.quantity} {i.unit} @ {formatBDT(i.averageUnitCost)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Quantity to Add *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="e.g. 10"
                value={stockInQty}
                onChange={e => setStockInQty(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Unit Cost for this Batch (৳) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                placeholder="e.g. 1200"
                value={stockInUnitCost}
                onChange={e => setStockInUnitCost(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Weighted Average Live Calculation Box */}
          {weightedAveragePreview && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Existing Stock:</span>
                <span className="font-mono">
                  {weightedAveragePreview.currentQty} {currentModalItem?.unit} @ {formatBDT(weightedAveragePreview.currentCost)} = {formatBDT(weightedAveragePreview.existingVal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#64748B]">
                <span>Incoming Stock:</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  +{weightedAveragePreview.inQty} {currentModalItem?.unit} @ {formatBDT(weightedAveragePreview.inCost)} = {formatBDT(weightedAveragePreview.newVal)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-[#1E293B]">New Weighted Average Cost:</span>
                <span className="font-mono text-[#2563EB] text-sm">
                  {formatBDT(weightedAveragePreview.resultingAvgCost)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span>New Total Quantity: <strong>{weightedAveragePreview.resultingTotalQty} {currentModalItem?.unit}</strong></span>
                <span>Total Value: <strong>{formatBDT(weightedAveragePreview.resultingTotalVal)}</strong></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={stockInDate}
                onChange={e => setStockInDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Reason
              </label>
              <input
                type="text"
                placeholder="Received, Restock, Return, etc."
                value={stockInReason}
                onChange={e => setStockInReason(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice #PO-402, Supplier shipment"
              value={stockInNote}
              onChange={e => setStockInNote(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsStockInModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Confirm Stock In</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 3. STOCK OUT MODAL (With Max Validation) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isStockOutModalOpen}
        onClose={() => setIsStockOutModalOpen(false)}
        title="- Stock Out (Issue / Use Items)"
        subtitle="Deducts physical quantity while preserving current average unit cost"
      >
        <form onSubmit={handleSaveStockOut} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Select Item *
            </label>
            <select
              required
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            >
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Available: {i.quantity} {i.unit})
                </option>
              ))}
            </select>
          </div>

          {currentModalItem && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Available On Shelf:</span>
              <span className="font-bold font-mono text-sm text-[#1E293B]">
                {currentModalItem.quantity} {currentModalItem.unit}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Quantity to Remove *
              </label>
              <input
                type="number"
                required
                min="1"
                max={currentModalItem?.quantity || undefined}
                placeholder="e.g. 2"
                value={stockOutQty}
                onChange={e => setStockOutQty(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500"
              />
              {currentModalItem && Number(stockOutQty) > currentModalItem.quantity && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Cannot remove more than available ({currentModalItem.quantity})
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Reason *
              </label>
              <select
                required
                value={stockOutReason}
                onChange={e => setStockOutReason(e.target.value as 'Used' | 'Damaged' | 'Lost' | 'Other')}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              >
                <option value="Used">Used in Service / Job</option>
                <option value="Damaged">Damaged / Expired</option>
                <option value="Lost">Lost / Missing</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={stockOutDate}
                onChange={e => setStockOutDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Note / Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Job Card #JC-0025, Bay 2 wash"
                value={stockOutNote}
                onChange={e => setStockOutNote(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsStockOutModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={currentModalItem ? Number(stockOutQty) > currentModalItem.quantity : false}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Confirm Stock Out</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. STOCK ADJUSTMENT MODAL (Physical Audit Correction) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Physical Stock"
        subtitle="Reconcile system quantity with physical shelf count"
      >
        <form onSubmit={handleSaveAdjust} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Select Item *
            </label>
            <select
              required
              value={selectedItemId}
              onChange={e => {
                const id = e.target.value;
                setSelectedItemId(id);
                const t = items.find(i => i.id === id);
                if (t) setAdjustPhysicalQty(String(t.quantity));
              }}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            >
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Current System: {i.quantity} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                System Quantity
              </label>
              <input
                type="text"
                disabled
                value={`${currentModalItem?.quantity ?? 0} ${currentModalItem?.unit ?? ''}`}
                className="w-full px-3.5 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#64748B] font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Physical Counted Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="Actual counted count"
                value={adjustPhysicalQty}
                onChange={e => setAdjustPhysicalQty(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {currentModalItem && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Adjustment Delta:</span>
              <span className={`font-bold font-mono text-sm ${
                (Number(adjustPhysicalQty) - currentModalItem.quantity) >= 0
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}>
                {(Number(adjustPhysicalQty) - currentModalItem.quantity) > 0 ? '+' : ''}
                {Number(adjustPhysicalQty) - currentModalItem.quantity} {currentModalItem.unit}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={adjustDate}
                onChange={e => setAdjustDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Reason
              </label>
              <input
                type="text"
                placeholder="Physical Count, Audit, Found, etc."
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly workshop physical stock audit"
              value={adjustNote}
              onChange={e => setAdjustNote(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 5. ITEM DETAILS & STOCK HISTORY MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!selectedItemForDetails}
        onClose={() => setSelectedItemForDetails(null)}
        title={selectedItemForDetails?.name || 'Item Details'}
        subtitle={`Category: ${selectedItemForDetails?.categoryName} • Unit: ${selectedItemForDetails?.unit}`}
        maxWidth="2xl"
      >
        {selectedItemForDetails && (
          <div className="space-y-6">
            {/* Top Stat Overview Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[11px] text-[#64748B] font-semibold block uppercase">Current Stock</span>
                <span className="text-base font-extrabold font-mono text-[#1E293B]">
                  {selectedItemForDetails.quantity} {selectedItemForDetails.unit}
                </span>
                <div className="mt-1">
                  <InventoryStockBadge
                    quantity={selectedItemForDetails.quantity}
                    minimumStock={selectedItemForDetails.minimumStock}
                    isActive={selectedItemForDetails.isActive}
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] font-semibold block uppercase">Avg Unit Cost</span>
                <span className="text-base font-extrabold font-mono text-slate-800">
                  {formatBDT(selectedItemForDetails.averageUnitCost)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Weighted average</p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] font-semibold block uppercase">Total Stock Value</span>
                <span className="text-base font-extrabold font-mono text-[#2563EB]">
                  {formatBDT(selectedItemForDetails.quantity * selectedItemForDetails.averageUnitCost)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Cost valuation</p>
              </div>

              <div>
                <span className="text-[11px] text-[#64748B] font-semibold block uppercase">Min Threshold</span>
                <span className="text-base font-extrabold font-mono text-slate-700">
                  {selectedItemForDetails.minimumStock}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Alert limit</p>
              </div>
            </div>

            {/* Quick Action Buttons for this item */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedItemForDetails(null);
                  handleOpenStockIn(selectedItemForDetails.id);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl inline-flex items-center gap-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" /> + Stock In
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedItemForDetails(null);
                  handleOpenStockOut(selectedItemForDetails.id);
                }}
                disabled={selectedItemForDetails.quantity === 0}
                className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 disabled:opacity-30 rounded-xl inline-flex items-center gap-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> - Stock Out
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedItemForDetails(null);
                  handleOpenAdjust(selectedItemForDetails.id);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl inline-flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Stock
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedItemForDetails(null);
                  handleOpenEditModal(selectedItemForDetails);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl inline-flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Specs
              </button>
            </div>

            {/* Movement Summary Counters */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total Received (In)</span>
                <p className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 mt-0.5">
                  +{itemLedgerStats.totalIn} {selectedItemForDetails.unit}
                </p>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Total Issued (Out)</span>
                <p className="text-sm sm:text-base font-extrabold font-mono text-rose-700 mt-0.5">
                  -{itemLedgerStats.totalOut} {selectedItemForDetails.unit}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">Net Adjustments</span>
                <p className="text-sm sm:text-base font-extrabold font-mono text-slate-800 mt-0.5">
                  {itemLedgerStats.totalAdjustments > 0 ? '+' : ''}{itemLedgerStats.totalAdjustments} {selectedItemForDetails.unit}
                </p>
              </div>
            </div>

            {/* Stock History Ledger Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] font-heading flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Stock History Ledger</span>
                </h4>
                <span className="text-[11px] text-[#64748B]">
                  {itemMovements.length} recorded movements
                </span>
              </div>

              {itemMovements.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-slate-200">
                  No stock movement history recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 border border-[#E2E8F0] rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider text-[#64748B] sticky top-0">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Value</th>
                        <th className="py-2.5 px-3">Reason / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs text-[#1E293B]">
                      {itemMovements.map(mov => (
                        <tr key={mov.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                            {formatDate(mov.date)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StockMovementTypeBadge type={mov.type} />
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                            mov.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatBDT(mov.unitCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {formatBDT(mov.totalValue)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800">{mov.reason}</span>
                            {mov.note && <span className="text-[11px] text-slate-500 block truncate">{mov.note}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 6. CATEGORY MANAGEMENT MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Inventory Categories"
        subtitle="Manage product and parts groupings"
      >
        <div className="space-y-4">
          <form onSubmit={handleSaveCategory} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="New category name (e.g. Fluids, Tools)..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#1E293B] focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs shrink-0"
            >
              + Add
            </button>
          </form>

          <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto border border-[#E2E8F0] rounded-xl">
            {categories.map(c => {
              const count = items.filter(i => i.categoryId === c.id || i.categoryName === c.name).length;
              return (
                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-[#1E293B]">{c.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {count} item{count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
