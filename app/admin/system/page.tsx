import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CleanupMonitor } from '@/components/admin/cleanup-monitor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Database,
  HardDrive,
  Zap,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react'

async function getSystemStats() {
  const supabase = await createClient()

  // Get database table sizes
  const { data: tableSizes } = await supabase
    .rpc('get_table_sizes')
    .limit(10)

  // Get index statistics
  const { data: indexStats } = await supabase
    .rpc('get_index_stats')
    .limit(10)

  // Get recent errors (simulated - in production would query error logs)
  const { count: errorCount24h } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'error')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Get API usage stats
  const { count: apiCalls24h } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .in('type', ['ai_message', 'ai_intervention', 'tool_executed'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Get guardrail stats
  const { data: guardrailStats } = await supabase
    .from('guardrail_logs')
    .select('action')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const guardrailCounts = guardrailStats?.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Get database connection info (mock data - would come from monitoring service)
  const dbInfo = {
    version: 'PostgreSQL 15.1',
    maxConnections: 100,
    activeConnections: 12,
    cacheHitRatio: 99.2,
    avgQueryTime: 1.3,
    slowQueries: 3,
  }

  return {
    tableSizes,
    indexStats,
    errorCount24h: errorCount24h || 0,
    apiCalls24h: apiCalls24h || 0,
    guardrailCounts,
    dbInfo,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'development',
      region: process.env.VERCEL_REGION || 'local',
    },
    features: {
      realtimeEnabled: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      aiEnabled: !!process.env.OPENAI_API_KEY,
      adminEmails: process.env.ADMIN_EMAILS?.split(',').length || 0,
    }
  }
}

export default async function SystemPage() {
  const stats = await getSystemStats()

  const systemHealth = stats.errorCount24h === 0 ? 'healthy' :
                       stats.errorCount24h < 10 ? 'degraded' : 'critical'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">System Management</h1>
        <p className="text-muted-foreground mt-1">
          Database performance, configuration, and maintenance
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {systemHealth === 'healthy' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold text-green-500">Healthy</span>
                </>
              ) : systemHealth === 'degraded' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-semibold text-yellow-500">Degraded</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-lg font-semibold text-red-500">Critical</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.errorCount24h} errors in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              API Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiCalls24h}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Calls in last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connections</span>
                <span>{stats.dbInfo.activeConnections}/{stats.dbInfo.maxConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cache Hit</span>
                <span>{stats.dbInfo.cacheHitRatio}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment & Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Environment & Configuration
          </CardTitle>
          <CardDescription>
            Current deployment configuration and feature flags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Environment</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Node Env:</span>
                  <Badge variant="outline">{stats.environment.nodeEnv}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vercel Env:</span>
                  <Badge variant="outline">{stats.environment.vercelEnv}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Region:</span>
                  <Badge variant="outline">{stats.environment.region}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Features</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Realtime:</span>
                  <Badge variant={stats.features.realtimeEnabled ? "default" : "secondary"}>
                    {stats.features.realtimeEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">AI Assistant:</span>
                  <Badge variant={stats.features.aiEnabled ? "default" : "secondary"}>
                    {stats.features.aiEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Admin Users:</span>
                  <Badge variant="outline">{stats.features.adminEmails}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Database</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Version:</span>
                  <Badge variant="outline">{stats.dbInfo.version}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Avg Query:</span>
                  <Badge variant="outline">{stats.dbInfo.avgQueryTime}ms</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Slow Queries:</span>
                  <Badge variant={stats.dbInfo.slowQueries > 0 ? "destructive" : "secondary"}>
                    {stats.dbInfo.slowQueries}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardrail Activity */}
      {Object.keys(stats.guardrailCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Guardrail Activity (24h)
            </CardTitle>
            <CardDescription>
              Content filtering and abuse prevention actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.guardrailCounts).map(([action, count]) => (
                <div key={action} className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">
                    {action.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Cleanup Monitor */}
      <Suspense fallback={
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      }>
        <CleanupMonitor />
      </Suspense>
    </div>
  )
}