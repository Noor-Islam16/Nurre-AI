'use client'

import React, { useState, useEffect } from 'react'
import { useDBPreferenceStore } from '@/store/db-preference-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Clock, Moon, Brain, Bell, Palette, ClipboardList, Timer, Keyboard, Save, RotateCcw } from 'lucide-react'

const DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' }
]

export function PreferencesPanel() {
  const { 
    preferences, 
    isLoading, 
    fetchPreferences, 
    updatePreferences,
    resetToDefaults 
  } = useDBPreferenceStore()
  
  const [localPrefs, setLocalPrefs] = useState(preferences)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Additional local settings not in DB
  const [localSettings, setLocalSettings] = useState({
    auto_break_tasks: false,
    default_task_duration: 30,
    auto_start_breaks: false
  })
  
  useEffect(() => {
    fetchPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  useEffect(() => {
    setLocalPrefs(preferences)
  }, [preferences])
  
  const handleChange = (updates: any) => {
    setLocalPrefs(prev => prev ? { ...prev, ...updates } : null)
    setHasChanges(true)
  }
  
  const handleSave = async () => {
    if (!localPrefs || !preferences) return
    
    setIsSaving(true)
    try {
      // Only send changed fields
      const changes: any = {}
      Object.keys(localPrefs).forEach(key => {
        if (JSON.stringify(localPrefs[key as keyof typeof localPrefs]) !== 
            JSON.stringify(preferences[key as keyof typeof preferences])) {
          changes[key] = localPrefs[key as keyof typeof localPrefs]
        }
      })
      
      await updatePreferences(changes)
      setHasChanges(false)
      toast({
        title: 'Preferences saved',
        description: 'Your preferences have been updated successfully.'
      })
    } catch (error) {
      toast({
        title: 'Error saving preferences',
        description: 'Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleReset = async () => {
    try {
      await resetToDefaults()
      setHasChanges(false)
      toast({
        title: 'Preferences reset',
        description: 'Your preferences have been reset to defaults.'
      })
    } catch (error) {
      toast({
        title: 'Error resetting preferences',
        description: 'Please try again later.',
        variant: 'destructive'
      })
    }
  }
  
  if (isLoading || !localPrefs) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-700">Loading preferences...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* Task Preferences */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Task Preferences
            </h2>
            <p className="text-sm text-gray-600">How you like to manage your tasks</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
              <div>
                <p className="font-medium text-gray-900">Auto-break large tasks</p>
                <p className="text-sm text-gray-600">Automatically split tasks over 2 hours</p>
              </div>
              <Switch 
                checked={localSettings.auto_break_tasks}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, auto_break_tasks: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
              <div>
                <p className="font-medium text-gray-900">Default task duration</p>
                <p className="text-sm text-gray-600">Estimated time for new tasks</p>
              </div>
              <select 
                className="px-3 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-all text-gray-900"
                value={localSettings.default_task_duration}
                onChange={(e) => setLocalSettings({ ...localSettings, default_task_duration: Number(e.target.value) })}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Focus Timer Settings */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Timer className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Focus Timer Settings
            </h2>
            <p className="text-sm text-gray-600">Customize your focus sessions</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Focus Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 45, 60].map(duration => (
                  <button
                    key={duration}
                    onClick={() => handleChange({ focus_duration: duration })}
                    className={`py-2 px-3 rounded-lg border-2 transition-all ${
                      localPrefs?.focus_duration === duration
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {duration}m
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
              <div>
                <p className="font-medium text-gray-900">Auto-start breaks</p>
                <p className="text-sm text-gray-600">Start break timer after focus session</p>
              </div>
              <Switch 
                checked={localSettings.auto_start_breaks}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, auto_start_breaks: checked })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Break Ratio ({Math.round((localPrefs?.break_ratio || 0.2) * 100)}%)
              </label>
              <Slider
                value={[(localPrefs?.break_ratio || 0.2) * 100]}
                onValueChange={([value]) => handleChange({ break_ratio: value / 100 })}
                min={10}
                max={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Take a {Math.round((localPrefs?.break_ratio || 0.2) * (localPrefs?.focus_duration || 25))} minute break after each focus session
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Moon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Quiet Hours
            </h2>
            <p className="text-sm text-gray-600">Set times when you don&apos;t want to receive AI interventions</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={localPrefs?.quiet_hours?.start || '22:00'}
                  className="text-gray-900 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onChange={(e) => handleChange({
                    quiet_hours: { ...(localPrefs?.quiet_hours || {}), start: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={localPrefs?.quiet_hours?.end || '07:00'}
                  onChange={(e) => handleChange({
                    quiet_hours: { ...(localPrefs?.quiet_hours || {}), end: e.target.value }
                  })}
                  className="text-gray-900 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <Label>Active Days</Label>
              <div className="flex gap-2 mt-2">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => {
                      const currentDays = localPrefs?.quiet_hours?.days || []
                      const days = currentDays.includes(day.value as any)
                        ? currentDays.filter(d => d !== day.value)
                        : [...currentDays, day.value as any]
                      handleChange({
                        quiet_hours: { ...(localPrefs?.quiet_hours || {}), days }
                      })
                    }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      (localPrefs?.quiet_hours?.days || []).includes(day.value as any)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Keyboard className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Keyboard Shortcuts
            </h2>
            <p className="text-sm text-gray-600">Quick actions for power users</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6">
          
          <div className="space-y-2">
            {[
              { keys: ['⌘', 'K'], action: 'Open command menu' },
              { keys: ['⌘', 'S'], action: 'Save settings' },
              { keys: ['⌘', '/'], action: 'Toggle AI assistant' },
              { keys: ['Space'], action: 'Start/pause timer' },
              { keys: ['Esc'], action: 'Close dialogs' },
            ].map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50/50 rounded-lg transition-colors">
                <span className="text-gray-700">{shortcut.action}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <span className="text-gray-400">+</span>}
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
                        {key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Remove old Card components */}
      {false && (
        <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Focus Settings
          </CardTitle>
          <CardDescription>
            Customize your focus session preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="focus-duration">
              Default Focus Duration: {localPrefs?.focus_duration || 25} minutes
            </Label>
            <Slider
              id="focus-duration"
              min={5}
              max={90}
              step={5}
              value={[localPrefs?.focus_duration || 25]}
              onValueChange={([value]) => handleChange({ focus_duration: value })}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="break-ratio">
              Break Ratio: {Math.round((localPrefs?.break_ratio || 0.2) * 100)}%
            </Label>
            <Slider
              id="break-ratio"
              min={10}
              max={50}
              step={5}
              value={[(localPrefs?.break_ratio || 0.2) * 100]}
              onValueChange={([value]) => handleChange({ break_ratio: value / 100 })}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Assistant Settings
          </CardTitle>
          <CardDescription>
            Configure how the AI assistant interacts with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ai-personality">AI Personality</Label>
            <Select
              value={localPrefs?.ai_personality || 'balanced'}
              onValueChange={(value) => handleChange({ ai_personality: value })}
            >
              <SelectTrigger id="ai-personality" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="supportive">Supportive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="intervention-cooldown">
              Intervention Cooldown: {localPrefs?.intervention_cooldown || 30} minutes
            </Label>
            <Slider
              id="intervention-cooldown"
              min={5}
              max={60}
              step={5}
              value={[localPrefs?.intervention_cooldown || 30]}
              onValueChange={([value]) => handleChange({ intervention_cooldown: value })}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="max-interventions">
              Max Interventions Per Hour: {localPrefs?.max_interventions_per_hour || 3}
            </Label>
            <Slider
              id="max-interventions"
              min={1}
              max={20}
              step={1}
              value={[localPrefs?.max_interventions_per_hour || 3]}
              onValueChange={([value]) => handleChange({ max_interventions_per_hour: value })}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the app&apos;s appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={localPrefs?.theme || 'light'}
              onValueChange={(value) => handleChange({ theme: value })}
            >
              <SelectTrigger id="theme" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto (System)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="cursor-pointer">
              Enable notifications
            </Label>
            <Switch
              id="notifications"
              checked={localPrefs?.notifications || false}
              onCheckedChange={(checked) => handleChange({ notifications: checked })}
            />
          </div>
        </CardContent>
      </Card>
        </>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
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
    </div>
  )
}