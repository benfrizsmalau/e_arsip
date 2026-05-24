import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glass?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

function Card({ className, hover, glass, padding = 'md', children, ...props }: CardProps) {
  const Component = hover ? motion.div : 'div'
  const motionProps = hover
    ? {
        whileHover: { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
      }
    : {}

  return (
    <Component
      className={cn(
        'rounded-[14px] border border-[#CBD5E1]',
        glass
          ? 'bg-white/80 backdrop-blur-sm'
          : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]',
        padding === 'none' && 'p-0',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',
        hover && 'cursor-pointer transition-shadow',
        className
      )}
      {...motionProps}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </Component>
  )
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-semibold text-[#181c1c] text-base leading-tight', className)}
      style={{ fontFamily: 'Sora, sans-serif' }}
      {...props}
    >
      {children}
    </h3>
  )
}

function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between pt-4 mt-4 border-t border-[#e5e9e7]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
