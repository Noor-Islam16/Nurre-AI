'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  usePreferenceStore,
  preferencePresets,
  voiceSpeedToRate,
  type AutomationPreferences,
  type InterventionPreferences,
  type CommunicationPreferences,
  type ToolPermissions,
  type QuickMode,
  type ADHDProfile,
  type VoiceSpeed
} from '@/store/preference-store'
import { 
  Settings,
  Shield,
  Zap,
  MessageSquare,
  Clock,
  Brain,
  Download,
  Upload,
  RotateCcw,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Moon,
  Volume2,
  VolumeX,
  Sparkles,
  Power,
  Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AIPreferencesPanel() {
  const {
    preferences,
    setPreferences,
    setAutomationLevel,
    setToolPermission,
    setInterventionFrequency,
    setQuickMode,
    setADHDProfile,
    applyPreset,
    resetToDefaults,
    exportPreferences,
    importPreferences
  } = usePreferenceStore()

  const [activeTab, setActiveTab] = useState<'automation' | 'tools' | 'intervention' | 'communication' | 'privacy'>('automation')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importData, setImportData] = useState('')
  const [aiBrainStatus, setAIBrainStatus] = useState<'auto' | 'on' | 'off'>('auto')
  const [lastActivity, setLastActivity] = useState<string | null>(null)
  const [isUpdatingBrain, setIsUpdatingBrain] = useState(false)
  const router = useRouter()

  // Automation level descriptions
  const automationLevels: Record<AutomationPreferences['level'], { label: string; description: string }> = {
    minimal: { label: 'Minimal', description: 'AI only responds when asked' },
    balanced: { label: 'Balanced', description: 'AI suggests actions (default)' },
    proactive: { label: 'Proactive', description: 'AI takes approved actions' },
    maximum: { label: 'Maximum', description: 'AI fully autonomous' }
  }

  // Intervention frequency descriptions
  const interventionFrequencies: Record<InterventionPreferences['frequency'], string> = {
    rare: 'Once per hour',
    occasional: 'Every 30 minutes',
    regular: 'Every 15 minutes',
    frequent: 'Every 5 minutes'
  }

  // Quick modes
  const quickModes: Record<QuickMode, { label: string; icon: any; description: string }> = {
    active: { label: 'Active', icon: Zap, description: 'Full features' },
    quiet: { label: 'Quiet', icon: VolumeX, description: 'Minimal interventions' },
    manual: { label: 'Manual', icon: Settings, description: 'No automation' },
    off: { label: 'Off', icon: X, description: 'AI disabled' },
    focus: { label: 'Focus', icon: Brain, description: 'No interruptions' },
    help_me: { label: 'Help Me', icon: Sparkles, description: 'Maximum assistance' },
    learning: { label: 'Learning', icon: MessageSquare, description: 'Explain actions' },
    privacy: { label: 'Privacy', icon: Shield, description: 'No data storage' }
  }

  // Tool display names
  const toolDisplayNames: Record<keyof ToolPermissions, string> = {
    create_task: 'Create Tasks',
    start_focus_timer: 'Start Focus Timer',
    pause_focus_timer: 'Pause Focus Timer',
    resume_focus_timer: 'Resume Focus Timer',
    complete_task: 'Complete Tasks',
    update_task_progress: 'Update Progress',
    suggest_break: 'Suggest Breaks',
    provide_encouragement: 'Provide Encouragement',
    track_mood: 'Track Mood',
    analyze_patterns: 'Analyze Patterns',
    set_reminder: 'Set Reminders',
    navigate_to_page: 'Navigate Pages',
    adjust_task_priority: 'Adjust Priority',
    break_down_task: 'Break Down Tasks',
    generate_reward: 'Generate Rewards'
  }

  const handleExport = () => {
    const data = exportPreferences()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai-preferences.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    if (importPreferences(importData)) {
      setShowImportDialog(false)
      setImportData('')
    }
  }

  // Fetch AI Brain status on mount
  useEffect(() => {
    const fetchBrainStatus = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from('preferences')
          .select('planner_config')
          .eq('user_id', user.id)
          .single()
        
        const plannerConfig = data?.planner_config
        if (plannerConfig && !error) {
          setAIBrainStatus(
            plannerConfig.manual_override === true ? 'on' :
            plannerConfig.manual_override === false ? 'off' : 'auto'
          )
          
          if (plannerConfig.last_activity_at) {
            const date = new Date(plannerConfig.last_activity_at)
            setLastActivity(date.toLocaleString())
          }
        }
      }
    }
    
    fetchBrainStatus()
  }, [])

  const handleBrainStatusChange = async (status: 'auto' | 'on' | 'off') => {
    setIsUpdatingBrain(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const manualOverride = status === 'on' ? true : status === 'off' ? false : null
      const isActive = status !== 'off'
      
      // Get current preferences to merge planner config
      const { data: currentPrefs } = await supabase
        .from('preferences')
        .select('planner_config')
        .eq('user_id', user.id)
        .single()
      
      const { error } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          planner_config: {
            ...(currentPrefs?.planner_config || {}),
            manual_override: manualOverride,
            is_active: isActive,
            last_activity_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
      
      if (!error) {
        setAIBrainStatus(status)
      } else {
        console.error('Failed to update AI Brain status:', error)
      }
    }
    
    setIsUpdatingBrain(false)
  }

  return (
    <div className="space-y-6">
      {/* AI Brain Control - CRITICAL */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Brain Control
          </CardTitle>
          <CardDescription>
            Control the proactive AI Brain that monitors your activity and provides timely interventions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleBrainStatusChange('auto')}
              disabled={isUpdatingBrain}
              className={`p-3 rounded-lg border transition-all ${
                aiBrainStatus === 'auto'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Activity className="h-5 w-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Auto</div>
              <div className="text-xs text-muted-foreground">Active when online</div>
            </button>
            
            <button
              onClick={() => handleBrainStatusChange('on')}
              disabled={isUpdatingBrain}
              className={`p-3 rounded-lg border transition-all ${
                aiBrainStatus === 'on'
                  ? 'border-success-500 bg-success-500/10'
                  : 'border-border hover:border-success-500/50'
              }`}
            >
              <Power className="h-5 w-5 mx-auto mb-1 text-success-500" />
              <div className="text-sm font-medium">Always On</div>
              <div className="text-xs text-muted-foreground">Always active</div>
            </button>
            
            <button
              onClick={() => handleBrainStatusChange('off')}
              disabled={isUpdatingBrain}
              className={`p-3 rounded-lg border transition-all ${
                aiBrainStatus === 'off'
                  ? 'border-danger-500 bg-danger-500/10'
                  : 'border-border hover:border-danger-500/50'
              }`}
            >
              <X className="h-5 w-5 mx-auto mb-1 text-danger-500" />
              <div className="text-sm font-medium">Off</div>
              <div className="text-xs text-muted-foreground">Disabled</div>
            </button>
          </div>
          
          {lastActivity && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              Last active: {lastActivity}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 inline mr-2 text-yellow-500" />
            <strong>Important:</strong> The AI Brain runs every 10-30 minutes to analyze your patterns and suggest helpful interventions. 
            Set to &quot;Off&quot; to completely disable it and save API costs.
          </div>
        </CardContent>
      </Card>

      {/* Quick Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Mode
          </CardTitle>
          <CardDescription>
            Quickly adjust AI behavior for different situations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(quickModes).map(([mode, config]) => {
              const Icon = config.icon
              return (
                <button
                  key={mode}
                  onClick={() => setQuickMode(mode as QuickMode)}
                  className={`p-3 rounded-lg border transition-all ${
                    preferences.quickMode === mode
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preset Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Preference Presets</CardTitle>
          <CardDescription>
            Choose a preset configuration or customize your own
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(preferencePresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  preferences.presetName === key
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">{preset.name}</div>
                <div className="text-sm text-muted-foreground">{preset.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['automation', 'tools', 'intervention', 'communication', 'privacy'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Automation Settings */}
      {activeTab === 'automation' && (
        <Card>
          <CardHeader>
            <CardTitle>Automation Level</CardTitle>
            <CardDescription>
              Control how much the AI can do automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {Object.entries(automationLevels).map(([level, config]) => (
                <button
                  key={level}
                  onClick={() => setAutomationLevel(level as AutomationPreferences['level'])}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    preferences.automation.level === level
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-sm text-muted-foreground">{config.description}</div>
                    </div>
                    {preferences.automation.level === level && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <label className="flex items-center justify-between">
                <span className="text-sm">Allow auto task creation</span>
                <input
                  type="checkbox"
                  checked={preferences.automation.allowAutoTaskCreation}
                  onChange={(e) => setPreferences({
                    automation: {
                      ...preferences.automation,
                      allowAutoTaskCreation: e.target.checked
                    }
                  })}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Allow auto focus start</span>
                <input
                  type="checkbox"
                  checked={preferences.automation.allowAutoFocusStart}
                  onChange={(e) => setPreferences({
                    automation: {
                      ...preferences.automation,
                      allowAutoFocusStart: e.target.checked
                    }
                  })}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Always require confirmation</span>
                <input
                  type="checkbox"
                  checked={preferences.automation.requireConfirmation}
                  onChange={(e) => setPreferences({
                    automation: {
                      ...preferences.automation,
                      requireConfirmation: e.target.checked
                    }
                  })}
                  className="rounded"
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Permissions */}
      {activeTab === 'tools' && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Permissions</CardTitle>
            <CardDescription>
              Control which tools the AI can use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(preferences.tools).map(([tool, permission]) => (
                <div
                  key={tool}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={permission.enabled}
                      onChange={(e) => setToolPermission(
                        tool as keyof ToolPermissions,
                        { enabled: e.target.checked }
                      )}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      {toolDisplayNames[tool as keyof ToolPermissions]}
                    </span>
                  </div>
                  {permission.enabled && (
                    <select
                      value={permission.requireConfirmation ? 'ask' : 'auto'}
                      onChange={(e) => setToolPermission(
                        tool as keyof ToolPermissions,
                        { requireConfirmation: e.target.value === 'ask' }
                      )}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="auto">Auto</option>
                      <option value="ask">Ask First</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intervention Settings */}
      {activeTab === 'intervention' && (
        <Card>
          <CardHeader>
            <CardTitle>Proactive Help</CardTitle>
            <CardDescription>
              Configure when and how the AI offers assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="font-medium">Enable proactive help</span>
              <input
                type="checkbox"
                checked={preferences.intervention.enabled}
                onChange={(e) => setPreferences({
                  intervention: {
                    ...preferences.intervention,
                    enabled: e.target.checked
                  }
                })}
                className="rounded"
              />
            </label>

            {preferences.intervention.enabled && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Frequency</label>
                  <select
                    value={preferences.intervention.frequency}
                    onChange={(e) => setInterventionFrequency(e.target.value as InterventionPreferences['frequency'])}
                    className="w-full border rounded px-3 py-2"
                  >
                    {Object.entries(interventionFrequencies).map(([freq, label]) => (
                      <option key={freq} value={freq}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Cooldown (minutes)</label>
                  <Input
                    type="number"
                    value={preferences.intervention.cooldownMinutes}
                    onChange={(e) => setPreferences({
                      intervention: {
                        ...preferences.intervention,
                        cooldownMinutes: parseInt(e.target.value) || 15
                      }
                    })}
                    min="5"
                    max="60"
                    className="text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Types of Help</label>
                  <div className="space-y-2">
                    {[
                      { type: 'task_reminder', label: 'Task reminders' },
                      { type: 'break_suggestion', label: 'Break suggestions' },
                      { type: 'mood_checkin', label: 'Mood check-ins' },
                      { type: 'focus_prompt', label: 'Focus prompts' },
                      { type: 'encouragement', label: 'Encouragement' },
                      { type: 'pattern_insight', label: 'Pattern insights' },
                      { type: 'overwhelm_support', label: 'Overwhelm support' },
                      { type: 'procrastination_help', label: 'Procrastination help' }
                    ].map(({ type, label }) => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={preferences.intervention.allowedTypes.includes(type as any)}
                          onChange={(e) => {
                            const types = e.target.checked
                              ? [...preferences.intervention.allowedTypes, type as any]
                              : preferences.intervention.allowedTypes.filter(t => t !== type)
                            setPreferences({
                              intervention: {
                                ...preferences.intervention,
                                allowedTypes: types
                              }
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Communication Style */}
      {activeTab === 'communication' && (
        <Card>
          <CardHeader>
            <CardTitle>Communication Style</CardTitle>
            <CardDescription>
              Customize how the AI communicates with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Personality</label>
              <select
                value={preferences.communication.personality}
                onChange={(e) => setPreferences({
                  communication: {
                    ...preferences.communication,
                    personality: e.target.value as CommunicationPreferences['personality']
                  }
                })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="encouraging">Encouraging</option>
                <option value="direct">Direct</option>
                <option value="gentle">Gentle</option>
                <option value="energetic">Energetic</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message Length</label>
              <select
                value={preferences.communication.messageLength}
                onChange={(e) => setPreferences({
                  communication: {
                    ...preferences.communication,
                    messageLength: e.target.value as CommunicationPreferences['messageLength']
                  }
                })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Technical Level</label>
              <select
                value={preferences.communication.technicalLevel}
                onChange={(e) => setPreferences({
                  communication: {
                    ...preferences.communication,
                    technicalLevel: e.target.value as CommunicationPreferences['technicalLevel']
                  }
                })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Voice Speed</label>
              <p className="text-xs text-muted-foreground mb-3">Adjust how fast the AI speaks during voice conversations</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'slow', label: 'Slow', rate: '0.8x' },
                  { value: 'normal', label: 'Normal', rate: '1.0x' },
                  { value: 'fast', label: 'Fast', rate: '1.15x' }
                ] as const).map((speed) => (
                  <button
                    key={speed.value}
                    type="button"
                    onClick={() => setPreferences({
                      communication: {
                        ...preferences.communication,
                        voiceSpeed: speed.value
                      }
                    })}
                    className={`p-3 rounded-lg border transition-all ${
                      preferences.communication.voiceSpeed === speed.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium">{speed.label}</div>
                    <div className="text-xs text-muted-foreground">{speed.rate}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between">
              <span className="text-sm">Use emojis</span>
              <input
                type="checkbox"
                checked={preferences.communication.useEmoji}
                onChange={(e) => setPreferences({
                  communication: {
                    ...preferences.communication,
                    useEmoji: e.target.checked
                  }
                })}
                className="rounded"
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings */}
      {activeTab === 'privacy' && (
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Data</CardTitle>
            <CardDescription>
              Control how your data is used and stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Store conversations</span>
              <input
                type="checkbox"
                checked={preferences.privacy.storeConversations}
                onChange={(e) => setPreferences({
                  privacy: {
                    ...preferences.privacy,
                    storeConversations: e.target.checked
                  }
                })}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">Use data for improvement</span>
              <input
                type="checkbox"
                checked={preferences.privacy.useDataForImprovement}
                onChange={(e) => setPreferences({
                  privacy: {
                    ...preferences.privacy,
                    useDataForImprovement: e.target.checked
                  }
                })}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">Share anonymous metrics</span>
              <input
                type="checkbox"
                checked={preferences.privacy.shareAnonymousMetrics}
                onChange={(e) => setPreferences({
                  privacy: {
                    ...preferences.privacy,
                    shareAnonymousMetrics: e.target.checked
                  }
                })}
                className="rounded"
              />
            </label>

            <div>
              <label className="text-sm font-medium mb-2 block">Data retention (days)</label>
              <Input
                type="number"
                value={preferences.privacy.dataRetentionDays}
                onChange={(e) => setPreferences({
                  privacy: {
                    ...preferences.privacy,
                    dataRetentionDays: parseInt(e.target.value) || 30
                  }
                })}
                min="1"
                max="365"
                className="text-gray-900"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ADHD Profile */}
      <Card>
        <CardHeader>
          <CardTitle>ADHD Profile</CardTitle>
          <CardDescription>
            Optimize AI behavior for your ADHD type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(['none', 'inattentive', 'hyperactive', 'combined', 'custom'] as ADHDProfile[]).map((profile) => (
              <button
                key={profile}
                onClick={() => setADHDProfile(profile)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preferences.adhdProfile === profile
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium capitalize">{profile}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Import/Export Settings</CardTitle>
          <CardDescription>
            Save or load your preference configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowImportDialog(true)} variant="outline" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={resetToDefaults} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Import Preferences</CardTitle>
              <CardDescription>
                Paste your exported preferences JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste JSON here..."
                className="text-gray-900 h-32"
              />
              <div className="flex gap-2 mt-4">
                <Button onClick={handleImport} className="flex-1">
                  Import
                </Button>
                <Button onClick={() => setShowImportDialog(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}