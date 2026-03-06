'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  color?: string
}

const sizeConfig = {
  sm: {
    dot: 'w-1 h-1',
    container: 'space-x-1'
  },
  md: {
    dot: 'w-2 h-2', 
    container: 'space-x-2'
  },
  lg: {
    dot: 'w-3 h-3',
    container: 'space-x-2'
  }
}

export function LoadingDots({ 
  size = 'md', 
  className,
  color = 'bg-gray-400' 
}: LoadingDotsProps) {
  const config = sizeConfig[size]
  
  const dotVariants = {
    initial: { y: 0 },
    animate: {
      y: [-2, 2, -2],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex items-center", config.container, className)}
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.1 }}
          className={cn("rounded-full", config.dot, color)}
        />
      ))}
    </motion.div>
  )
}

// Preset components for common use cases
export function InlineLoadingDots({ className }: { className?: string }) {
  return (
    <LoadingDots 
      size="sm" 
      className={cn("inline-flex ml-1", className)} 
    />
  )
}

export function ChatLoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="bg-gray-100 rounded-lg px-3 py-2">
        <LoadingDots size="md" />
      </div>
    </div>
  )
}