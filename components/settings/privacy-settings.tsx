'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Download, 
  Trash2, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Cookie,
  Database,
  Lock,
  FileDown,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { consentManager } from '@/lib/privacy/consent-manager';
import { ConsentPreferences } from '@/types/privacy';
import { useUser } from '@/lib/auth/client';

export function PrivacySettings() {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionStatus, setDeletionStatus] = useState<any>(null);
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>(
    consentManager.getConsent() || consentManager.getDefaultPreferences()
  );
  const { user } = useUser();
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message, type }
    }));
  };

  useEffect(() => {
    // Load current consent preferences
    const currentConsent = consentManager.getConsent();
    if (currentConsent) {
      setConsentPreferences(currentConsent);
    }
    
    // Check deletion status
    checkDeletionStatus();
  }, []);

  const checkDeletionStatus = async () => {
    try {
      const response = await fetch('/api/user/delete-data');
      if (response.ok) {
        const data = await response.json();
        setDeletionStatus(data);
      }
    } catch (error) {
      console.error('Failed to check deletion status:', error);
    }
  };

  const handleConsentChange = async (key: keyof ConsentPreferences, value: boolean) => {
    if (key === 'necessary') return; // Cannot change necessary cookies
    
    const newPreferences = {
      ...consentPreferences,
      [key]: value
    };
    
    setConsentPreferences(newPreferences);
    
    // Update consent in manager and database
    await consentManager.updateConsent(newPreferences, user?.id);
    
    showToast('Your privacy preferences have been saved.');
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/user/export-data');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export data');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nureeai-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Your data has been downloaded successfully.');
    } catch (error) {
      console.error('Export failed:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to export your data. Please try again.',
        'error'
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: deletionReason,
          confirmDeletion: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request deletion');
      }
      
      const data = await response.json();
      
      showToast(data.message, 'info');
      
      setDeleteDialogOpen(false);
      setDeletionReason('');
      checkDeletionStatus();
    } catch (error) {
      console.error('Deletion request failed:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to request data deletion. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel deletion');
      }
      
      const data = await response.json();
      
      showToast(data.message);
      
      checkDeletionStatus();
    } catch (error) {
      console.error('Cancel deletion failed:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to cancel deletion. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

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

      {/* Privacy Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-blue-600" />
            <CardTitle>Privacy Preferences</CardTitle>
          </div>
          <CardDescription>
            Control how we collect and use your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Essential Cookies */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                Essential Services
              </Label>
              <p className="text-xs text-gray-600">
                Required for authentication, security, and core app functionality. Cannot be disabled.
              </p>
            </div>
            <Switch
              checked={consentPreferences.necessary}
              disabled
              className="cursor-not-allowed"
            />
          </div>

          {/* Functional */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                Enhanced Features
              </Label>
              <p className="text-xs text-gray-600">
                Enables AI coaching, personalized recommendations, and adaptive learning based on your ADHD profile.
              </p>
            </div>
            <Switch
              checked={consentPreferences.functional}
              onCheckedChange={(checked) => handleConsentChange('functional', checked)}
            />
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                Analytics & Insights
              </Label>
              <p className="text-xs text-gray-600">
                Helps us understand usage patterns, track productivity metrics, and improve ADHD support features.
              </p>
            </div>
            <Switch
              checked={consentPreferences.analytics}
              onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
            />
          </div>

          {/* Marketing */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                Communications
              </Label>
              <p className="text-xs text-gray-600">
                Receive updates about new features, ADHD resources, and tips for better productivity.
              </p>
            </div>
            <Switch
              checked={consentPreferences.marketing}
              onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <CardTitle>Your Data</CardTitle>
          </div>
          <CardDescription>
            Export or delete your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                Export Your Data
              </h4>
              <p className="text-xs text-gray-600">
                Download a copy of all your data including tasks, focus sessions, conversations, and preferences.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-start justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">
                Delete Your Account
              </h4>
              <p className="text-xs text-red-700">
                Permanently delete your account and all associated data. This action cannot be undone after 30 days.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deletionStatus?.hasDeletionRequest && deletionStatus.request.status === 'scheduled'}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <CardTitle>Data Protection</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Your data is encrypted at rest and in transit</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>We never sell your personal information</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Data is automatically deleted after retention period</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>GDPR and CCPA compliant</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">
              For more information, read our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              Delete Your Account
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              This will schedule your account and all data for permanent deletion in 30 days. 
              You can cancel this request anytime before the scheduled date.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason" className="text-sm text-gray-700">
                Reason for leaving (optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Help us improve by sharing why you're leaving..."
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <Alert className="border-orange-200 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700 text-sm">
                After confirming:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Your account will remain accessible for 30 days</li>
                  <li>You can cancel the deletion anytime within 30 days</li>
                  <li>After 30 days, all data will be permanently deleted</li>
                  <li>This action cannot be reversed after 30 days</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Schedule Deletion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}