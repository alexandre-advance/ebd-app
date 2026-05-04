import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lg shadow-brand-700/20 active:scale-95',
      secondary: 'bg-black text-white hover:bg-black/90 active:scale-95',
      outline: 'border border-brand-700 text-brand-700 hover:bg-brand-50 active:scale-95',
      ghost: 'text-brand-700 hover:bg-brand-50 active:scale-95',
    };

    const sizes = {
      sm: 'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm',
      md: 'px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base',
      lg: 'px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
