'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RecommendedList } from '@/components/music/RecommendedList'
import { TrackList } from '@/components/music/TrackList'
import { MusicTrack, useMusicPlayer } from '@/components/music/Player'
import { MusicHero } from '@/components/music/music-hero'
import { CategoryCard } from '@/components/music/category-card'
import { CalmBreathing } from '@/components/features/calm-breathing'
import { BreathingHistory } from '@/components/features/breathing-history'
import { useCalmBreathing } from '@/hooks/useCalmBreathing'
import { Music, Wind, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CategoryKey = 'focus' | 'calm' | 'productivity' | 'sleep'

const CATEGORY_ORDER: Array<{ key: CategoryKey; title: string; emptyMessage: string }> = [
  { key: 'focus', title: 'Focus & Concentration', emptyMessage: 'No focus tracks available yet.' },
  { key: 'calm', title: 'Calm & Emotional Balance', emptyMessage: 'No calm tracks available yet.' },
  { key: 'productivity', title: 'Productivity & Motivation', emptyMessage: 'No productivity tracks available yet.' },
  { key: 'sleep', title: 'Relaxation & Sleep Prep', emptyMessage: 'No sleep tracks available yet.' },
]

type RecommendationResponse = Array<{
  track: MusicTrack
  note: string | null
  createdAt: string
}>

const DEFAULT_CATEGORY_STATE: Record<CategoryKey, MusicTrack[]> = {
  focus: [],
  calm: [],
  productivity: [],
  sleep: [],
}

export default function CalmPage() {
  const [recommended, setRecommended] = React.useState<MusicTrack[]>([])
  const [categoryTracks, setCategoryTracks] = React.useState<Record<CategoryKey, MusicTrack[]>>(DEFAULT_CATEGORY_STATE)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryKey | null>(null)
  const { sessions, isLoadingSessions } = useCalmBreathing()
  const { currentTrack } = useMusicPlayer()

  React.useEffect(() => {
    let canceled = false
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const recommendedRequest = fetch('/api/music/recommendations?userId=me', {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        })

        const categoryRequests = CATEGORY_ORDER.map(({ key }) =>
          fetch(`/api/music/tracks?category=${encodeURIComponent(key)}`, {
            method: 'GET',
            signal: controller.signal,
          })
        )

        const responses = await Promise.all([recommendedRequest, ...categoryRequests])
        const errored = responses.find((res) => !res.ok)
        if (errored) {
          const detail = await errored.text().catch(() => '')
          throw new Error(detail || `Failed to fetch music data (HTTP ${errored.status})`)
        }

        const jsonPayloads = await Promise.all(responses.map((res) => res.json()))
        if (canceled) return

        const [recommendedPayload, ...categoryPayloads] = jsonPayloads

        const recommendedTracks = Array.isArray(recommendedPayload)
          ? (recommendedPayload as RecommendationResponse)
              .map((item) => item?.track)
              .filter((track): track is MusicTrack => Boolean(track && track.id))
          : []

        const categories = { ...DEFAULT_CATEGORY_STATE }
        categoryPayloads.forEach((payload, index) => {
          const key = CATEGORY_ORDER[index]?.key
          if (!key) return
          categories[key] = Array.isArray(payload)
            ? (payload as MusicTrack[]).filter((track): track is MusicTrack => Boolean(track && track.id))
            : []
        })

        setRecommended(recommendedTracks)
        setCategoryTracks(categories)
      } catch (err: any) {
        if (err?.name === 'AbortError' || canceled) return
        console.error('Calm page load error:', err)
        setError('We ran into an issue loading music. Please try again.')
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 md:px-6 lg:px-8 pt-2 pb-8">
      <div className="w-full max-w-[min(90vw,1600px)] mx-auto flex flex-col gap-6 pb-20">
        <Tabs defaultValue="music" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="music" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span>Music</span>
            </TabsTrigger>
            <TabsTrigger value="breathing" className="flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span>Breathing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="music">
            {loading ? (
              <Card className="border-slate-200 bg-white/70">
                <CardContent className="space-y-4 p-6">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-destructive">Couldn&apos;t load the Calm playlist</CardTitle>
                  <CardDescription className="text-sm text-destructive-foreground/80">
                    {error}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Music Hero - Shows when track is selected */}
                <AnimatePresence>
                  {currentTrack && (
                    <MusicHero />
                  )}
                </AnimatePresence>

                {/* Category Browser */}
                {selectedCategory === null ? (
                  <>
                    {/* AI Recommendations */}
                    {recommended.length > 0 && (
                      <RecommendedList tracks={recommended} />
                    )}

                    {/* Category Cards Grid - 2x2 when no player, 4 cols when player visible */}
                    <div className={currentTrack ? "" : "flex flex-col items-center"}>
                      <h2 className={currentTrack ? "text-lg font-semibold text-foreground mb-4" : "text-lg font-semibold text-foreground mb-4 self-start"}>Browse by Category</h2>
                      <div className={currentTrack ? "grid grid-cols-2 md:grid-cols-4 gap-4" : "grid grid-cols-2 gap-6 w-full max-w-4xl"}>
                        {CATEGORY_ORDER.map(({ key, title }) => (
                          <CategoryCard
                            key={key}
                            category={key}
                            title={title.split(' & ')[0]}
                            trackCount={categoryTracks[key].length}
                            isSelected={false}
                            onClick={() => setSelectedCategory(key)}
                            className={currentTrack ? "" : "min-h-[160px] p-6"}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Back to categories button */}
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedCategory(null)}
                      className="w-fit -ml-2 text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      All Categories
                    </Button>

                    {/* Selected category track list */}
                    {CATEGORY_ORDER.filter(c => c.key === selectedCategory).map(({ key, title, emptyMessage }) => (
                      <TrackList
                        key={key}
                        title={title}
                        tracks={categoryTracks[key]}
                        emptyMessage={emptyMessage}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="breathing">
            <div className="space-y-6">
              <CalmBreathing />
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Breathing Journey</h2>
                <BreathingHistory sessions={sessions} isLoading={isLoadingSessions} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
