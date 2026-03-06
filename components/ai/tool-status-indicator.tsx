'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ListTodo,
  Timer,
  Pause,
  Brain,
  Heart,
  Wind,
  Calendar,
  Navigation,
  Sparkles,
  Bell,
  Volume2,
  VolumeX,
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolStatus } from '@/lib/ai/tool-status-manager'
import { useEffect, useState } from 'react'

interface ToolStatusIndicatorProps {
  toolName: string
  status: ToolStatus
  details?: any
  progress?: number
  error?: string
  compact?: boolean
  showLabel?: boolean
  onRetry?: () => void
  onCancel?: () => void
}

/**
 * Visual indicator for tool execution status
 */
export function ToolStatusIndicator({
  toolName,
  status,
  details,
  progress,
  error,
  compact = false,
  showLabel = true,
  onRetry,
  onCancel
}: ToolStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(true)
  
  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldAnimate(!mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setShouldAnimate(!e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  const getToolIcon = () => {
    const iconClass = compact ? 'w-4 h-4' : 'w-5 h-5'
    
    const icons: Record<string, React.ReactElement> = {
      create_task: <ListTodo className={iconClass} />,
      update_task: <ListTodo className={iconClass} />,
      break_down_task: <ListTodo className={iconClass} />,
      start_focus: <Timer className={iconClass} />,
      pause_focus: <Pause className={iconClass} />,
      end_focus: <Timer className={iconClass} />,
      submit_mood: <Heart className={iconClass} />,
      start_breathing: <Wind className={iconClass} />,
      trigger_break: <Calendar className={iconClass} />,
      navigate_to: <Navigation className={iconClass} />,
      show_celebration: <Sparkles className={iconClass} />,
      schedule_reminder: <Bell className={iconClass} />,
      play_background_noise: <Volume2 className={iconClass} />,
      stop_background_noise: <VolumeX className={iconClass} />,
    }
    
    return icons[toolName] || <Wrench className={iconClass} />
  }
  
  const getStatusIcon = () => {
    const iconClass = compact ? 'w-3 h-3' : 'w-4 h-4'
    
    switch (status) {
      case ToolStatus.PENDING:
        return shouldAnimate ? (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <AlertCircle className={cn(iconClass, 'text-yellow-500')} />
          </motion.div>
        ) : (
          <AlertCircle className={cn(iconClass, 'text-yellow-500')} />
        )
        
      case ToolStatus.EXECUTING:
        return shouldAnimate ? (
          <Loader2 className={cn(iconClass, 'text-blue-500 animate-spin')} />
        ) : (
          <Loader2 className={cn(iconClass, 'text-blue-500')} />
        )
        
      case ToolStatus.SUCCESS:
        return (
          <motion.div
            initial={shouldAnimate ? { scale: 0 } : {}}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            <CheckCircle className={cn(iconClass, 'text-green-500')} />
          </motion.div>
        )
        
      case ToolStatus.FAILED:
        return (
          <motion.div
            initial={shouldAnimate ? { scale: 0 } : {}}
            animate={shouldAnimate ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <XCircle className={cn(iconClass, 'text-red-500')} />
          </motion.div>
        )
        
      case ToolStatus.CANCELLED:
        return <XCircle className={cn(iconClass, 'text-gray-700')} />
        
      default:
        return null
    }
  }
  
  const getStatusColor = () => {
    switch (status) {
      case ToolStatus.PENDING:
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      case ToolStatus.EXECUTING:
        return 'bg-blue-50 border-blue-200 text-blue-900'
      case ToolStatus.SUCCESS:
        return 'bg-green-50 border-green-200 text-green-900'
      case ToolStatus.FAILED:
        return 'bg-red-50 border-red-200 text-red-900'
      case ToolStatus.CANCELLED:
        return 'bg-gray-50 border-gray-200 text-gray-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900'
    }
  }
  
  const getStatusLabel = () => {
    const labels: Record<string, string> = {
      create_task: 'Creating task',
      update_task: 'Updating task',
      break_down_task: 'Breaking down task',
      start_focus: 'Starting focus session',
      pause_focus: 'Pausing focus',
      end_focus: 'Ending focus session',
      submit_mood: 'Recording mood',
      start_breathing: 'Starting breathing exercise',
      trigger_break: 'Scheduling break',
      navigate_to: 'Navigating',
      show_celebration: 'Celebrating',
      schedule_reminder: 'Setting reminder',
      play_background_noise: 'Playing sounds',
      stop_background_noise: 'Stopping sounds'
    }
    
    return labels[toolName] || toolName
  }
  
  const getStatusText = () => {
    switch (status) {
      case ToolStatus.PENDING:
        return 'Waiting...'
      case ToolStatus.EXECUTING:
        return progress !== undefined ? `${progress}%` : 'In progress...'
      case ToolStatus.SUCCESS:
        return 'Complete'
      case ToolStatus.FAILED:
        return 'Failed'
      case ToolStatus.CANCELLED:
        return 'Cancelled'
      default:
        return ''
    }
  }
  
  if (compact) {
    return (
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        exit={shouldAnimate ? { opacity: 0, scale: 0.8 } : {}}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
          getStatusColor()
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        role="status"
        aria-label={`${getStatusLabel()}: ${getStatusText()}`}
        aria-live="polite"
      >
        {getToolIcon()}
        {getStatusIcon()}
        {showLabel && <span className="ml-1">{getStatusText()}</span>}
      </motion.div>
    )
  }
  
  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldAnimate ? { opacity: 0, y: -10 } : {}}
        className={cn(
          'rounded-lg border p-3 mb-2',
          getStatusColor()
        )}
        role="status"
        aria-label={`${getStatusLabel()}: ${getStatusText()}`}
        aria-live="polite"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getToolIcon()}
            <div className="flex-1">
              <div className="font-medium text-sm">{getStatusLabel()}</div>
              <div className="text-xs opacity-75 mt-0.5">{getStatusText()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {status === ToolStatus.FAILED && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                aria-label="Retry execution"
              >
                Retry
              </button>
            )}
            {(status === ToolStatus.PENDING || status === ToolStatus.EXECUTING) && onCancel && (
              <button
                onClick={onCancel}
                className="text-xs px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                aria-label="Cancel execution"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        
        {/* Progress bar for executing status */}
        {status === ToolStatus.EXECUTING && progress !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
        
        {/* Error details */}
        {status === ToolStatus.FAILED && error && (
          <div className="mt-2 text-xs bg-red-100 rounded p-2">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
        
        {/* Expandable details */}
        {details && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs underline opacity-75 hover:opacity-100"
          >
            {isExpanded ? 'Hide' : 'Show'} details
          </button>
        )}
        
        <AnimatePresence>
          {isExpanded && details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 text-xs bg-white/30 rounded p-2 overflow-hidden"
            >
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(details, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}