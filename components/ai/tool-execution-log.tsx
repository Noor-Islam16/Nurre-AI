'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Download, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolExecution, ToolStatus } from '@/lib/ai/tool-status-manager'
import { ToolStatusIndicator } from './tool-status-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ToolExecutionLogProps {
  executions: ToolExecution[]
  isMinimized?: boolean
  onToggleMinimize?: () => void
  onClear?: () => void
  onRetry?: (executionId: string) => void
  onCancel?: (executionId: string) => void
  maxHeight?: string
  showStats?: boolean
  autoScroll?: boolean
}

/**
 * Timeline view of tool executions with filtering and export
 */
export function ToolExecutionLog({
  executions,
  isMinimized = false,
  onToggleMinimize,
  onClear,
  onRetry,
  onCancel,
  maxHeight = '400px',
  showStats = true,
  autoScroll = true
}: ToolExecutionLogProps) {
  const [filter, setFilter] = useState<ToolStatus | 'all'>('all')
  const [groupByTime, setGroupByTime] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const logEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new executions are added
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [executions.length, autoScroll])
  
  // Filter executions
  const filteredExecutions = executions.filter(exec => {
    const matchesFilter = filter === 'all' || exec.status === filter
    const matchesSearch = searchTerm === '' || 
      exec.tool.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })
  
  // Group executions by time period
  const groupedExecutions = groupByTime 
    ? groupExecutionsByTime(filteredExecutions)
    : { 'All': filteredExecutions }
  
  // Calculate statistics
  const stats = calculateStats(executions)
  
  // Export execution log
  const handleExport = () => {
    const data = JSON.stringify(executions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tool-executions-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <motion.div
      layout
      className={cn(
        'bg-white rounded-lg border shadow-sm',
        isMinimized ? 'h-12' : ''
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-700" />
          <h3 className="font-medium text-sm">Tool Execution Log</h3>
          {executions.length > 0 && (
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {executions.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={executions.length === 0}
                className="h-7 px-2"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={executions.length === 0}
                className="h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          {onToggleMinimize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMinimize}
              className="h-7 px-2"
            >
              {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {/* Filters */}
            <div className="px-4 py-2 border-b bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-gray-700" />
                <div className="flex gap-1">
                  {(['all', ToolStatus.PENDING, ToolStatus.EXECUTING, ToolStatus.SUCCESS, ToolStatus.FAILED] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded transition-colors',
                        filter === status
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      )}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 text-xs text-gray-900"
                />
                <button
                  onClick={() => setGroupByTime(!groupByTime)}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    groupByTime
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  Group by time
                </button>
              </div>
            </div>
            
            {/* Statistics */}
            {showStats && stats.total > 0 && (
              <div className="px-4 py-2 bg-blue-50 border-b grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium text-gray-700">Total</div>
                  <div className="text-lg font-bold">{stats.total}</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">Success</div>
                  <div className="text-lg font-bold text-green-600">{stats.successful}</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-red-600">Failed</div>
                  <div className="text-lg font-bold text-red-600">{stats.failed}</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-blue-600">Active</div>
                  <div className="text-lg font-bold text-blue-600">{stats.active}</div>
                </div>
              </div>
            )}
            
            {/* Execution Timeline */}
            <div 
              className="overflow-y-auto p-4 space-y-3"
              style={{ maxHeight }}
            >
              {filteredExecutions.length === 0 ? (
                <div className="text-center text-gray-700 text-sm py-8">
                  {executions.length === 0 
                    ? 'No tool executions yet'
                    : 'No executions match your filters'
                  }
                </div>
              ) : (
                Object.entries(groupedExecutions).map(([period, periodExecutions]) => (
                  <div key={period} className="space-y-2">
                    {groupByTime && (
                      <div className="text-xs font-medium text-gray-700 sticky top-0 bg-white py-1">
                        {period}
                      </div>
                    )}
                    {periodExecutions.map((execution) => (
                      <ExecutionItem
                        key={execution.id}
                        execution={execution}
                        onRetry={() => onRetry?.(execution.id)}
                        onCancel={() => onCancel?.(execution.id)}
                      />
                    ))}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Individual execution item in the timeline
 */
function ExecutionItem({
  execution,
  onRetry,
  onCancel
}: {
  execution: ToolExecution
  onRetry?: () => void
  onCancel?: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const getStatusIcon = () => {
    switch (execution.status) {
      case ToolStatus.SUCCESS:
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case ToolStatus.FAILED:
        return <XCircle className="w-3 h-3 text-red-500" />
      case ToolStatus.EXECUTING:
        return <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
      case ToolStatus.PENDING:
        return <AlertCircle className="w-3 h-3 text-yellow-500" />
      default:
        return null
    }
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 text-xs"
    >
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className="mt-1">{getStatusIcon()}</div>
        <div className="w-px h-full bg-gray-200" />
      </div>
      
      {/* Content */}
      <div className="flex-1 -mt-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {execution.metadata?.description || execution.tool}
            </span>
            <span className="text-gray-700">
              {execution.startTime.toLocaleTimeString()}
            </span>
            {execution.duration && (
              <span className="text-gray-600">
                ({Math.round(execution.duration / 1000)}s)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {execution.status === ToolStatus.FAILED && onRetry && (
              <button
                onClick={onRetry}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Retry"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            {(execution.status === ToolStatus.PENDING || execution.status === ToolStatus.EXECUTING) && onCancel && (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Cancel"
              >
                <XCircle className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {execution.error && (
          <div className="mt-1 text-red-600 bg-red-50 rounded px-2 py-1">
            {execution.error}
          </div>
        )}
        
        {/* Expandable details */}
        {execution.details && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-blue-600 hover:underline"
          >
            {isExpanded ? 'Hide' : 'Show'} details
          </button>
        )}
        
        <AnimatePresence>
          {isExpanded && execution.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-1 bg-gray-50 rounded p-2 overflow-hidden"
            >
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(execution.details, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/**
 * Group executions by time period
 */
function groupExecutionsByTime(executions: ToolExecution[]): Record<string, ToolExecution[]> {
  const now = new Date()
  const groups: Record<string, ToolExecution[]> = {}
  
  executions.forEach(exec => {
    const diff = now.getTime() - exec.startTime.getTime()
    const minutes = diff / 60000
    const hours = minutes / 60
    
    let period: string
    if (minutes < 1) {
      period = 'Just now'
    } else if (minutes < 5) {
      period = 'Last 5 minutes'
    } else if (minutes < 30) {
      period = 'Last 30 minutes'
    } else if (hours < 1) {
      period = 'Last hour'
    } else if (hours < 24) {
      period = 'Today'
    } else {
      period = exec.startTime.toLocaleDateString()
    }
    
    if (!groups[period]) {
      groups[period] = []
    }
    groups[period].push(exec)
  })
  
  return groups
}

/**
 * Calculate execution statistics
 */
function calculateStats(executions: ToolExecution[]) {
  const successful = executions.filter(e => e.status === ToolStatus.SUCCESS).length
  const failed = executions.filter(e => e.status === ToolStatus.FAILED).length
  const active = executions.filter(e => 
    e.status === ToolStatus.PENDING || e.status === ToolStatus.EXECUTING
  ).length
  
  return {
    total: executions.length,
    successful,
    failed,
    active
  }
}