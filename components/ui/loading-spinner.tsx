'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

const sizeConfig = {
  sm: {
    container: 'w-4 h-4',
    icon: 'w-4 h-4'
  },
  md: {
    container: 'w-6 h-6', 
    icon: 'w-6 h-6'
  },
  lg: {
    container: 'w-8 h-8',
    icon: 'w-8 h-8'
  }
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  children 
}: LoadingSpinnerProps) {
  const config = sizeConfig[size]
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("flex items-center justify-center", config.container)}
      >
        <Loader2 className={cn("animate-spin text-gray-700", config.icon)} />
      </motion.div>
      {children && (
        <span className={cn(
          "text-gray-700",
          size === 'sm' && "text-sm",
          size === 'lg' && "text-lg"
        )}>
          {children}
        </span>
      )}
    </div>
  )
}