'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AssessmentMiniCard } from '@/components/assessments/assessment-mini-card'
import { AssessmentDetailsModal } from '@/components/assessments/assessment-details-modal'
import { StartHereStrip } from '@/components/assessments/start-here-strip'
import { FilterBar, type DomainFilter, type SortOption } from '@/components/assessments/filter-bar'
import { ConsentModal } from '@/components/assessments/consent-modal'
import { CrisisHelpLink } from '@/components/assessments/crisis-help-link'
import { ResultsList } from '@/components/assessments/results-list'
import { InsightsPanel } from '@/components/assessments/insights-panel'
import { exportAsCSV, exportAsPDF, shareWithGP } from '@/lib/utils/assessment-export'
import { useAssessmentStore } from '@/store/assessment-store'
import { useMoodStore } from '@/store/mood-store'
import { createClient } from '@/lib/supabase/client'
import {
  Brain,
  TrendingUp,
  Clock,
  FileText,
  AlertCircle,
  BarChart3,
  Calendar
} from 'lucide-react'
import { AssessmentService } from '@/lib/services/assessment-service'
import type { AssessmentResponse, Assessment } from '@/lib/types/assessment'
import { ASSESSMENT_CONFIG } from '@/lib/types/assessment'

export function AssessmentsPageComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const assessmentService = new AssessmentService()

  const {
    assessments,
    loadingAssessments,
    assessmentHistory,
    startAssessment,
    fetchAssessments,
    fetchUserHistory
  } = useAssessmentStore()

  const { recentMoods, fetchRecentMoods } = useMoodStore()

  const [user, setUser] = useState<any>(null)
  const [lastResponses, setLastResponses] = useState<Map<string, AssessmentResponse>>(new Map())
  const [recommended, setRecommended] = useState<Assessment | null>(null)
  const [recommendationReason, setRecommendationReason] = useState<string>('')
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // Consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [pendingAssessment, setPendingAssessment] = useState<Assessment | null>(null)

  // Filter and sort state
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOption, setSortOption] = useState<SortOption>('recommended')

  const [showCrisisModal, setShowCrisisModal] = useState(false)

  useEffect(() => {
    loadData()

    // Check if we should show crisis modal from query param
    const shouldShowCrisis = searchParams.get('showCrisis') === 'true'
    if (shouldShowCrisis) {
      setShowCrisisModal(true)
      // Clean up the URL by removing the query param
      router.replace('/assessments')
    }
  }, [])

  const loadData = async () => {
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // Fetch assessments and history
    await fetchAssessments()
    await fetchUserHistory(user.id)

    // Get last response for each assessment type
    const responses = new Map<string, AssessmentResponse>()
    for (const assessment of assessments) {
      const lastResponse = await assessmentService.getLastAssessment(user.id, assessment.type)
      if (lastResponse) {
        responses.set(assessment.type, lastResponse)
      }
    }
    setLastResponses(responses)

    // Optionally fetch recent moods for recommendation
    try {
      await fetchRecentMoods()
    } catch (error) {
      console.error('Failed to fetch moods:', error)
    }
  }

  // Compute recommendation when data is loaded
  useEffect(() => {
    if (assessments.length === 0 || !user) return

    computeRecommendation()
  }, [assessments, lastResponses, assessmentHistory, recentMoods])

  const computeRecommendation = () => {
    // If no history at all, recommend ASRS
    if (assessmentHistory.length === 0) {
      const asrs = assessments.find(a => a.type === 'asrs')
      if (asrs) {
        setRecommended(asrs)
        setRecommendationReason("You haven't done this quick ADHD screener yet. It's a great starting point to understand your symptoms.")
        return
      }
    }

    // Check for assessments that haven't been taken at all
    const neverTaken = assessments.find(a => !lastResponses.has(a.type))
    if (neverTaken) {
      setRecommended(neverTaken)
      setRecommendationReason(`You haven't taken the ${neverTaken.name} yet. It provides valuable insights into your ${ASSESSMENT_CONFIG[neverTaken.type].category === 'adhd' ? 'ADHD symptoms' : 'mental health'}.`)
      return
    }

    // Check mood signals for recommendations
    if (recentMoods.length > 0) {
      const recentMood = recentMoods[0]

      // Low mood → recommend PHQ-9
      if ((recentMood.mood === 'terrible' || recentMood.mood === 'bad')) {
        const phq9 = assessments.find(a => a.type === 'phq9')
        const lastPhq9 = lastResponses.get('phq9')

        if (phq9 && lastPhq9) {
          const daysSince = Math.floor(
            (Date.now() - new Date(lastPhq9.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysSince >= 14) {
            setRecommended(phq9)
            setRecommendationReason("Your recent mood indicates you might benefit from checking in on depression symptoms.")
            return
          }
        }
      }

      // Low focus/energy → recommend ASRS (if eligible)
      if ((recentMood.focus && recentMood.focus <= 4) || (recentMood.energy && recentMood.energy <= 4)) {
        const asrs = assessments.find(a => a.type === 'asrs')
        const lastAsrs = lastResponses.get('asrs')

        if (asrs && lastAsrs) {
          const daysSince = Math.floor(
            (Date.now() - new Date(lastAsrs.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysSince >= 30) {
            setRecommended(asrs)
            setRecommendationReason("Your recent low focus or energy suggests it may be time to check your ADHD symptoms again.")
            return
          }
        }
      }

      // Check mood notes for anxiety mentions
      if (recentMood.note && /anxiet|anxious|worried|panic/i.test(recentMood.note)) {
        const gad7 = assessments.find(a => a.type === 'gad7')
        const lastGad7 = lastResponses.get('gad7')

        if (gad7 && lastGad7) {
          const daysSince = Math.floor(
            (Date.now() - new Date(lastGad7.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysSince >= 14) {
            setRecommended(gad7)
            setRecommendationReason("Your recent mood note mentions anxiety. This screening can help track those symptoms.")
            return
          }
        }
      }
    }

    // Find assessments eligible for retake (14+ days for most, 30+ for ASRS)
    const eligibleAssessments: Array<{ assessment: Assessment; daysSince: number }> = []

    for (const assessment of assessments) {
      const lastResponse = lastResponses.get(assessment.type)
      if (lastResponse) {
        const daysSince = Math.floor(
          (Date.now() - new Date(lastResponse.completed_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        const config = ASSESSMENT_CONFIG[assessment.type]

        if (daysSince >= config.retakeInterval) {
          eligibleAssessments.push({ assessment, daysSince })
        }
      }
    }

    // If multiple eligible, choose the shortest duration
    if (eligibleAssessments.length > 0) {
      eligibleAssessments.sort((a, b) => a.assessment.time_estimate - b.assessment.time_estimate)
      const chosen = eligibleAssessments[0]
      setRecommended(chosen.assessment)
      setRecommendationReason(`It's been ${chosen.daysSince} days since your last ${chosen.assessment.name}. Regular tracking helps monitor your progress.`)
      return
    }

    // No recommendations available
    setRecommended(null)
    setRecommendationReason('')
  }

  const handleStartAssessment = (assessment: Assessment) => {
    // Check if user has given consent
    const hasConsent = localStorage.getItem('assessments-consent') === 'true'

    if (!hasConsent) {
      // Show consent modal
      setPendingAssessment(assessment)
      setShowConsentModal(true)
    } else {
      // Proceed directly to assessment
      startAssessment(assessment)
    }
  }

  const handleConsentAccept = () => {
    setShowConsentModal(false)

    // Start the pending assessment
    if (pendingAssessment) {
      startAssessment(pendingAssessment)
      setPendingAssessment(null)
    }
  }

  const handleDetailsClick = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setIsDetailsModalOpen(true)
  }

  const checkHasResume = (assessmentType: string): boolean => {
    if (!user) return false
    try {
      const progressKey = `assessment-progress:${user.id}:${assessmentType}`
      return localStorage.getItem(progressKey) !== null
    } catch (error) {
      console.error('Error checking resume state:', error)
      return false
    }
  }

  // Filter and sort assessments
  const getFilteredAndSortedAssessments = (): Assessment[] => {
    let filtered = [...assessments]

    // Domain filter
    if (domainFilter !== 'all') {
      filtered = filtered.filter((assessment) => {
        const config = ASSESSMENT_CONFIG[assessment.type]

        switch (domainFilter) {
          case 'attention':
            return config.category === 'adhd'
          case 'mood':
            return assessment.type === 'phq9'
          case 'anxiety':
            return assessment.type === 'gad7'
          case 'stress':
            return assessment.type === 'dass21'
          default:
            return true
        }
      })
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((assessment) => {
        const config = ASSESSMENT_CONFIG[assessment.type]
        const searchableText = [
          assessment.name,
          config.shortName,
          config.displayName,
          assessment.description,
          assessment.type,
        ].join(' ').toLowerCase()

        return searchableText.includes(query)
      })
    }

    // Sort
    const sortedAssessments = [...filtered]

    switch (sortOption) {
      case 'recommended':
        // Put recommended first, then sort by retake eligibility
        sortedAssessments.sort((a, b) => {
          if (recommended?.id === a.id) return -1
          if (recommended?.id === b.id) return 1

          // Sort by retake eligibility (older last taken = higher priority)
          const aLastResponse = lastResponses.get(a.type)
          const bLastResponse = lastResponses.get(b.type)

          if (!aLastResponse && bLastResponse) return -1
          if (aLastResponse && !bLastResponse) return 1
          if (!aLastResponse && !bLastResponse) return 0

          const aDays = Math.floor(
            (Date.now() - new Date(aLastResponse!.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          const bDays = Math.floor(
            (Date.now() - new Date(bLastResponse!.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          return bDays - aDays // More days since last taken = higher priority
        })
        break

      case 'shortest':
        sortedAssessments.sort((a, b) => a.time_estimate - b.time_estimate)
        break

      case 'most_used':
        // Sort by completion count (most completed first)
        sortedAssessments.sort((a, b) => {
          const aCount = assessmentHistory.filter(h => h.assessment_type === a.type).length
          const bCount = assessmentHistory.filter(h => h.assessment_type === b.type).length
          return bCount - aCount
        })
        break

      case 'a_to_z':
        sortedAssessments.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return sortedAssessments
  }

  const filteredAssessments = getFilteredAndSortedAssessments()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div>
      {/* Info Alert with Crisis Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex items-center justify-between gap-4"
      >
        <Alert className="border-blue-200 bg-blue-50 py-2 flex-1">
          <AlertCircle className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-blue-800 text-xs leading-tight">
            NHS-approved screening tools. Results can be shared with your GP for referrals.
          </AlertDescription>
        </Alert>
        <CrisisHelpLink defaultOpen={showCrisisModal} />
      </motion.div>

      {/* Start Here Recommendation Strip */}
      {recommended && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StartHereStrip
            recommended={recommended}
            onStart={handleStartAssessment}
            reason={recommendationReason}
          />
        </motion.div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available Tests</TabsTrigger>
          <TabsTrigger value="history">My Results</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Available Assessments Tab */}
        <TabsContent value="available">
          {/* Filter Bar */}
          <FilterBar
            domain={domainFilter}
            onDomainChange={setDomainFilter}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            sort={sortOption}
            onSortChange={setSortOption}
          />

          {/* Assessment Cards Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 items-stretch"
          >
            {loadingAssessments ? (
              <div className="col-span-2 text-center py-12">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="text-gray-600">Loading assessments...</span>
                </div>
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  {assessments.length === 0
                    ? 'No assessments available yet'
                    : 'No assessments match your filters'}
                </p>
                {assessments.length > 0 && (
                  <button
                    onClick={() => {
                      setDomainFilter('all')
                      setSearchQuery('')
                    }}
                    className="mt-2 text-sm text-violet-600 hover:text-violet-700 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredAssessments.map((assessment) => {
                const lastResponse = lastResponses.get(assessment.type)
                const lastTaken = lastResponse ? new Date(lastResponse.completed_at) : undefined
                const hasResume = checkHasResume(assessment.type)

                return (
                  <motion.div key={assessment.id} variants={item} className="h-full">
                    <AssessmentMiniCard
                      assessment={assessment}
                      lastTaken={lastTaken}
                      hasResume={hasResume}
                      onStart={() => handleStartAssessment(assessment)}
                      onDetails={() => handleDetailsClick(assessment)}
                    />
                  </motion.div>
                )
              })
            )}
          </motion.div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {assessmentHistory.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No assessment history yet</p>
                <p className="text-sm text-gray-500">
                  Complete your first assessment to start tracking your progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <ResultsList
              items={(() => {
                // Group assessment history by type
                const grouped = new Map<string, AssessmentResponse[]>()

                for (const response of assessmentHistory) {
                  const assessment = assessments.find(a => a.id === response.assessment_id)
                  if (!assessment) continue

                  if (!grouped.has(assessment.type)) {
                    grouped.set(assessment.type, [])
                  }
                  grouped.get(assessment.type)!.push(response)
                }

                // Build ResultsListItem array
                const items: Array<{
                  assessment: Assessment
                  lastResponse: AssessmentResponse
                  history: AssessmentResponse[]
                }> = []

                for (const [type, responses] of grouped.entries()) {
                  const assessment = assessments.find(a => a.type === type)
                  if (!assessment) continue

                  // Sort responses by date (newest first)
                  const sortedResponses = responses.sort((a, b) =>
                    new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
                  )

                  items.push({
                    assessment,
                    lastResponse: sortedResponses[0],
                    history: sortedResponses
                  })
                }

                // Sort items by most recent completion date
                return items.sort((a, b) =>
                  new Date(b.lastResponse.completed_at).getTime() -
                  new Date(a.lastResponse.completed_at).getTime()
                )
              })()}
              onShare={(item) => shareWithGP({
                assessment: item.assessment,
                lastResponse: item.lastResponse,
                history: item.history
              })}
              onExportPDF={(item) => exportAsPDF({
                assessment: item.assessment,
                lastResponse: item.lastResponse,
                history: item.history
              })}
              onExportCSV={(item) => exportAsCSV({
                assessment: item.assessment,
                lastResponse: item.lastResponse,
                history: item.history
              })}
            />
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <InsightsPanel
            historyByType={(() => {
              // Group assessment history by type
              const grouped: Record<string, typeof assessmentHistory> = {}

              for (const response of assessmentHistory) {
                const assessment = assessments.find(a => a.id === response.assessment_id)
                if (!assessment) continue

                if (!grouped[assessment.type]) {
                  grouped[assessment.type] = []
                }
                grouped[assessment.type].push(response)
              }

              return grouped
            })()}
            assessments={assessments}
            recommendation={{
              assessment: recommended,
              reason: recommendationReason
            }}
            onStartAssessment={handleStartAssessment}
          />
        </TabsContent>
      </Tabs>

      {/* Assessment Details Modal */}
      <AssessmentDetailsModal
        assessment={selectedAssessment}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />

      {/* Consent Modal */}
      <ConsentModal
        open={showConsentModal}
        onAccept={handleConsentAccept}
      />
    </div>
  )
}
