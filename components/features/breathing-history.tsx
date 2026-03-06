'use client'

import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import { Wind, TrendingDown, TrendingUp, Clock, Repeat, Heart } from 'lucide-react'
import { breathingPatterns } from '@/lib/breathing/patterns'
import { BreathingSession } from '@/hooks/useCalmBreathing'

interface BreathingHistoryProps {
  sessions: BreathingSession[]
  isLoading: boolean
}

export function BreathingHistory({ sessions, isLoading }: BreathingHistoryProps) {
  // Calculate stats
  const totalSessions = sessions.length
  const totalMinutes = Math.floor(
    sessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60
  )

  // Calculate average stress improvement
  const sessionsWithStress = sessions.filter(
    s => s.stress_level_before !== null && s.stress_level_after !== null
  )
  const avgStressImprovement = sessionsWithStress.length > 0
    ? sessionsWithStress.reduce(
        (acc, s) => acc + ((s.stress_level_before || 0) - (s.stress_level_after || 0)),
        0
      ) / sessionsWithStress.length
    : 0

  // Find most used pattern
  const patternCounts = sessions.reduce((acc, s) => {
    acc[s.pattern_id] = (acc[s.pattern_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const mostUsedPatternId = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const mostUsedPattern = mostUsedPatternId ? breathingPatterns[mostUsedPatternId] : null

  const getPatternName = (patternId: string) => {
    return breathingPatterns[patternId]?.name || patternId
  }

  const getStressColor = (level: number) => {
    if (level <= 3) return 'text-green-600 bg-green-50'
    if (level <= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getImprovementColor = (improvement: number) => {
    if (improvement > 0) return 'text-green-600'
    if (improvement < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-600">Loading sessions...</div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Wind className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No breathing sessions yet
        </h3>
        <p className="text-gray-700">
          Complete your first breathing exercise to see your history here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Sessions</span>
            <Repeat className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalSessions}</p>
          <p className="text-sm text-gray-600 mt-1">{totalMinutes} minutes total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Avg. Stress Relief</span>
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <p className={`text-3xl font-bold ${getImprovementColor(avgStressImprovement)}`}>
            {avgStressImprovement > 0 ? '-' : '+'}
            {Math.abs(avgStressImprovement).toFixed(1)}
          </p>
          <p className="text-sm text-gray-600 mt-1">points per session</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Favorite Pattern</span>
            <Heart className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">
            {mostUsedPattern?.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {patternCounts[mostUsedPatternId!] || 0} times used
          </p>
        </motion.div>
      </div>

      {/* Session List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {sessions.map((session, index) => {
            const stressImprovement = session.stress_level_before && session.stress_level_after
              ? session.stress_level_before - session.stress_level_after
              : null

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {getPatternName(session.pattern_id)}
                      </h4>
                      <span className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(session.completed_at), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Repeat className="w-4 h-4" />
                        <span>{session.cycles_completed} cycles</span>
                      </div>
                    </div>

                    {session.stress_level_before !== null && session.stress_level_after !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-gray-600">Stress:</span>
                          <span className={`px-2 py-0.5 rounded ${getStressColor(session.stress_level_before)}`}>
                            {session.stress_level_before}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className={`px-2 py-0.5 rounded ${getStressColor(session.stress_level_after)}`}>
                            {session.stress_level_after}
                          </span>
                        </div>

                        {stressImprovement !== null && stressImprovement !== 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            {stressImprovement > 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 font-medium">
                                  -{stressImprovement}
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 font-medium">
                                  +{Math.abs(stressImprovement)}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-gray-600">
                    {format(new Date(session.completed_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
