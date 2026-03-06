'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, endOfDay, subDays } from 'date-fns'
import { 
  useExecutionLogger, 
  type ToolExecution, 
  type FilterOptions,
  type ExecutionStatistics 
} from '@/lib/ai/execution-logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Undo2,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Timer,
  Zap,
  Brain,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Code,
  FileJson,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExecutionTimeline } from './execution-timeline'

interface ExecutionHistoryProps {
  view?: 'timeline' | 'list' | 'grouped'
  compact?: boolean
  maxHeight?: string
}

const toolIcons: Record<string, any> = {
  create_task: Zap,
  start_focus_timer: Timer,
  pause_focus_timer: Clock,
  resume_focus_timer: Clock,
  complete_task: CheckCircle2,
  update_task_progress: Activity,
  suggest_break: Clock,
  provide_encouragement: Brain,
  track_mood: Brain,
  analyze_patterns: BarChart3,
  set_reminder: Clock,
  navigate_to_page: Eye,
  adjust_task_priority: TrendingUp,
  break_down_task: Zap,
  generate_reward: Zap,
}

const sourceColors = {
  user: 'bg-blue-500',
  intervention: 'bg-purple-500',
  brain: 'bg-success-500',
}

const statusIcons = {
  success: CheckCircle2,
  failed: XCircle,
  pending: AlertCircle,
}

const statusColors = {
  success: 'text-success-500',
  failed: 'text-danger-500',
  pending: 'text-warning-500',
}

