'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Timer,
  Shield,
  AlertTriangle,
  Lock,
  Download,
  Upload,
  Trash2,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useDBPreferenceStore } from '@/store/db-preference-store'
import { consentManager } from '@/lib/privacy/consent-manager'
import { ConsentPreferences } from '@/types/privacy'
import { useUser } from '@/lib/auth/client'

export default function SettingsPage() {
  // Focus Timer state (from useDBPreferenceStore)
  const {
    preferences,
    isLoading: prefsLoading,
    fetchPreferences,
    updatePreferences,
    resetToDefaults
  } = useDBPreferenceStore()

  const [localPrefs, setLocalPrefs] = useState(preferences)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Privacy state
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>(
    consentManager.getConsent() || consentManager.getDefaultPreferences()
  )
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [deletionStatus, setDeletionStatus] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const importFileInput = useRef<HTMLInputElement>(null)
  const { user } = useUser()

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences()
    const currentConsent = consentManager.getConsent()
    if (currentConsent) {
      setConsentPreferences(currentConsent)
    }
    checkDeletionStatus()
  }, [])

  useEffect(() => {
    setLocalPrefs(preferences)
  }, [preferences])

  // Track changes
  useEffect(() => {
    if (preferences) {
      const hasPrefsChanges =
        localPrefs?.focus_duration !== preferences.focus_duration ||
        localPrefs?.break_ratio !== preferences.break_ratio
      setHasChanges(hasPrefsChanges)
    }
  }, [localPrefs, preferences])

  const checkDeletionStatus = async () => {
    try {
      const response = await fetch('/api/user/delete-data')
      if (response.ok) {
        const data = await response.json()
        setDeletionStatus(data)
      }
    } catch (error) {
      console.error('Failed to check deletion status:', error)
    }
  }

  const handlePrefsChange = (updates: any) => {
    setLocalPrefs(prev => prev ? { ...prev, ...updates } : null)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!localPrefs || !preferences) return

    setIsSaving(true)
    try {
      const changes: any = {}
      if (localPrefs.focus_duration !== preferences.focus_duration) {
        changes.focus_duration = localPrefs.focus_duration
      }
      if (localPrefs.break_ratio !== preferences.break_ratio) {
        changes.break_ratio = localPrefs.break_ratio
      }

      await updatePreferences(changes)
      setHasChanges(false)
      showToast('Settings saved successfully!')
    } catch (error) {
      showToast('Failed to save settings. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      await resetToDefaults()
      setHasChanges(false)
      showToast('Settings reset to defaults')
    } catch (error) {
      showToast('Failed to reset settings', 'error')
    }
  }

  const handleConsentChange = async (key: keyof ConsentPreferences, value: boolean) => {
    if (key === 'necessary') return

    const newPreferences = {
      ...consentPreferences,
      [key]: value
    }

    setConsentPreferences(newPreferences)
    await consentManager.updateConsent(newPreferences, user?.id)
    showToast('Privacy preferences saved')
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const response = await fetch('/api/user/export-data')

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nureeai-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)

      showToast('Data exported successfully')
    } catch (error) {
      showToast('Failed to export data', 'error')
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportSettings = () => {
    const settings = {
      preferences: consentPreferences,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nureeai-settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)

    showToast('Settings exported successfully')
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        if (settings.preferences) {
          setConsentPreferences(settings.preferences)
          await consentManager.updateConsent(settings.preferences, user?.id)
          showToast('Settings imported successfully')
        }
      } catch (error) {
        showToast('Failed to import settings', 'error')
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deletionReason })
      })

      if (!response.ok) {
        throw new Error('Failed to schedule deletion')
      }

      showToast('Account deletion scheduled. You have 30 days to cancel.', 'info')
      setDeleteDialogOpen(false)
      checkDeletionStatus()
    } catch (error) {
      showToast('Failed to schedule deletion', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCancelDeletion = async () => {
    setDeleteLoading(true)
    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel deletion')
      }

      showToast('Account deletion cancelled')
      checkDeletionStatus()
    } catch (error) {
      showToast('Failed to cancel deletion', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (prefsLoading || !localPrefs) {
    return (
      <div className="min-h-screen">
        <div className="w-full max-w-[min(90vw,1600px)] mx-auto px-4 md:px-6 lg:px-8 pt-2 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
          <div className="space-y-6 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Your Account</DialogTitle>
            <DialogDescription>
              This action will permanently delete your account and all associated data after a 30-day grace period.
              You can cancel the deletion request anytime within those 30 days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why are you leaving? (optional)
              </label>
              <Textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Your feedback helps us improve..."
                className="w-full"
                rows={4}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">
                This action cannot be undone after 30 days. All your data will be permanently deleted.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Processing...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-[min(90vw,1600px)] mx-auto px-4 md:px-6 lg:px-8 pt-2 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Deletion Status Alert */}
          {deletionStatus?.hasDeletionRequest && deletionStatus.request.status === 'scheduled' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-900">Account Deletion Scheduled</p>
                <p className="text-sm text-orange-700 mt-1">
                  Your data is scheduled for permanent deletion on{' '}
                  {new Date(deletionStatus.request.scheduledFor).toLocaleDateString()}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelDeletion}
                  disabled={deleteLoading}
                  className="mt-3 border-orange-300 hover:bg-orange-100"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Deletion Request
                </Button>
              </div>
            </motion.div>
          )}

          {/* Focus Timer Settings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Timer className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Focus Timer</h2>
                    <p className="text-sm text-gray-500">Customize your focus sessions</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Default Focus Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 25, 45, 60].map(duration => (
                      <button
                        key={duration}
                        onClick={() => handlePrefsChange({ focus_duration: duration })}
                        className={`py-2.5 px-3 rounded-lg border-2 transition-all font-medium ${
                          localPrefs?.focus_duration === duration
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {duration}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Break Ratio ({Math.round((localPrefs?.break_ratio || 0.2) * 100)}%)
                  </label>
                  <Slider
                    value={[(localPrefs?.break_ratio || 0.2) * 100]}
                    onValueChange={([value]) => handlePrefsChange({ break_ratio: value / 100 })}
                    min={10}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Take a {Math.round((localPrefs?.break_ratio || 0.2) * (localPrefs?.focus_duration || 25))} minute break after each focus session
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Data Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Data Privacy</h2>
                    <p className="text-sm text-gray-500">Control how your data is used</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
                  <div>
                    <p className="font-medium text-gray-900">Essential Services</p>
                    <p className="text-sm text-gray-500">Required for authentication and core functionality</p>
                  </div>
                  <Switch
                    checked={consentPreferences.necessary}
                    disabled
                    className="cursor-not-allowed opacity-50"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Enhanced Features</p>
                    <p className="text-sm text-gray-500">AI coaching and personalized recommendations</p>
                  </div>
                  <Switch
                    checked={consentPreferences.functional}
                    onCheckedChange={(checked) => handleConsentChange('functional', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Analytics & Insights</p>
                    <p className="text-sm text-gray-500">Help improve the app with anonymous usage data</p>
                  </div>
                  <Switch
                    checked={consentPreferences.analytics}
                    onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Marketing Communications</p>
                    <p className="text-sm text-gray-500">Updates about features and ADHD resources</p>
                  </div>
                  <Switch
                    checked={consentPreferences.marketing}
                    onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Account Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50/50 to-orange-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Account Actions</h2>
                    <p className="text-sm text-gray-500">Manage your account data</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-200 hover:bg-gray-50"
                  onClick={handleExportData}
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <>
                      <Download className="w-4 h-4 mr-2 animate-pulse" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export My Data
                    </>
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-200 hover:bg-gray-50"
                    onClick={handleExportSettings}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Export Settings
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1 border-gray-200 hover:bg-gray-50"
                    onClick={() => importFileInput.current?.click()}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Import Settings
                  </Button>

                  <input
                    ref={importFileInput}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportSettings}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deletionStatus?.hasDeletionRequest && deletionStatus.request.status === 'scheduled'}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>

                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    Account deletion is permanent after 30 days. All your data will be removed.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Data Protection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50/50 to-emerald-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Lock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Data Protection</h2>
                    <p className="text-sm text-gray-500">How we protect your information</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Your data is encrypted at rest and in transit</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">We never sell your personal information</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">GDPR and CCPA compliant</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">30-day deletion grace period</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Save/Reset Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex justify-between items-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalPrefs(preferences)
                    setHasChanges(false)
                  }}
                  disabled={!hasChanges}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {hasChanges && (
              <p className="text-center text-sm text-amber-600 mt-3">
                You have unsaved changes
              </p>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
