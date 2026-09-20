import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'bordered' | 'elevated';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: 'border border-line',
  bordered: 'border-2 border-primary/40',
  elevated: 'border border-line shadow-lg',
};

export default function Card({
  title,
  actions,
  footer,
  variant = 'default',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div className={`rounded-lg bg-surface text-fg ${variants[variant]} ${className}`} {...rest}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
    </div>
  );
}
