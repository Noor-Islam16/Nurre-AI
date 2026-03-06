'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Shield, 
  Download, 
  Trash2, 
  Info, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  Monitor,
  Smartphone,
  Upload,
  FileDown,
  XCircle,
  Cookie,
  Database,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { consentManager } from '@/lib/privacy/consent-manager'
import { ConsentPreferences } from '@/types/privacy'
import { useUser } from '@/lib/auth/client'

export function PrivacySettingsRedesigned() {
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [deletionStatus, setDeletionStatus] = useState<any>(null)
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>(
    consentManager.getConsent() || consentManager.getDefaultPreferences()
  )
  const { user } = useUser()
  const importFileInput = useRef<HTMLInputElement>(null)
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message, type }
    }))
  }

  useEffect(() => {
    const currentConsent = consentManager.getConsent()
    if (currentConsent) {
      setConsentPreferences(currentConsent)
    }
    checkDeletionStatus()
  }, [])

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

  const handleConsentChange = async (key: keyof ConsentPreferences, value: boolean) => {
    if (key === 'necessary') return
    
    const newPreferences = {
      ...consentPreferences,
      [key]: value
    }
    
    setConsentPreferences(newPreferences)
    await consentManager.updateConsent(newPreferences, user?.id)
    showToast('Your privacy preferences have been saved.')
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
      
      showToast('Data exported successfully', 'success')
    } catch (error) {
      showToast('Failed to export data', 'error')
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  const handleCancelDeletion = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel deletion')
      }
      
      showToast('Account deletion cancelled', 'success')
      checkDeletionStatus()
    } catch (error) {
      showToast('Failed to cancel deletion', 'error')
    } finally {
      setLoading(false)
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
    
    showToast('Settings exported successfully', 'success')
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
          showToast('Settings imported successfully', 'success')
        }
      } catch (error) {
        showToast('Failed to import settings', 'error')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Deletion Status Alert */}
      {deletionStatus?.hasDeletionRequest && deletionStatus.request.status === 'scheduled' && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Account Deletion Scheduled</AlertTitle>
          <AlertDescription className="text-orange-700">
            Your data is scheduled for permanent deletion on{' '}
            {new Date(deletionStatus.request.scheduledFor).toLocaleDateString()}.
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDeletion}
                disabled={loading}
                className="border-orange-300 hover:bg-orange-100"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Deletion Request
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Data Privacy */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden hover:shadow-3xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600"></div>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg mr-3">
              <Shield className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent">
                Data Privacy
              </h2>
              <p className="text-sm text-gray-600">Control how your data is used</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
              <div>
                <p className="font-medium text-gray-900">Essential Services</p>
                <p className="text-sm text-gray-600">Required for authentication and core functionality</p>
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
                <p className="text-sm text-gray-600">AI coaching and personalized recommendations</p>
              </div>
              <Switch
                checked={consentPreferences.functional}
                onCheckedChange={(checked) => handleConsentChange('functional', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
              <div>
                <p className="font-medium text-gray-900">Analytics & Insights</p>
                <p className="text-sm text-gray-600">Help improve the app with anonymous usage data</p>
              </div>
              <Switch
                checked={consentPreferences.analytics}
                onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
              <div>
                <p className="font-medium text-gray-900">Marketing Communications</p>
                <p className="text-sm text-gray-600">Updates about features and ADHD resources</p>
              </div>
              <Switch
                checked={consentPreferences.marketing}
                onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Account Actions */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden hover:shadow-3xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg mr-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Account Actions
              </h2>
              <p className="text-sm text-gray-600">Manage your account data</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start border-gray-300 hover:bg-gray-50"
              onClick={handleExportData}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <>
                  <FileDown className="w-4 h-4 mr-2 animate-pulse" />
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
                className="flex-1 border-gray-300 hover:bg-gray-50"
                onClick={handleExportSettings}
              >
                <Upload className="w-4 h-4 mr-2" />
                Export Settings
              </Button>
              
              <Button
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-50"
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
              className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deletionStatus?.hasDeletionRequest && deletionStatus.request.status === 'scheduled'}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <Info className="w-3 h-3 inline mr-1" />
              Account deletion is permanent after 30 days. All your data will be removed.
            </p>
          </div>
        </div>
      </div>
      
      {/* Data Protection Info */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden hover:shadow-3xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-green-500"></div>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg mr-3">
              <Lock className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-green-700 to-blue-600 bg-clip-text text-transparent">
                Data Protection
              </h2>
              <p className="text-sm text-gray-600">How we protect your information</p>
            </div>
          </div>
          
          <div className="space-y-3">
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
        </div>
      </div>
      
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
            
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                This action cannot be undone after 30 days. All your data will be permanently deleted.
              </AlertDescription>
            </Alert>
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
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}