import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/admin/stats-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Brain,
  TrendingUp,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

async function getAssessmentData() {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Get assessment statistics
  const { data: assessmentResponses } = await supabase
    .from('assessment_responses')
    .select('*')
    .gte('completed_at', thirtyDaysAgo.toISOString())
    .order('completed_at', { ascending: false })

  // Get assessment types
  const { data: assessmentTypes } = await supabase
    .from('assessments')
    .select('*')
    .eq('is_active', true)

  // Get onboarding assessment data
  const { data: onboardingResults } = await supabase
    .from('onboarding_results')
    .select('*, users!inner(email, name)')
    .gte('completed_at', thirtyDaysAgo.toISOString())
    .order('completed_at', { ascending: false })
    .limit(20)

  // Calculate statistics
  const stats = {
    totalCompleted: assessmentResponses?.length || 0,
    uniqueUsers: new Set(assessmentResponses?.map(r => r.user_id) || []).size,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    avgCompletionTime: 0,
    completionRate: 0,
  }

  // Count by type and severity
  assessmentResponses?.forEach((response) => {
    stats.byType[response.assessment_type] = (stats.byType[response.assessment_type] || 0) + 1
    if (response.severity_level) {
      stats.bySeverity[response.severity_level] = (stats.bySeverity[response.severity_level] || 0) + 1
    }
  })

  // Calculate average completion time
  const completionTimes = assessmentResponses?.filter(r => r.time_taken).map(r => r.time_taken!) || []
  if (completionTimes.length > 0) {
    stats.avgCompletionTime = Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / 60) // Convert to minutes
  }

  // Onboarding assessment statistics
  const onboardingStats = {
    total: onboardingResults?.length || 0,
    byPresentation: {} as Record<string, number>,
    avgInattSeverity: 0,
    avgHyperSeverity: 0,
  }

  onboardingResults?.forEach((result) => {
    onboardingStats.byPresentation[result.adhd_presentation] =
      (onboardingStats.byPresentation[result.adhd_presentation] || 0) + 1
  })

  if (onboardingResults && onboardingResults.length > 0) {
    onboardingStats.avgInattSeverity = Math.round(
      onboardingResults.reduce((sum, r) => sum + (r.inatt_severity || 0), 0) / onboardingResults.length
    )
    onboardingStats.avgHyperSeverity = Math.round(
      onboardingResults.reduce((sum, r) => sum + (r.hyper_severity || 0), 0) / onboardingResults.length
    )
  }

  return {
    stats,
    onboardingStats,
    assessmentTypes: assessmentTypes || [],
    recentOnboarding: onboardingResults || [],
    recentAssessments: assessmentResponses?.slice(0, 10) || [],
  }
}

export default async function AssessmentsPage() {
  const data = await getAssessmentData()

  const getSeverityColor = (severity: string | null) => {
    if (!severity) return 'secondary'
    switch (severity.toLowerCase()) {
      case 'none':
      case 'negative':
        return 'secondary'
      case 'mild':
      case 'borderline':
        return 'default'
      case 'moderate':
      case 'inattentive':
      case 'hyperactive':
        return 'default'
      case 'severe':
      case 'combined':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Clinical Assessments</h1>
        <p className="text-muted-foreground mt-1">
          Monitor assessment completions and user mental health insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Assessments"
          value={data.stats.totalCompleted + data.onboardingStats.total}
          description="Last 30 days"
          icon={FileText}
        />
        <StatsCard
          title="Unique Users"
          value={data.stats.uniqueUsers}
          description="Completed assessments"
          icon={Users}
        />
        <StatsCard
          title="Avg Completion Time"
          value={`${data.stats.avgCompletionTime}m`}
          description="Standard assessments"
          icon={Clock}
        />
        <StatsCard
          title="Onboarding V2"
          value={data.onboardingStats.total}
          description="DSM-5 assessments"
          icon={Brain}
        />
      </div>

      {/* Assessment Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Available Assessment Types
          </CardTitle>
          <CardDescription>
            Clinical assessments configured in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.assessmentTypes.map((assessment) => (
              <div key={assessment.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{assessment.type.toUpperCase()}</Badge>
                  {assessment.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <h4 className="font-medium text-sm">{assessment.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {assessment.questions?.length || 0} questions
                </p>
                {assessment.time_estimate && (
                  <p className="text-xs text-muted-foreground">
                    ~{assessment.time_estimate} min
                  </p>
                )}
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {data.stats.byType[assessment.type] || 0} completed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DSM-5 Onboarding Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            DSM-5 Onboarding Assessment Results
          </CardTitle>
          <CardDescription>
            Distribution of ADHD presentations from 28-item assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Object.entries(data.onboardingStats.byPresentation).map(([presentation, count]) => (
              <div key={presentation} className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">{presentation}</div>
                <Badge variant={getSeverityColor(presentation)} className="mt-2">
                  {Math.round((count / data.onboardingStats.total) * 100)}%
                </Badge>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Avg Inattention Severity</span>
              </div>
              <div className="text-2xl font-bold">{data.onboardingStats.avgInattSeverity}%</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Avg Hyperactivity Severity</span>
              </div>
              <div className="text-2xl font-bold">{data.onboardingStats.avgHyperSeverity}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      {Object.keys(data.stats.bySeverity).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>
              Assessment results by severity level (standard assessments)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['none', 'mild', 'moderate', 'severe'].map((severity) => {
                const count = data.stats.bySeverity[severity] || 0
                const percentage = data.stats.totalCompleted > 0
                  ? Math.round((count / data.stats.totalCompleted) * 100)
                  : 0

                return (
                  <div key={severity} className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{severity}</div>
                    <Badge variant={getSeverityColor(severity)} className="mt-2">
                      {percentage}%
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Onboarding Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Onboarding Assessments</CardTitle>
          <CardDescription>
            Latest DSM-5 based ADHD assessments completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentOnboarding.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No onboarding assessments completed in the last 30 days
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Presentation</TableHead>
                  <TableHead>Inattention</TableHead>
                  <TableHead>Hyperactivity</TableHead>
                  <TableHead>Total Endorsed</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOnboarding.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div className="text-sm">
                        {result.users.name || result.users.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(result.adhd_presentation)}>
                        {result.adhd_presentation}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {result.inatt_endorsed}/9
                        <span className="text-muted-foreground ml-1">
                          ({result.inatt_severity}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {result.hyper_endorsed}/8
                        <span className="text-muted-foreground ml-1">
                          ({result.hyper_severity}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.total_endorsed}/17</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(result.completed_at), { addSuffix: true })}
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