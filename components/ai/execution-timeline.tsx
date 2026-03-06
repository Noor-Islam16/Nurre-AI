'use client'

import { useMemo } from 'react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { type ToolExecution } from '@/lib/ai/execution-logger'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Timer,
  Brain,
  User,
  Activity,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Undo2,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExecutionTimelineProps {
  executions: ToolExecution[]
  onExecutionClick?: (execution: ToolExecution) => void
  compact?: boolean
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
  navigate_to_page: ChevronRight,
  adjust_task_priority: TrendingUp,
  break_down_task: Zap,
  generate_reward: Zap,
}

const sourceIcons = {
  user: User,
  intervention: Brain,
  brain: Zap,
}

const statusColors = {
  success: 'bg-green-500',
  failed: 'bg-red-500',
  pending: 'bg-yellow-500',
}

const statusBorderColors = {
  success: 'border-green-200',
  failed: 'border-red-200',
  pending: 'border-yellow-200',
}

export function ExecutionTimeline({ 
  executions, 
  onExecutionClick,
  compact = false 
}: ExecutionTimelineProps) {
  // Group executions by date and hour
  const groupedExecutions = useMemo(() => {
    const groups: Record<string, Record<string, ToolExecution[]>> = {}
    
    executions.forEach((exec) => {
      const date = new Date(exec.timestamp)
      let dateKey: string
      
      if (isToday(date)) {
        dateKey = 'Today'
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday'
      } else {
        dateKey = format(date, 'EEEE, MMMM d')
      }
      
      const hourKey = format(date, 'h:00 a')
      
      if (!groups[dateKey]) {
        groups[dateKey] = {}
      }
      if (!groups[dateKey][hourKey]) {
        groups[dateKey][hourKey] = []
      }
      
      groups[dateKey][hourKey].push(exec)
    })
    
    // Sort executions within each hour group
    Object.values(groups).forEach((dateGroup) => {
      Object.values(dateGroup).forEach((hourGroup) => {
        hourGroup.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      })
    })
    
    return groups
  }, [executions])

  const renderTimelineNode = (execution: ToolExecution, isLast: boolean) => {
    const Icon = toolIcons[execution.tool] || Zap
    const SourceIcon = sourceIcons[execution.source]
    const time = format(new Date(execution.timestamp), 'h:mm a')
    const relativeTime = formatDistanceToNow(new Date(execution.timestamp), { addSuffix: true })

    return (
      <div className="flex gap-4 pb-8 relative group" key={execution.id}>
        {/* Timeline Line */}
        {!isLast && (
          <div className="absolute left-6 top-12 w-0.5 h-full bg-border" />
        )}
        
        {/* Timeline Node */}
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border-4 bg-background transition-all",
            statusBorderColors[execution.status],
            "group-hover:scale-110"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          
          {/* Status Indicator */}
          <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
            statusColors[execution.status]
          )} />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <Card 
            className={cn(
              "transition-all cursor-pointer",
              "hover:shadow-md hover:border-primary/50",
              compact && "p-2"
            )}
            onClick={() => onExecutionClick?.(execution)}
          >
            <CardContent className={cn("p-4", compact && "p-3")}>
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {execution.tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {execution.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {execution.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                  {execution.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <SourceIcon className="h-3 w-3 mr-1" />
                    {execution.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
              </div>
              
              {/* Message */}
              {execution.context.message && !compact && (
                <p className="text-sm text-muted-foreground mb-2">
                  {execution.context.message}
                </p>
              )}
              
              {/* Impact Summary */}
              {execution.impact && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {execution.impact.entitiesCreated && execution.impact.entitiesCreated.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Created {execution.impact.entitiesCreated.length} item(s)
                    </Badge>
                  )}
                  {execution.impact.stateChanges && execution.impact.stateChanges.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {execution.impact.stateChanges.length} changes
                    </Badge>
                  )}
                  {execution.impact.userResponse === 'helpful' && (
                    <Badge variant="default" className="text-xs">
                      Helpful
                    </Badge>
                  )}
                  {execution.impact.userResponse === 'not helpful' && (
                    <Badge variant="destructive" className="text-xs">
                      Not Helpful
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{relativeTime}</span>
                {execution.duration && (
                  <span>{execution.duration}ms</span>
                )}
                {execution.context.confidence && (
                  <span>Confidence: {Math.round(execution.context.confidence * 100)}%</span>
                )}
                {execution.undoable?.canUndo && (
                  <Button variant="ghost" size="sm" className="h-5 px-2">
                    <Undo2 className="h-3 w-3 mr-1" />
                    Undo
                  </Button>
                )}
                {execution.status === 'failed' && (
                  <Button variant="ghost" size="sm" className="h-5 px-2">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
              
              {/* Error Message */}
              {execution.error && !compact && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                  {execution.error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderCompactTimeline = () => {
    const recentExecutions = executions.slice(0, 10)
    
    return (
      <div className="space-y-2">
        {recentExecutions.map((execution, index) => {
          const Icon = toolIcons[execution.tool] || Zap
          const time = format(new Date(execution.timestamp), 'h:mm a')
          
          return (
            <div 
              key={execution.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onExecutionClick?.(execution)}
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                statusColors[execution.status]
              )} />
              
              <Icon className="h-4 w-4 text-muted-foreground" />
              
              <span className="text-sm flex-1">
                {execution.tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              
              <Badge variant="outline" className="text-xs">
                {execution.source}
              </Badge>
              
              <span className="text-xs text-muted-foreground">{time}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (compact) {
    return renderCompactTimeline()
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedExecutions).map(([date, hourGroups]) => (
        <div key={date}>
          {/* Date Header */}
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold">{date}</h3>
            <div className="flex-1 h-px bg-border" />
            <Badge variant="secondary">
              {Object.values(hourGroups).flat().length} activities
            </Badge>
          </div>
          
          {/* Hour Groups */}
          <div className="ml-8 space-y-6">
            {Object.entries(hourGroups)
              .sort((a, b) => {
                // Sort hours in descending order (most recent first)
                const hourA = parseInt(a[0].split(':')[0])
                const hourB = parseInt(b[0].split(':')[0])
                const isPMA = a[0].includes('PM')
                const isPMB = b[0].includes('PM')
                
                if (isPMA && !isPMB) return -1
                if (!isPMA && isPMB) return 1
                return hourB - hourA
              })
              .map(([hour, hourExecutions]) => (
                <div key={hour}>
                  {/* Hour Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">{hour}</span>
                    <span className="text-xs text-muted-foreground">
                      ({hourExecutions.length} {hourExecutions.length === 1 ? 'action' : 'actions'})
                    </span>
                  </div>
                  
                  {/* Executions */}
                  <div className="ml-6">
                    {hourExecutions.map((execution, index) => 
                      renderTimelineNode(execution, index === hourExecutions.length - 1)
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
      
      {executions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
            <p className="text-sm text-muted-foreground">
              Your AI assistant&apos;s activity will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}