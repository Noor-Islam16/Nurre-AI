'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Brain, RefreshCw, Calendar, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { canRetakeAssessment, getNextAssessmentDate, formatTimeUntilNextAssessment } from '@/lib/assessment/validation'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { PersonalitySelectorCard } from '@/components/profile/personality-selector-card'
import { VoiceSpeedCard } from '@/components/profile/voice-speed-card'
import { UnsavedChangesBanner } from '@/components/profile/unsaved-changes-banner'
import { usePreferenceStore, type VoiceSpeed } from '@/store/preference-store'
import { useUserStore } from '@/store/user-store'
import type { PersonalityId } from '@/lib/config/personalities'

// Helper to get initials from name
const getInitials = (name: string) => {
  if (!name.trim()) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

type ProfileData = {
  name: string
  email: string
  persona: string
  lastAssessment: Date | null
  selectedPersonality: PersonalityId | null
  voiceSpeed: VoiceSpeed
}

export function ProfileInfoTab() {
  const router = useRouter()
  const { preferences, setPreferences, syncToDatabase: syncPreferences } = usePreferenceStore()
  const refreshUserProfile = useUserStore(state => state.refreshProfile)
  const storeProfile = useUserStore(state => state.profile)
  const storeUser = useUserStore(state => state.user)
  const storeInitialized = useUserStore(state => state.isInitialized)

  // Current form state
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    persona: '',
    lastAssessment: null,
    selectedPersonality: null,
    voiceSpeed: 'normal',
  })

  // Original state (from database) for comparison
  const [originalProfile, setOriginalProfile] = useState<ProfileData>({
    name: '',
    email: '',
    persona: '',
    lastAssessment: null,
    selectedPersonality: null,
    voiceSpeed: 'normal',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [nameError, setNameError] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [assessmentStatus, setAssessmentStatus] = useState({
    canRetake: false,
    nextAvailableDate: null as Date | null,
    isLoading: false,
  })

  // Calculate if there are unsaved changes
  const hasUnsavedChanges =
    profile.name !== originalProfile.name ||
    profile.selectedPersonality !== originalProfile.selectedPersonality ||
    profile.voiceSpeed !== originalProfile.voiceSpeed

  // beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Load profile from store (already fetched) or fall back to DB
  useEffect(() => {
    if (!storeInitialized) return // Wait for store to initialize

    if (storeProfile && storeUser) {
      // Use cached store data — no extra DB call needed
      const lastAssessment = storeProfile.last_persona_assessment
        ? new Date(storeProfile.last_persona_assessment)
        : null

      const voiceSpeed = preferences.communication.voiceSpeed || 'normal'

      const profileData: ProfileData = {
        name: storeProfile.name || '',
        email: storeProfile.email || storeUser.email || '',
        persona: storeProfile.adhd_persona || '',
        lastAssessment,
        selectedPersonality: (storeProfile.selected_personality as PersonalityId) || 'nur',
        voiceSpeed,
      }

      setProfile(profileData)
      setOriginalProfile(profileData)

      const canRetake = canRetakeAssessment(lastAssessment)
      const nextDate = getNextAssessmentDate(lastAssessment)
      setAssessmentStatus({ canRetake, nextAvailableDate: nextDate, isLoading: false })
      setIsLoading(false)
    } else {
      // Fallback: store empty, fetch from DB
      loadProfileFromDB()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeInitialized])

  // Sync voice speed from preference store when it loads
  useEffect(() => {
    if (!isLoading && preferences.communication.voiceSpeed) {
      const voiceSpeed = preferences.communication.voiceSpeed
      setProfile(prev => ({ ...prev, voiceSpeed }))
      setOriginalProfile(prev => ({ ...prev, voiceSpeed }))
    }
  }, [preferences.communication.voiceSpeed, isLoading])

  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError('Name is required')
      return false
    }
    if (name.length < 2) {
      setNameError('Name must be at least 2 characters')
      return false
    }
    if (name.length > 50) {
      setNameError('Name must be less than 50 characters')
      return false
    }
    setNameError('')
    return true
  }

  const loadProfileFromDB = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        const lastAssessment = userProfile.last_persona_assessment
          ? new Date(userProfile.last_persona_assessment)
          : null

        const voiceSpeed = preferences.communication.voiceSpeed || 'normal'

        const profileData: ProfileData = {
          name: userProfile.name || '',
          email: userProfile.email,
          persona: userProfile.adhd_persona || '',
          lastAssessment,
          selectedPersonality: (userProfile.selected_personality as PersonalityId) || 'nur',
          voiceSpeed,
        }

        setProfile(profileData)
        setOriginalProfile(profileData)

        const canRetake = canRetakeAssessment(lastAssessment)
        const nextDate = getNextAssessmentDate(lastAssessment)
        setAssessmentStatus({ canRetake, nextAvailableDate: nextDate, isLoading: false })
      }
    }
    setIsLoading(false)
  }

  const handleRetakeAssessment = async () => {
    if (!assessmentStatus.canRetake) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: `You can retake the assessment ${assessmentStatus.nextAvailableDate ?
            `on ${format(assessmentStatus.nextAvailableDate, 'MMMM d, yyyy')}` :
            'soon'}`,
          type: 'info'
        }
      }))
      return
    }

    setShowResetConfirm(true)
  }

  const confirmRetakeAssessment = () => {
    sessionStorage.setItem('assessment-retake', 'true')
    router.push('/signup')
  }

  const handleSave = async () => {
    if (!validateName(profile.name)) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: 'Please fix the errors before saving',
          type: 'error'
        }
      }))
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Save name and personality to users table
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: profile.name,
          selected_personality: profile.selectedPersonality,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }

      // Also sync name with auth metadata
      await supabase.auth.updateUser({
        data: { name: profile.name }
      })

      // Save voice speed to preferences
      setPreferences({
        communication: {
          ...preferences.communication,
          voiceSpeed: profile.voiceSpeed
        }
      })
      await syncPreferences()

      // Refresh the user store so other components get the update
      await refreshUserProfile()

      // Update original profile to match saved state
      setOriginalProfile({ ...profile })

      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: 'Profile saved successfully!',
          type: 'success'
        }
      }))
    } catch (error) {
      console.error('Error saving profile:', error)
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: 'Failed to save profile. Please try again.',
          type: 'error'
        }
      }))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = useCallback(() => {
    setProfile({ ...originalProfile })
    setNameError('')
  }, [originalProfile])

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-4" />
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-40" />
        </div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Confirmation modal for retaking assessment */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResetConfirm(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Retake Assessment?
            </h3>
            <p className="text-gray-600 mb-6">
              This will reset your ADHD persona. Your current settings and progress will be preserved.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowResetConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  confirmRetakeAssessment()
                  setShowResetConfirm(false)
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 pb-24"
      >
        {/* Hero Section - Avatar + Name Display */}
        <div className="text-center py-6">
          {/* Avatar Circle with Initials */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 15 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg"
          >
            <span className="text-3xl font-bold text-white">
              {getInitials(profile.name)}
            </span>
          </motion.div>

          {/* Name + Email Display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              {profile.name || 'Your Name'}
            </h1>
            <p className="text-gray-500">{profile.email}</p>
          </motion.div>
        </div>

        {/* Profile Edit Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="overflow-hidden border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Profile Details</h2>
                  <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName" className="text-sm font-medium text-gray-700">
                  Name
                </Label>
                <Input
                  id="profileName"
                  type="text"
                  value={profile.name}
                  onChange={(e) => {
                    setProfile({ ...profile, name: e.target.value })
                    validateName(e.target.value)
                  }}
                  className={`text-gray-900 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    nameError ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Enter your name"
                />
                {nameError && (
                  <p className="text-sm text-red-500">{nameError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileEmail" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="profileEmail"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400">Email cannot be changed</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ADHD Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Brain className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">ADHD Profile</h2>
                  <p className="text-sm text-gray-500">Your personalized ADHD assessment</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Persona Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current Type</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {profile.persona || 'Not set'}
                  </p>
                </div>
                {profile.lastAssessment && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Last Assessment</p>
                    <p className="text-sm font-medium text-gray-700 flex items-center justify-end gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(profile.lastAssessment, 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  Your ADHD profile helps Nuree AI provide personalized coaching tailored to your specific needs and working style.
                </p>
              </div>

              {/* Retake Button */}
              <Button
                onClick={handleRetakeAssessment}
                disabled={!assessmentStatus.canRetake}
                variant="outline"
                className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake Assessment
              </Button>

              {!assessmentStatus.canRetake && assessmentStatus.nextAvailableDate && (
                <p className="text-sm text-gray-500 text-center">
                  Next available: {format(assessmentStatus.nextAvailableDate, 'MMMM d, yyyy')}
                  <span className="block text-xs text-gray-400 mt-0.5">
                    ({formatTimeUntilNextAssessment(profile.lastAssessment)})
                  </span>
                </p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* AI Coach Selector Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <PersonalitySelectorCard
            currentPersonality={profile.selectedPersonality}
            onPersonalityChange={(personality) => {
              setProfile({ ...profile, selectedPersonality: personality })
            }}
          />
        </motion.div>

        {/* Voice Speed Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <VoiceSpeedCard
            currentSpeed={profile.voiceSpeed}
            onSpeedChange={(speed) => {
              setProfile({ ...profile, voiceSpeed: speed })
            }}
          />
        </motion.div>
      </motion.div>

      {/* Sticky Unsaved Changes Banner */}
      <UnsavedChangesBanner
        show={hasUnsavedChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
        isSaving={isSaving}
      />
    </>
  )
}