export function ExecutionHistory({ 
  view: initialView = 'list', 
  compact = false,
  maxHeight = '600px' 
}: ExecutionHistoryProps) {
  const {
    executions,
    getHistory,
    getStatistics,
    deleteExecution,
    rateExecution,
    undoExecution,
    retryExecution,
    exportHistory,
    importHistory,
    clearHistory,
    setPrivateMode,
    privateMode,
  } = useExecutionLogger()

  const [view, setView] = useState<'timeline' | 'list' | 'grouped' | 'analytics'>(initialView)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTool, setSelectedTool] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'failed' | 'pending'>('all')
  const [selectedSource, setSelectedSource] = useState<'all' | 'user' | 'intervention' | 'brain'>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [executionToDelete, setExecutionToDelete] = useState<string | null>(null)
  const [showDeveloperMode, setShowDeveloperMode] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importData, setImportData] = useState('')

  // Calculate date range filter
  const dateFilter = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) }
      case 'week':
        return { start: subDays(now, 7), end: now }
      case 'month':
        return { start: subDays(now, 30), end: now }
      default:
        return undefined
    }
  }, [dateRange])

  // Build filter options
  const filters: FilterOptions = {
    dateRange: dateFilter,
    tools: selectedTool !== 'all' ? [selectedTool] : undefined,
    status: selectedStatus,
    source: selectedSource,
    search: searchQuery,
  }

  // Get filtered executions
  const filteredExecutions = useMemo(() => getHistory(filters), [filters, executions])

  // Get statistics
  const statistics = useMemo(() => getStatistics(dateFilter), [dateFilter, executions])

  // Get unique tools
  const uniqueTools = useMemo(() => {
    const tools = new Set(executions.map(e => e.tool))
    return Array.from(tools).sort()
  }, [executions])

  // Group executions by date
  const groupedExecutions = useMemo(() => {
    const groups: Record<string, ToolExecution[]> = {}
    
    filteredExecutions.forEach((exec) => {
      const date = new Date(exec.timestamp)
      let groupKey: string
      
      if (isToday(date)) {
        groupKey = 'Today'
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday'
      } else {
        groupKey = format(date, 'MMMM d, yyyy')
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(exec)
    })
    
    return groups
  }, [filteredExecutions])

  const toggleCardExpansion = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = (id: string) => {
    setExecutionToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (executionToDelete) {
      deleteExecution(executionToDelete)
    }
    setDeleteDialogOpen(false)
    setExecutionToDelete(null)
  }

  const handleUndo = async (id: string) => {
    const success = await undoExecution(id)
    if (success) {
      // Show success message
    }
  }

  const handleRetry = async (id: string) => {
    try {
      await retryExecution(id)
      // Show success message
    } catch (error) {
      // Show error message
    }
  }

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportHistory(format)
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-execution-history.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const success = importHistory(importData, 'json')
    if (success) {
      setImportDialogOpen(false)
      setImportData('')
    }
  }

  const handleClearHistory = () => {
    clearHistory()
  }

  const renderExecutionCard = (execution: ToolExecution) => {
    const Icon = toolIcons[execution.tool] || Zap
    const StatusIcon = statusIcons[execution.status]
    const isExpanded = expandedCards.has(execution.id)

    return (
      <Card key={execution.id} className="mb-2">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn(
                "p-2 rounded-lg",
                execution.status === 'success' ? 'bg-green-50' :
                execution.status === 'failed' ? 'bg-red-50' : 'bg-yellow-50'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {execution.tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <StatusIcon className={cn("h-4 w-4", statusColors[execution.status])} />
                  <Badge variant="outline" className="text-xs">
                    {execution.source}
                  </Badge>
                </div>
                
                {execution.context.message && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {execution.context.message}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(execution.timestamp), { addSuffix: true })}</span>
                  {execution.duration && (
                    <span>{execution.duration}ms</span>
                  )}
                  {execution.context.confidence && (
                    <span>Confidence: {Math.round(execution.context.confidence * 100)}%</span>
                  )}
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    {/* Parameters */}
                    {Object.keys(execution.parameters).length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium mb-1">Parameters</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(execution.parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* Result */}
                    {execution.result && (
                      <div>
                        <h4 className="text-xs font-medium mb-1">Result</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(execution.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* Impact */}
                    {execution.impact && (
                      <div>
                        <h4 className="text-xs font-medium mb-1">Impact</h4>
                        {execution.impact.entitiesCreated && (
                          <p className="text-xs">Created: {execution.impact.entitiesCreated.join(', ')}</p>
                        )}
                        {execution.impact.stateChanges && execution.impact.stateChanges.length > 0 && (
                          <div className="text-xs">
                            {execution.impact.stateChanges.map((change, i) => (
                              <div key={i}>
                                {change.entity}.{change.field}: {String(change.oldValue)} → {String(change.newValue)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Error */}
                    {execution.error && (
                      <div>
                        <h4 className="text-xs font-medium mb-1 text-danger-500">Error</h4>
                        <pre className="text-xs bg-red-50 text-red-900 p-2 rounded">
                          {execution.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCardExpansion(execution.id)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {execution.undoable?.canUndo && (
                    <DropdownMenuItem onClick={() => handleUndo(execution.id)}>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo
                    </DropdownMenuItem>
                  )}
                  
                  {execution.status === 'failed' && (
                    <DropdownMenuItem onClick={() => handleRetry(execution.id)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => rateExecution(execution.id, true)}>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Helpful
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => rateExecution(execution.id, false)}>
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Not Helpful
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={() => handleDelete(execution.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderAnalytics = () => (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{statistics.totalExecutions}</div>
            <div className="text-sm text-muted-foreground">Total Executions</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success-500">
              {statistics.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{statistics.mostUsedTool.name}</div>
            <div className="text-sm text-muted-foreground">
              Most Used ({statistics.mostUsedTool.count}x)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {((statistics.interventionsAccepted / (statistics.interventionsAccepted + statistics.interventionsRejected)) * 100 || 0).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Interventions Accepted</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tool Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statistics.toolUsage).map(([tool, count]) => (
              <div key={tool} className="flex items-center justify-between">
                <span className="text-sm">{tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statistics.dailyTrend.map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <span className="text-sm">{day.date}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{day.count} executions</span>
                  <Badge variant={day.successRate > 80 ? 'default' : 'secondary'}>
                    {day.successRate.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search executions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedTool} onValueChange={setSelectedTool}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Tools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  {uniqueTools.map((tool) => (
                    <SelectItem key={tool} value={tool}>
                      {tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedSource} onValueChange={(v) => setSelectedSource(v as any)}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="intervention">Intervention</SelectItem>
                  <SelectItem value="brain">Brain</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* View Toggles and Actions */}
            <div className="flex flex-col md:flex-row justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  variant={view === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('list')}
                >
                  List
                </Button>
                <Button
                  variant={view === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('timeline')}
                >
                  Timeline
                </Button>
                <Button
                  variant={view === 'grouped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('grouped')}
                >
                  Grouped
                </Button>
                <Button
                  variant={view === 'analytics' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('analytics')}
                >
                  Analytics
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrivateMode(!privateMode)}
                >
                  {privateMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      <FileJson className="h-4 w-4 mr-2" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeveloperMode(!showDeveloperMode)}
                >
                  <Code className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Content Area */}
      <ScrollArea style={{ height: maxHeight }}>
        {view === 'timeline' && (
          <ExecutionTimeline executions={filteredExecutions} />
        )}
        
        {view === 'list' && (
          <div className="space-y-2">
            {filteredExecutions.map((execution) => renderExecutionCard(execution))}
            {filteredExecutions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No executions found</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {view === 'grouped' && (
          <div className="space-y-4">
            {Object.entries(groupedExecutions).map(([date, execs]) => (
              <div key={date}>
                <h3 className="text-sm font-medium mb-2">{date}</h3>
                <div className="space-y-2">
                  {execs.map((execution) => renderExecutionCard(execution))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {view === 'analytics' && renderAnalytics()}
      </ScrollArea>
      
      {/* Developer Mode */}
      {showDeveloperMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Developer Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify({ filters, statistics, executionCount: filteredExecutions.length }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Execution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this execution from history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Execution History</AlertDialogTitle>
            <AlertDialogDescription>
              Paste your exported JSON data below to import execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              className="text-gray-900 h-32"
              placeholder="Paste JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}