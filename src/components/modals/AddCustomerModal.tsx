import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { UserPlus } from 'lucide-react';

export const AddCustomerModal: React.FC = () => {
  const { isCustomerModalOpen, closeCustomerModal, showToast, triggerRefresh } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Please enter customer name and phone number', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const vehicles = vehicleReg.trim()
        ? [
            {
              id: `veh-${Date.now()}`,
              registrationNumber: vehicleReg.trim(),
              model: vehicleModel.trim() || 'Vehicle'
            }
          ]
        : [];

      await api.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        vehicles
      });

      showToast(`Customer "${name.trim()}" added successfully!`, 'success');
      setName('');
      setPhone('');
      setAddress('');
      setVehicleReg('');
      setVehicleModel('');
      triggerRefresh();
      closeCustomerModal();
    } catch (err) {
      console.error(err);
      showToast('Failed to add customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isCustomerModalOpen}
      onClose={closeCustomerModal}
      title="Add New Customer"
      subtitle="Register customer details and vehicle profile"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Customer Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Md. Rahim Uddin"
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
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
            placeholder="e.g. 01712-345678"
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Address (Optional)
          </label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. Kazihata / Shiroil, Rajshahi"
            className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Vehicle Information (Optional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Reg Number
              </label>
              <input
                type="text"
                value={vehicleReg}
                onChange={e => setVehicleReg(e.target.value)}
                placeholder="e.g. Rajshahi Metro-Ga 11-4521"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Car Model
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                placeholder="e.g. Toyota Axio 2018"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={closeCustomerModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-lg transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Customer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
