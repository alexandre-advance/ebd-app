import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelClassName, error, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
      const inputType =
        type === 'password'
          ? (showPassword ? 'text' : 'password')
          : type;
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className={cn("text-sm font-bold text-brand-700", labelClassName)}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={inputType}
            className={cn(
              'flex h-11 w-full rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm ring-offset-blue file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/20 focus-visible:border-brand-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm',
              type === 'password' && 'pr-12',
              error && 'border-red-500 focus-visible:ring-red-500',
              className
            )}
            ref={ref}
            {...props}
          />

          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-brand-700 transition-colors"
            >
              {showPassword ? (
                <EyeOff size={18} className="text-blue-700" />
              ) : (
                <Eye size={18} className="text-blue-700" />
              )}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
