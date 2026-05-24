import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'primary'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#dcfce7] text-[#166534]',
  warning: 'bg-[#fef3c7] text-[#92400e]',
  error:   'bg-[#ffdad6] text-[#93000a]',
  info:    'bg-[#dbeafe] text-[#1e40af]',
  neutral: 'bg-[#e5e9e7] text-[#3e4947]',
  purple:  'bg-[#ede9fe] text-[#4c1d95]',
  primary: 'bg-[#ccfbf1] text-[#0d9488]',
}

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-[#16a34a]',
  warning: 'bg-[#d97706]',
  error:   'bg-[#ba1a1a]',
  info:    'bg-[#2563eb]',
  neutral: 'bg-[#6e7977]',
  purple:  'bg-[#7c3aed]',
  primary: 'bg-[#0f766e]',
}

export function Badge({ variant = 'neutral', dot, size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}
