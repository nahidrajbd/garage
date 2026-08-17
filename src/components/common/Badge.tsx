import React from 'react';
import { InvoiceStatus, QuotationStatus, JobCardStatus, PaymentMethod } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 
    | 'paid' 
    | 'partial' 
    | 'due' 
    | 'cash' 
    | 'bkash' 
    | 'bank' 
    | 'in' 
    | 'out' 
    | 'neutral' 
    | 'primary'
    | 'draft'
    | 'sent'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | 'converted'
    | 'waiting'
    | 'in-progress'
    | 'completed'
    | 'delivered'
    | 'cancelled';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral',
  size = 'md' 
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'paid':
      case 'accepted':
      case 'completed':
      case 'in':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delivered':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'partial':
      case 'expired':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'due':
      case 'rejected':
      case 'cancelled':
      case 'out':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'sent':
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'converted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'waiting':
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'bkash':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'bank':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cash':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'primary':
        return 'bg-red-50 text-[#C1121F] border-red-200';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeStyles} ${getStyles()}`}
    >
      {(variant === 'paid' || variant === 'accepted' || variant === 'completed') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {variant === 'delivered' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
      {(variant === 'partial' || variant === 'expired') && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      {(variant === 'due' || variant === 'rejected' || variant === 'cancelled') && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
      {(variant === 'sent' || variant === 'in-progress') && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
      {variant === 'converted' && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
      {(variant === 'draft' || variant === 'waiting') && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
      {children}
    </span>
  );
};

export const InvoiceStatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const variant = status === 'Paid' ? 'paid' : status === 'Partial' ? 'partial' : 'due';
  return <Badge variant={variant}>{status}</Badge>;
};

export const QuotationStatusBadge: React.FC<{ status: QuotationStatus }> = ({ status }) => {
  const variant = 
    status === 'Draft' ? 'draft' :
    status === 'Sent' ? 'sent' :
    status === 'Accepted' ? 'accepted' :
    status === 'Rejected' ? 'rejected' :
    status === 'Expired' ? 'expired' :
    'converted';
  return <Badge variant={variant}>{status}</Badge>;
};

export const JobCardStatusBadge: React.FC<{ status: JobCardStatus }> = ({ status }) => {
  const variant = 
    status === 'Waiting' ? 'waiting' :
    status === 'In Progress' ? 'in-progress' :
    status === 'Completed' ? 'completed' :
    status === 'Delivered' ? 'delivered' :
    'cancelled';
  return <Badge variant={variant}>{status}</Badge>;
};

export const PaymentMethodBadge: React.FC<{ method: PaymentMethod }> = ({ method }) => {
  const variant = method === 'bKash' ? 'bkash' : method === 'Bank' ? 'bank' : 'cash';
  return <Badge variant={variant} size="sm">{method}</Badge>;
};

export const InventoryStockBadge: React.FC<{
  quantity: number;
  minimumStock: number;
  isActive?: boolean;
}> = ({ quantity, minimumStock, isActive = true }) => {
  if (!isActive) {
    return <Badge variant="draft" size="sm">Deactivated</Badge>;
  }
  if (quantity === 0) {
    return <Badge variant="due" size="sm">Out of Stock</Badge>;
  }
  if (quantity <= minimumStock) {
    return <Badge variant="partial" size="sm">Low Stock</Badge>;
  }
  return <Badge variant="paid" size="sm">In Stock</Badge>;
};

export const StockMovementTypeBadge: React.FC<{ type: 'IN' | 'OUT' | 'ADJUSTMENT' }> = ({ type }) => {
  if (type === 'IN') {
    return <Badge variant="in" size="sm">Stock In</Badge>;
  }
  if (type === 'OUT') {
    return <Badge variant="out" size="sm">Stock Out</Badge>;
  }
  return <Badge variant="sent" size="sm">Adjustment</Badge>;
};



