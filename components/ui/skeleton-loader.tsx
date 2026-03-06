'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'button'
  className?: string
  width?: string
  height?: string
  lines?: number
}

const variantConfig = {
  text: {
    base: 'h-4 rounded',
    width: 'w-full'
  },
  card: {
    base: 'rounded-lg p-4 space-y-3',
    width: 'w-full',
    height: 'min-h-[120px]'
  },
  avatar: {
    base: 'rounded-full',
    width: 'w-10 h-10',
    height: ''
  },
  button: {
    base: 'rounded-md',
    width: 'w-24',
    height: 'h-8'
  }
}

export function Skeleton({ 
  variant = 'text', 
  className,
  width,
  height,
  lines = 1
}: SkeletonProps) {
  const config = variantConfig[variant]
  
  const pulseAnimation = {
    animate: {
      opacity: [0.4, 0.8, 0.4]
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
  
  if (variant === 'card') {
    return (
      <motion.div
        {...pulseAnimation}
        className={cn(
          "bg-gray-200",
          config.base,
          config.width,
          'height' in config ? config.height : '',
          className
        )}
        style={{ width, height }}
      >
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="w-3/4 h-3 bg-gray-300 rounded" />
            <div className="w-1/2 h-3 bg-gray-300 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="w-full h-3 bg-gray-300 rounded" />
          <div className="w-4/5 h-3 bg-gray-300 rounded" />
        </div>
      </motion.div>
    )
  }
  
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            {...pulseAnimation}
            className={cn(
              "bg-gray-200",
              config.base,
              index === lines - 1 && lines > 1 ? 'w-3/4' : config.width
            )}
            style={{ 
              width: width && index === 0 ? width : undefined,
              height: height && index === 0 ? height : undefined
            }}
          />
        ))}
      </div>
    )
  }
  
  return (
    <motion.div
      {...pulseAnimation}
      className={cn(
        "bg-gray-200",
        config.base,
        config.width,
        'height' in config ? config.height : '',
        className
      )}
      style={{ width, height }}
    />
  )
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 3, className }: { lines?: number, className?: string }) {
  return <Skeleton variant="text" lines={lines} className={className} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton variant="card" className={className} />
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton variant="avatar" className={className} />
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton variant="button" className={className} />
}

// Task-specific skeletons
export function TaskSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("p-4 border rounded-lg bg-white", className)}
    >
      <div className="flex items-start justify-between mb-2">
        <Skeleton width="60%" height="20px" />
        <Skeleton variant="button" width="60px" />
      </div>
      <Skeleton variant="text" lines={2} className="mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton width="80px" height="16px" />
        <Skeleton width="40px" height="16px" />
      </div>
    </motion.div>
  )
}

export function DashboardCardSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("p-6 border rounded-lg bg-white", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton width="40%" height="20px" />
        <Skeleton variant="avatar" width="32px" height="32px" />
      </div>
      <Skeleton width="30%" height="32px" className="mb-2" />
      <Skeleton variant="text" lines={2} />
    </motion.div>
  )
}