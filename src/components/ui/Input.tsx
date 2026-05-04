import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelClassName, error, type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className={cn("text-sm font-bold text-brand-700", labelClassName)}>
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/20 focus-visible:border-brand-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
