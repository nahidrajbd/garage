import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'danger' | 'primary' | 'warning';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  onClick
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          card: 'border-l-4 border-l-emerald-600 bg-white hover:border-emerald-700',
          iconBg: 'bg-emerald-50 text-emerald-700',
          valueText: 'text-emerald-700 font-bold',
        };
      case 'danger':
        return {
          card: 'border-l-4 border-l-rose-600 bg-white hover:border-rose-700',
          iconBg: 'bg-rose-50 text-rose-700',
          valueText: 'text-rose-700 font-bold',
        };
      case 'primary':
        return {
          card: 'border-l-4 border-l-[#C1121F] bg-white hover:border-red-800',
          iconBg: 'bg-red-50 text-[#C1121F]',
          valueText: 'text-gray-900 font-bold',
        };
      case 'warning':
        return {
          card: 'border-l-4 border-l-amber-500 bg-white hover:border-amber-600',
          iconBg: 'bg-amber-50 text-amber-700',
          valueText: 'text-amber-700 font-bold',
        };
      default:
        return {
          card: 'border-l-4 border-l-gray-300 bg-white hover:border-gray-400',
          iconBg: 'bg-gray-100 text-gray-700',
          valueText: 'text-gray-900 font-bold',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border border-gray-200/80 shadow-xs transition-all duration-200 ${styles.card} ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <p className={`text-2xl lg:text-3xl tracking-tight font-heading ${styles.valueText}`}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg shrink-0 ${styles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`inline-flex items-center font-medium ${
                trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
