import React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  labelAction?: React.ReactNode
  leftIcon?: React.ReactNode
  rightSlot?: React.ReactNode
  containerClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      helperText,
      labelAction,
      leftIcon,
      rightSlot,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name

    return (
      <div className={cn('w-full space-y-1.5 text-left', containerClassName)}>
        {(label || labelAction) && (
          <div className="flex items-center justify-between gap-3">
            {label && (
              <label
                htmlFor={inputId}
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                {label}
              </label>
            )}
            {labelAction}
          </div>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-slate-50',
              leftIcon && 'pl-10',
              rightSlot && 'pr-11',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-200 focus:border-brand-500 focus:ring-brand-200',
              className
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">{rightSlot}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
