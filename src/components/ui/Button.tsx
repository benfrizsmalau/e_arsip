import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[#0f766e] text-white hover:bg-[#005c55] active:bg-[#00413c] shadow-sm hover:shadow-md',
        secondary:
          'bg-[#fe932c] text-white hover:bg-[#ea580c] active:bg-[#c2410c] shadow-sm',
        outline:
          'border border-[#CBD5E1] bg-white text-[#181c1c] hover:bg-[#f1f4f3] hover:border-[#0f766e] hover:text-[#0f766e]',
        ghost:
          'text-[#3e4947] hover:bg-[#ebefed] hover:text-[#005c55]',
        destructive:
          'bg-[#ba1a1a] text-white hover:bg-[#93000a] shadow-sm',
        success:
          'bg-[#166534] text-white hover:bg-[#14532d] shadow-sm',
        link:
          'text-[#0f766e] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        xs:  'h-7 px-3 text-xs gap-1.5',
        sm:  'h-8 px-3 text-sm',
        md:  'h-10 px-4 text-sm',
        lg:  'h-11 px-5 text-base',
        xl:  'h-12 px-6 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
        'icon-lg': 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
