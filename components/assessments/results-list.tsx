"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Share2, FileDown, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Assessment, AssessmentResponse } from '@/lib/types/assessment'
import { ASSESSMENT_CONFIG } from '@/lib/types/assessment'

interface ResultsListItem {
  assessment: Assessment
  lastResponse: AssessmentResponse
  history: AssessmentResponse[]
}

interface ResultsListProps {
  items: ResultsListItem[]
  onShare: (item: ResultsListItem) => void
  onExportPDF: (item: ResultsListItem) => void
  onExportCSV: (item: ResultsListItem) => void
}

// Generate a mini sparkline SVG from scores
function generateSparkline(scores: number[], width: number = 80, height: number = 24): string {
  if (scores.length === 0) return ''
  if (scores.length === 1) {
    // Single point - draw a horizontal line
    return `M 0 ${height / 2} L ${width} ${height / 2}`
  }

  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = max - min || 1 // Avoid division by zero

  const points = scores.map((score, index) => {
    const x = (index / (scores.length - 1)) * width
    const y = height - ((score - min) / range) * (height - 4) - 2 // 2px padding top/bottom
    return `${x},${y}`
  }).join(' ')

  return `M ${points.replace(/,/g, ' ').replace(/ /g, ',').replace(/,([0-9])/g, ' $1')}`
}

// Get severity color for badge
function getSeverityColor(level: string): string {
  const normalized = level.toLowerCase().replace(/_/g, ' ')

  if (normalized.includes('none') || normalized.includes('minimal') || normalized.includes('low')) {
    return 'bg-green-100 text-green-700 border-green-200'
  }
  if (normalized.includes('mild')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }
  if (normalized.includes('moderate')) {
    return 'bg-orange-100 text-orange-700 border-orange-200'
  }
  if (normalized.includes('severe')) {
    return 'bg-red-100 text-red-700 border-red-200'
  }

  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function ResultsList({ items, onShare, onExportPDF, onExportCSV }: ResultsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No assessment results yet</p>
        <p className="text-sm mt-2">Complete an assessment to see your results here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const config = ASSESSMENT_CONFIG[item.assessment.type]
        const scores = item.history.map(r => r.scores.total || 0).slice(0, 10).reverse()
        const sparklinePath = generateSparkline(scores)

        return (
          <div
            key={item.lastResponse.id}
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {/* Left: Name + Interpretation */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {item.assessment.name}
                </h3>
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', getSeverityColor(item.lastResponse.severity_level))}
                >
                  {item.lastResponse.severity_level.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Score: {item.lastResponse.scores.total !== undefined ? item.lastResponse.scores.total : 'N/A'}
              </p>
            </div>

            {/* Center: Mini Sparkline */}
            {scores.length > 1 && (
              <div className="hidden sm:block">
                <svg width="80" height="24" className="text-blue-500">
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Last {scores.length} results
                </p>
              </div>
            )}

            {/* Right: Date + Actions */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(item.lastResponse.completed_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(item.lastResponse.completed_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare(item)}
                  className="h-8 w-8 p-0"
                  title="Share with GP"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExportPDF(item)}
                  className="h-8 w-8 p-0"
                  title="Export as PDF"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExportCSV(item)}
                  className="h-8 w-8 p-0"
                  title="Export as CSV"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
