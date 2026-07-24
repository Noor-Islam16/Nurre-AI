'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'

interface Track {
  id: string
  title: string
  category: string
  hz_label?: string
  producer_name?: string
  brain_modes?: string[]
}

const BRAIN_MODES = ['Reset', 'Start', 'Deep Focus', 'Flow', 'Ground']

export default function AdminTracksPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  
  const { toast } = useToast()

  const fetchTracks = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/music/tracks', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Failed to fetch tracks: ${res.statusText}`)
      }
      const data = await res.json()
      setTracks(data)
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to load tracks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTracks()
  }, [])

  const handleToggleMode = async (trackId: string, mode: string, isChecked: boolean) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const currentModes = track.brain_modes || []
    let newModes: string[]
    if (isChecked) {
      newModes = [...currentModes, mode]
    } else {
      newModes = currentModes.filter(m => m !== mode)
    }

    // Optimistic update
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, brain_modes: newModes } : t))
    setSavingId(trackId)

    try {
      const res = await fetch('/api/music/tracks/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, brainModes: newModes })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save tags')
      }

      toast({
        title: 'Tags updated',
        description: `Successfully updated brain modes for "${track.title}"`,
      })
    } catch (err: any) {
      console.error(err)
      // Rollback
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, brain_modes: currentModes } : t))
      toast({
        title: 'Save failed',
        description: err.message || 'Failed to update tags'
      })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Back to Admin */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Track Tagging Manager</h1>
      </div>

      <Alert>
        <AlertTitle className="font-semibold text-emerald-800">Practical Tag Assignment</AlertTitle>
        <AlertDescription className="text-emerald-700">
          Tag tracks below with their corresponding **Brain Modes**. This allows Nuree Focus Mode to dynamically match user library selections based on their calibrator outcomes, without altering their default Calm categories.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertTitle>Error loading tracks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border border-gray-200 shadow-sm rounded-xl">
        <CardHeader className="border-b pb-4">
          <CardTitle>Music Library Tracks</CardTitle>
          <CardDescription>Tag individual tracks per brain-mode</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center p-12 text-gray-500">
              No tracks found in the library database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b text-gray-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Track Info</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Brain Mode Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700 text-sm">
                  {tracks.map((track) => {
                    const activeModes = track.brain_modes || []
                    return (
                      <tr key={track.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{track.title}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            {track.producer_name && <span>by {track.producer_name}</span>}
                            {track.hz_label && (
                              <>
                                <span>·</span>
                                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                  {track.hz_label}
                                </Badge>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 capitalize">
                          <Badge variant="secondary" className="bg-slate-100 hover:bg-slate-100 text-slate-800">
                            {track.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-4 flex-wrap">
                            {BRAIN_MODES.map((mode) => {
                              const isChecked = activeModes.includes(mode)
                              return (
                                <label
                                  key={mode}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-all ${
                                    isChecked
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold shadow-sm'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      handleToggleMode(track.id, mode, e.target.checked)
                                    }
                                    className="hidden"
                                  />
                                  <span>{mode}</span>
                                  {isChecked && <Check className="w-3.5 h-3.5" />}
                                </label>
                              )
                            })}
                            {savingId === track.id && (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 ml-2" />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
