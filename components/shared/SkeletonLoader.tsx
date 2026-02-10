/**
 * SkeletonLoader Component
 *
 * Animated skeleton placeholders for loading states
 */

import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = '1rem',
  className = '',
}) => {
  const baseClasses = 'animate-pulse bg-slate-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

/**
 * Pre-built skeleton for catalog item card
 */
export const CatalogItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <Skeleton height="120px" className="mb-3" />
      <Skeleton width="70%" height="1.25rem" />
      <Skeleton width="50%" height="1rem" />
      <Skeleton width="40%" height="1rem" />
      <div className="flex gap-2 pt-2">
        <Skeleton width="80px" height="36px" />
        <Skeleton width="80px" height="36px" />
      </div>
    </div>
  );
};

/**
 * Pre-built skeleton for tenant registry row
 */
export const TenantRowSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
      <Skeleton variant="circular" width="48px" height="48px" className="bg-slate-700" />
      <div className="flex-1 space-y-2">
        <Skeleton width="200px" height="1.25rem" className="bg-slate-700" />
        <Skeleton width="150px" height="1rem" className="bg-slate-700" />
      </div>
      <Skeleton width="80px" height="28px" className="bg-slate-700" />
      <Skeleton width="100px" height="36px" className="bg-slate-700" />
    </div>
  );
};

/**
 * Pre-built skeleton for audit log entry
 */
export const AuditLogSkeleton: React.FC = () => {
  return (
    <div className="border-l-4 border-slate-300 bg-slate-50 p-4 rounded-r-lg space-y-2">
      <div className="flex justify-between items-start">
        <Skeleton width="250px" height="1.25rem" />
        <Skeleton width="100px" height="1rem" />
      </div>
      <Skeleton width="180px" height="1rem" />
      <Skeleton width="60%" height="0.875rem" />
    </div>
  );
};

/**
 * Pre-built skeleton for cart item
 */
export const CartItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-center">
      <Skeleton variant="rectangular" width="80px" height="80px" />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height="1.25rem" />
        <Skeleton width="40%" height="1rem" />
        <Skeleton width="30%" height="1rem" />
      </div>
      <Skeleton width="100px" height="36px" />
    </div>
  );
};
