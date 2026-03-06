'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TimelineData {
  date: string // ISO date string or formatted date
  points: number
}

interface UnlockData {
  date: string // ISO date string or formatted date
  title: string
  rarity: string
}

interface RecentProgressProps {
  timeline: TimelineData[]
  unlocks: UnlockData[]
}

// Format date as "DD Mon" (e.g., "15 Jan")
function formatDateShort(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = date.toLocaleString('en-US', { month: 'short' })
    return `${day} ${month}`
  } catch {
    return dateStr
  }
}

// Get rarity color for text
function getRarityColor(rarity: string): string {
  const rarityLower = rarity.toLowerCase()
  if (rarityLower.includes('legendary')) return 'text-amber-600'
  if (rarityLower.includes('epic')) return 'text-purple-600'
  if (rarityLower.includes('rare')) return 'text-blue-600'
  return 'text-gray-600'
}

export function RecentProgress({ timeline, unlocks }: RecentProgressProps) {
  // Prepare timeline data (last 30 days)
  const timelineData = timeline.slice(-30)
  const maxPoints = Math.max(...timelineData.map(d => d.points), 1)

  // Prepare unlocks data (last 5)
  const recentUnlocks = unlocks.slice(-5).reverse()

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Progress</h2>

        {/* 30-day timeline */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Last 30 Days</h3>
          <div className="relative h-24 bg-gray-50 rounded-lg p-3">
            {timelineData.length > 0 ? (
              <svg
                className="w-full h-full"
                viewBox="0 0 300 60"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                <line
                  x1="0"
                  y1="60"
                  x2="300"
                  y2="60"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="30"
                  x2="300"
                  y2="30"
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />

                {/* Bars */}
                {timelineData.map((data, index) => {
                  const x = (index / Math.max(timelineData.length - 1, 1)) * 300
                  const barWidth = 300 / timelineData.length * 0.8
                  const barHeight = (data.points / maxPoints) * 55
                  const y = 60 - barHeight

                  return (
                    <g key={index}>
                      <rect
                        x={x - barWidth / 2}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="#10b981"
                        opacity="0.7"
                        rx="1"
                      >
                        <title suppressHydrationWarning>
                          {formatDateShort(data.date)}: {data.points} points
                        </title>
                      </rect>
                    </g>
                  )
                })}

                {/* Line connecting tops of bars */}
                <polyline
                  points={timelineData
                    .map((data, index) => {
                      const x = (index / Math.max(timelineData.length - 1, 1)) * 300
                      const y = 60 - (data.points / maxPoints) * 55
                      return `${x},${y}`
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  opacity="0.5"
                />
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">No activity data yet</p>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span suppressHydrationWarning>
              {timelineData.length > 0 ? formatDateShort(timelineData[0].date) : '—'}
            </span>
            <span suppressHydrationWarning>
              {timelineData.length > 0
                ? formatDateShort(timelineData[timelineData.length - 1].date)
                : '—'}
            </span>
          </div>
        </div>

        {/* Recent unlocks */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Unlocks</h3>
          {recentUnlocks.length > 0 ? (
            <div className="space-y-2">
              {recentUnlocks.map((unlock, index) => (
                <div
                  key={index}
                  className="flex items-center text-sm text-gray-600 py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0" suppressHydrationWarning>
                    {formatDateShort(unlock.date)}
                  </span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="flex-1 text-gray-900 truncate">{unlock.title}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className={cn('text-xs font-medium', getRarityColor(unlock.rarity))}>
                    {unlock.rarity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">
              No achievements unlocked yet
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
