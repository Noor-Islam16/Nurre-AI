"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight } from 'lucide-react'
import type { Assessment, AssessmentResponse } from '@/lib/types/assessment'
import { ASSESSMENT_CONFIG } from '@/lib/types/assessment'

interface HistoryByType {
  [assessmentType: string]: AssessmentResponse[]
}

interface InsightsPanelProps {
  historyByType: HistoryByType
  assessments: Assessment[]
  recommendation: {
    assessment: Assessment | null
    reason: string
  }
  onStartAssessment: (assessment: Assessment) => void
}

interface TimelinePoint {
  date: Date
  score: number
  assessmentType: string
  color: string
}

// Generate 90-day timeline data points
function generateTimelineData(historyByType: HistoryByType): TimelinePoint[] {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const points: TimelinePoint[] = []

  for (const [type, responses] of Object.entries(historyByType)) {
    const config = ASSESSMENT_CONFIG[type as keyof typeof ASSESSMENT_CONFIG]
    if (!config) continue

    for (const response of responses) {
      const date = new Date(response.completed_at)
      if (date >= ninetyDaysAgo && response.scores.total !== undefined) {
        points.push({
          date,
          score: response.scores.total,
          assessmentType: type,
          color: getColorForType(type)
        })
      }
    }
  }

  // Sort by date
  return points.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Get color for assessment type
function getColorForType(type: string): string {
  const colorMap: Record<string, string> = {
    phq9: '#3b82f6',    // blue
    gad7: '#f59e0b',    // amber
    asrs: '#8b5cf6',    // purple
    dass21: '#14b8a6'   // teal
  }
  return colorMap[type] || '#6b7280'
}

// Generate SVG path for timeline
function generateTimelinePath(
  points: TimelinePoint[],
  width: number,
  height: number
): { path: string; dots: Array<{ x: number; y: number; color: string; type: string }> } {
  if (points.length === 0) return { path: '', dots: [] }

  const maxScore = Math.max(...points.map(p => p.score), 27) // Max score for PHQ-9
  const minScore = 0
  const padding = 20

  const dots = points.map((point, index) => {
    const x = padding + ((index / (points.length - 1 || 1)) * (width - 2 * padding))
    const y = height - padding - ((point.score - minScore) / (maxScore - minScore)) * (height - 2 * padding)
    return { x, y, color: point.color, type: point.assessmentType }
  })

  // Generate path connecting dots
  if (dots.length === 1) {
    return { path: '', dots }
  }

  const pathSegments: string[] = []
  for (let i = 0; i < dots.length - 1; i++) {
    const current = dots[i]
    const next = dots[i + 1]

    if (i === 0) {
      pathSegments.push(`M ${current.x} ${current.y}`)
    }
    pathSegments.push(`L ${next.x} ${next.y}`)
  }

  return {
    path: pathSegments.join(' '),
    dots
  }
}

// Generate change bullets
function generateChangeBullets(historyByType: HistoryByType, assessments: Assessment[]): Array<{
  assessmentName: string
  change: 'improved' | 'worsened' | 'stable'
  description: string
}> {
  const bullets: Array<{
    assessmentName: string
    change: 'improved' | 'worsened' | 'stable'
    description: string
  }> = []

  for (const [type, responses] of Object.entries(historyByType)) {
    if (responses.length < 2) continue

    const assessment = assessments.find(a => a.type === type)
    if (!assessment) continue

    // Sort by date (newest first)
    const sorted = [...responses].sort((a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    )

    const latest = sorted[0]
    const previous = sorted[1]

    if (latest.scores.total === undefined || previous.scores.total === undefined) continue

    const scoreDiff = latest.scores.total - previous.scores.total
    const latestLevel = latest.severity_level.replace(/_/g, ' ')
    const previousLevel = previous.severity_level.replace(/_/g, ' ')

    let change: 'improved' | 'worsened' | 'stable' = 'stable'
    let description = ''

    if (scoreDiff < -2) {
      change = 'improved'
      if (latestLevel !== previousLevel) {
        description = `${assessment.name}: Improved from ${previousLevel} to ${latestLevel} (score decreased by ${Math.abs(scoreDiff)})`
      } else {
        description = `${assessment.name}: Score decreased by ${Math.abs(scoreDiff)} points`
      }
    } else if (scoreDiff > 2) {
      change = 'worsened'
      if (latestLevel !== previousLevel) {
        description = `${assessment.name}: Changed from ${previousLevel} to ${latestLevel} (score increased by ${scoreDiff})`
      } else {
        description = `${assessment.name}: Score increased by ${scoreDiff} points`
      }
    } else {
      change = 'stable'
      description = `${assessment.name}: Stable at ${latestLevel}`
    }

    bullets.push({
      assessmentName: assessment.name,
      change,
      description
    })
  }

  // Sort: worsened first, then improved, then stable
  const order = { worsened: 0, improved: 1, stable: 2 }
  bullets.sort((a, b) => order[a.change] - order[b.change])

  // Return max 4 bullets
  return bullets.slice(0, 4)
}

export function InsightsPanel({
  historyByType,
  assessments,
  recommendation,
  onStartAssessment
}: InsightsPanelProps) {
  const timelineData = generateTimelineData(historyByType)
  const changeBullets = generateChangeBullets(historyByType, assessments)

  const hasData = Object.values(historyByType).some(responses => responses.length > 0)

  if (!hasData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No assessment data yet</p>
          <p className="text-sm text-gray-500">
            Complete assessments to see insights and trends over time
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartWidth = 800
  const chartHeight = 240
  const { path, dots } = generateTimelinePath(timelineData, chartWidth, chartHeight)

  return (
    <div className="space-y-6">
      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Trends (Last 90 Days)
          </CardTitle>
          <CardDescription>
            Track how your assessment scores change over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto"
              style={{ minHeight: '240px' }}
            >
              {/* Grid lines */}
              <line x1="20" y1="20" x2="20" y2={chartHeight - 20} stroke="#e5e7eb" strokeWidth="1" />
              <line x1="20" y1={chartHeight - 20} x2={chartWidth - 20} y2={chartHeight - 20} stroke="#e5e7eb" strokeWidth="1" />

              {/* Timeline path */}
              {path && (
                <path
                  d={path}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Data points */}
              {dots.map((dot, index) => (
                <g key={index}>
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r="6"
                    fill={dot.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              ))}

              {/* Axis labels */}
              <text x="10" y="25" fontSize="12" fill="#6b7280">High</text>
              <text x="10" y={chartHeight - 15} fontSize="12" fill="#6b7280">Low</text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {Object.entries(historyByType).map(([type, responses]) => {
              if (responses.length === 0) return null
              const config = ASSESSMENT_CONFIG[type as keyof typeof ASSESSMENT_CONFIG]
              if (!config) return null

              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getColorForType(type) }}
                  />
                  <span className="text-sm text-gray-600">{config.shortName}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Change Bullets & Next Suggestion */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* What Changed */}
        {changeBullets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Changed</CardTitle>
              <CardDescription>Recent changes in your assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {changeBullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {bullet.change === 'improved' && (
                      <TrendingDown className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    {bullet.change === 'worsened' && (
                      <TrendingUp className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    {bullet.change === 'stable' && (
                      <Minus className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-gray-700">{bullet.description}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Next Suggested Assessment */}
        {recommendation.assessment && (
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Next Suggested Assessment
              </CardTitle>
              <CardDescription>Recommended based on your history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {recommendation.assessment.name}
                </h4>
                <p className="text-sm text-gray-600">{recommendation.reason}</p>
              </div>
              <Button
                onClick={() => onStartAssessment(recommendation.assessment!)}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Start Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
