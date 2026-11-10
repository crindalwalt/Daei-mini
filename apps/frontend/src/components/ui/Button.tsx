import React from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'soft'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer'

    const variantClasses = {
      default: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500',
      secondary:
        'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400',
      outline:
        'border border-slate-300 bg-white hover:bg-slate-50 focus-visible:ring-brand-400 text-slate-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-400',
      soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:ring-brand-400',
    }

    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
      icon: 'h-9 w-9 p-0',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {isLoading && <Spinner size={size === 'lg' ? 'md' : 'sm'} />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
