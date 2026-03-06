'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, X, Minimize2, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  getToolStatusManager, 
  ToolExecution, 
  ToolStatus,
  ToolStatusEvent 
} from '@/lib/ai/tool-status-manager'
import { ToolStatusIndicator } from './tool-status-indicator'
import { ToolExecutionLog } from './tool-execution-log'
import { Button } from '@/components/ui/button'

interface ToolExecutionPanelProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  defaultMinimized?: boolean
  showBadge?: boolean
  maxExecutions?: number
  autoHide?: boolean
  autoHideDelay?: number
}

/**
 * Floating panel showing live tool execution status
 */
export function ToolExecutionPanel({
  position = 'bottom-right',
  defaultMinimized = false,
  showBadge = true,
  maxExecutions = 20,
  autoHide = true,
  autoHideDelay = 10000
}: ToolExecutionPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)
  const [isLogView, setIsLogView] = useState(false)
  const [executions, setExecutions] = useState<ToolExecution[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    const manager = getToolStatusManager()
    
    // Load initial executions
    const active = manager.getActiveExecutions()
    const history = manager.getHistory(maxExecutions)
    setExecutions([...active, ...history].slice(0, maxExecutions))
    setActiveCount(active.length)
    setIsVisible(active.length > 0)
    
    // Listen for execution events
    const handleExecutionAdded = (execution: ToolExecution) => {
      setExecutions(prev => [execution, ...prev].slice(0, maxExecutions))
      setActiveCount(prev => prev + 1)
      setIsVisible(true)
      resetAutoHideTimer()
    }
    
    const handleStatusUpdated = (execution: ToolExecution) => {
      setExecutions(prev => 
        prev.map(e => e.id === execution.id ? execution : e)
      )
      
      // Update active count
      const isCompleted = [
        ToolStatus.SUCCESS, 
        ToolStatus.FAILED, 
        ToolStatus.CANCELLED
      ].includes(execution.status)
      
      if (isCompleted) {
        setActiveCount(prev => Math.max(0, prev - 1))
        startAutoHideTimer()
      }
    }
    
    const handleBatchCleared = () => {
      const active = manager.getActiveExecutions()
      const history = manager.getHistory(maxExecutions)
      setExecutions([...active, ...history].slice(0, maxExecutions))
    }
    
    manager.on(ToolStatusEvent.EXECUTION_ADDED, handleExecutionAdded)
    manager.on(ToolStatusEvent.STATUS_UPDATED, handleStatusUpdated)
    manager.on(ToolStatusEvent.BATCH_CLEARED, handleBatchCleared)
    
    return () => {
      manager.off(ToolStatusEvent.EXECUTION_ADDED, handleExecutionAdded)
      manager.off(ToolStatusEvent.STATUS_UPDATED, handleStatusUpdated)
      manager.off(ToolStatusEvent.BATCH_CLEARED, handleBatchCleared)
      
      if (hideTimer) {
        clearTimeout(hideTimer)
      }
    }
  }, [maxExecutions])
  
  const startAutoHideTimer = () => {
    if (!autoHide) return
    
    if (hideTimer) {
      clearTimeout(hideTimer)
    }
    
    const timer = setTimeout(() => {
      const manager = getToolStatusManager()
      const active = manager.getActiveExecutions()
      if (active.length === 0) {
        setIsVisible(false)
      }
    }, autoHideDelay)
    
    setHideTimer(timer)
  }
  
  const resetAutoHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      setHideTimer(null)
    }
  }
  
  const handleRetry = (executionId: string) => {
    // Implement retry logic
    console.log('Retry execution:', executionId)
  }
  
  const handleCancel = (executionId: string) => {
    const manager = getToolStatusManager()
    manager.cancelExecution(executionId)
  }
  
  const handleClear = () => {
    const manager = getToolStatusManager()
    manager.clearCompleted()
  }
  
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-right':
        return 'top-20 right-4'
      case 'top-left':
        return 'top-20 left-4'
    }
  }
  
  // Active executions for compact view
  const activeExecutions = executions.filter(e => 
    e.status === ToolStatus.PENDING || e.status === ToolStatus.EXECUTING
  )
  
  if (!isVisible && activeCount === 0) {
    return null
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          'fixed z-50',
          getPositionClasses(),
          isMinimized ? 'w-auto' : 'w-96'
        )}
        onMouseEnter={resetAutoHideTimer}
        onMouseLeave={startAutoHideTimer}
      >
        {isMinimized ? (
          // Minimized view - just a badge
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(false)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full shadow-lg',
              activeCount > 0 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            )}
          >
            <Wrench className="w-4 h-4" />
            {activeCount > 0 && (
              <span className="font-medium text-sm">
                {activeCount} active
              </span>
            )}
            {activeCount === 0 && executions.length > 0 && (
              <span className="text-sm">
                {executions.length} completed
              </span>
            )}
          </motion.button>
        ) : (
          // Expanded view
          <motion.div
            layout
            className="bg-white rounded-lg shadow-xl border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                <span className="font-medium text-sm">Tool Execution</span>
                {showBadge && activeCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {activeCount}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLogView(!isLogView)}
                  className="h-6 px-2 text-white hover:bg-white/20"
                >
                  {isLogView ? 'Live' : 'Log'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-6 px-2 text-white hover:bg-white/20"
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="h-6 px-2 text-white hover:bg-white/20"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            {isLogView ? (
              <ToolExecutionLog
                executions={executions}
                onClear={handleClear}
                onRetry={handleRetry}
                onCancel={handleCancel}
                maxHeight="300px"
                showStats={false}
              />
            ) : (
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                {activeExecutions.length > 0 ? (
                  <>
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Active Executions ({activeExecutions.length})
                    </div>
                    {activeExecutions.map(execution => (
                      <ToolStatusIndicator
                        key={execution.id}
                        toolName={execution.tool}
                        status={execution.status}
                        progress={execution.progress}
                        error={execution.error}
                        details={execution.details}
                        onCancel={() => handleCancel(execution.id)}
                      />
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-700 text-sm">
                    No active executions
                  </div>
                )}
                
                {/* Recent completions */}
                {activeExecutions.length === 0 && executions.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Recent Completions
                    </div>
                    {executions.slice(0, 3).map(execution => (
                      <ToolStatusIndicator
                        key={execution.id}
                        toolName={execution.tool}
                        status={execution.status}
                        error={execution.error}
                        compact
                        showLabel={false}
                        onRetry={execution.status === ToolStatus.FAILED 
                          ? () => handleRetry(execution.id)
                          : undefined
                        }
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}