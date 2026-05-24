import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name?: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

export function Avatar({ name = '', src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeMap[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-[#0f766e] text-white font-bold flex items-center justify-center flex-shrink-0 select-none',
        sizeMap[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
