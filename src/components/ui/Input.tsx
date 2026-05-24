import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, required, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
            {label}
            {required && <span className="text-[#ba1a1a] ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#6e7977]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full rounded-[10px] border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm text-[#181c1c] placeholder:text-[#6e7977]/60',
              'transition-all duration-150',
              'focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15',
              'disabled:bg-[#f1f4f3] disabled:cursor-not-allowed disabled:text-[#6e7977]',
              error && 'border-[#ba1a1a] focus:border-[#ba1a1a] focus:ring-[#ba1a1a]/15',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              className
            )}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 text-[#6e7977] hover:text-[#005c55] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-[#6e7977]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-[#ba1a1a] flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-[#6e7977]">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
