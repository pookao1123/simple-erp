import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

type Variant = 'default' | 'error';
type Size = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export default function Input({
  label,
  error,
  hint,
  variant = 'default',
  size = 'md',
  id,
  className = '',
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const isError = variant === 'error' || Boolean(error);
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={isError || undefined}
        aria-describedby={describedBy}
        className={`block w-full rounded-md border bg-surface text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          isError
            ? 'border-danger focus:ring-danger/40'
            : 'border-line focus:border-primary focus:ring-primary/40'
        } ${sizes[size]}`}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="mt-1 text-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
