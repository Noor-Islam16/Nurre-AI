'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  AlertCircle,
  UserX,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AbuseLog {
  id: string
  user_id: string
  violation_type: string
  severity: string
  timestamp: string
  action_taken: string
  user?: {
    email: string
    display_name?: string
  }
}

interface UserRestriction {
  user_id: string
  restriction_level: string
  violations_count: number
  last_violation: string
  suspension_ends_at?: string
  user?: {
    email: string
    display_name?: string
  }
}

interface AdminAlert {
  id: string
  type: string
  severity: string
  user_id: string
  details: any
  created_at: string
}

interface ModerationData {
  logs: AbuseLog[]
  restrictions: UserRestriction[]
  alerts: AdminAlert[]
  stats: {
    totalViolations: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    uniqueUsers: number
    activeRestrictions: number
    pendingAlerts: number
    recentTrend: 'increasing' | 'stable' | 'decreasing'
  }
}

export default function ModerationPage() {
  const [data, setData] = useState<ModerationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        range: timeRange,
        severity: severityFilter
      })
      const response = await fetch(`/api/admin/abuse-reports?${params}`)
      if (!response.ok) throw new Error('Failed to fetch moderation data')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch moderation data:', error)
      setMessage({ type: 'error', text: 'Failed to load moderation data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange, severityFilter])

  const handleAction = async (action: string, userId: string, alertId?: string) => {
    setActionLoading(`${action}-${userId}`)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/abuse-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          alertId,
          reason: 'Admin action via moderation panel'
        })
      })

      if (!response.ok) throw new Error('Action failed')

      setMessage({ type: 'success', text: `Successfully executed: ${action}` })
      fetchData() // Refresh data
    } catch (error) {
      console.error('Action failed:', error)
      setMessage({ type: 'error', text: 'Failed to execute action' })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load moderation data</AlertDescription>
      </Alert>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage content violations and user restrictions
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Message Display */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-destructive' : ''}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{data.stats.totalViolations}</span>
              {getTrendIcon(data.stats.recentTrend)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.stats.uniqueUsers} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.activeRestrictions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Users with limitations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Violation Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(data.stats.byType).slice(0, 3).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Alerts */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Admin Alerts
            </CardTitle>
            <CardDescription>
              Critical violations requiring immediate review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{alert.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('mark_reviewed', alert.user_id, alert.id)}
                    disabled={actionLoading === `mark_reviewed-${alert.user_id}`}
                  >
                    {actionLoading === `mark_reviewed-${alert.user_id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Reviewed
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Restrictions */}
      {data.restrictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active User Restrictions
            </CardTitle>
            <CardDescription>
              Users with current access limitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Restriction</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Last Violation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.restrictions.map((restriction) => (
                  <TableRow key={restriction.user_id}>
                    <TableCell>
                      <div className="text-sm">
                        {restriction.user?.email || restriction.user_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={restriction.restriction_level === 'suspended' ? 'destructive' : 'secondary'}>
                        {restriction.restriction_level}
                      </Badge>
                    </TableCell>
                    <TableCell>{restriction.violations_count}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(restriction.last_violation), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('lift_restriction', restriction.user_id)}
                          disabled={actionLoading === `lift_restriction-${restriction.user_id}`}
                        >
                          {actionLoading === `lift_restriction-${restriction.user_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Lift'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('reset_violations', restriction.user_id)}
                          disabled={actionLoading === `reset_violations-${restriction.user_id}`}
                        >
                          {actionLoading === `reset_violations-${restriction.user_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Reset'
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Violations</CardTitle>
          <CardDescription>
            Latest detected violations and actions taken
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No violations found in the selected time range
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Violation</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Action Taken</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.slice(0, 10).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.user?.email || log.user_id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {log.violation_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.severity === 'critical' ? 'destructive' :
                          log.severity === 'high' ? 'default' :
                          'secondary'
                        }
                      >
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {log.action_taken || 'Logged'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}