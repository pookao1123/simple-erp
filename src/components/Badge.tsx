import type { HTMLAttributes } from 'react';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type Size = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  default: 'bg-secondary-soft text-secondary-soft-fg',
  success: 'bg-success-soft text-success-soft-fg',
  warning: 'bg-warning-soft text-warning-soft-fg',
  danger: 'bg-danger-soft text-danger-soft-fg',
  info: 'bg-primary-soft text-primary-soft-fg',
};

const sizes: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  variant = 'default',
  size = 'sm',
  className = '',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
