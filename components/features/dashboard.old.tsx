'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Trophy, Target, Clock, TrendingUp,
  Calendar, Zap, ChevronRight, Plus, Award
} from 'lucide-react'
import { useSharedSession } from '@/hooks/use-shared-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardStore } from '@/store/dashboard-store'
import { useTaskStore } from '@/store/task-store'
import { useRewardsStore } from '@/store/rewards-store'
import { MoodCheck } from './mood-check'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { AIMessages } from '@/components/ai/shared/ai-messages'
import { AIInput } from '@/components/ai/shared/ai-input'
import { useAIVariant } from '@/hooks/use-ai-variant'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { motion } from 'framer-motion'
import { DashboardCardSkeleton, TaskSkeleton } from '@/components/ui/skeleton-loader'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface DashboardProps {
  sessionId: string | null
}

export function Dashboard({ sessionId }: DashboardProps) {
  const router = useRouter()
  const { stats, isLoading, fetchStats } = useDashboardStore()
  const { tasks, fetchTasks } = useTaskStore()
  const { fetchRewards, checkForNewAchievements, currentStreak } = useRewardsStore()
  const { config } = useAIVariant()
  const { toast } = useToast()
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [previousStreak, setPreviousStreak] = useState<number | null>(null)
  const [streakIncreased, setStreakIncreased] = useState(false)
  
  // Get session reset function
  const { resetSession } = useSharedSession()
  
  // Use shared session ID instead of local conversation ID
  const conversationId = sessionId || undefined
  
  // Initialize AI Assistant with error handling and persistence
  const {
    sendMessage,
    isLoading: isAILoading,
    error: aiError,
    clearHistory,
    messages,
    startNewConversation
  } = useAIAssistant({
    variant: 'dashboard',
    conversationId,
    persistMessages: true,
    onError: (error) => {
      console.error('AI Assistant error:', error)
      
      // Determine error type and show appropriate message
      let errorMessage = 'Failed to send message. Please try again.'
      let errorTitle = 'Error'
      
      if (!isOnline) {
        errorMessage = 'No internet connection. Please check your network.'
        errorTitle = 'Offline'
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many messages. Please wait a moment before trying again.'
        errorTitle = 'Rate Limited'
      } else if (error.message?.includes('401') || error.message?.includes('auth')) {
        errorMessage = 'Please sign in to continue using the AI assistant.'
        errorTitle = 'Authentication Required'
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
        errorTitle = 'Timeout'
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        action: retryCount < 3 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRetryCount(prev => prev + 1)
              // Retry last message
              if (messages.length > 0) {
                const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
                if (lastUserMessage) {
                  sendMessage(lastUserMessage.content)
                }
              }
            }}
          >
            Retry
          </Button>
        ) : undefined
      })
    }
  })
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: 'Back Online',
        description: 'Connection restored. You can continue chatting.',
      })
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: 'Connection Lost',
        description: 'You appear to be offline. Messages will be sent when connection is restored.'
      })
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check initial status
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])
  
  useEffect(() => {
    fetchStats()
    fetchTasks()
    fetchRewards()
  }, [fetchStats, fetchTasks, fetchRewards])
  
  // Check for new achievements when stats update
  useEffect(() => {
    const checkAchievements = () => {
      const newlyUnlocked = checkForNewAchievements()
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(achievement => {
          toast({
            title: "🎉 Achievement Unlocked!",
            description: `${achievement.icon} ${achievement.title} - ${achievement.description}`,
            action: (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => router.push('/rewards')}
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300"
              >
                <Award className="w-3 h-3 mr-1" />
                View
              </Button>
            ),
          })
        })
      }
    }
    
    // Small delay to ensure rewards are fetched first
    const timer = setTimeout(checkAchievements, 500)
    return () => clearTimeout(timer)
  }, [stats, checkForNewAchievements, toast, router])
  
  // Check for streak increase
  useEffect(() => {
    if (previousStreak !== null && currentStreak > previousStreak) {
      setStreakIncreased(true)
      setTimeout(() => setStreakIncreased(false), 3000)
      
      // Show streak milestone toast for special numbers
      const milestones = [7, 14, 30, 60, 90, 180, 365]
      if (milestones.includes(currentStreak)) {
        toast({
          title: "🔥 Streak Milestone!",
          description: `Amazing! You've reached a ${currentStreak} day streak!`,
        })
      }
    }
    setPreviousStreak(currentStreak)
  }, [currentStreak, previousStreak, toast])
  
  const upcomingTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
        
        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <DashboardCardSkeleton />
            <div className="space-y-4">
              <TaskSkeleton />
              <TaskSkeleton />
            </div>
          </div>
          <div className="space-y-6">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Today&apos;s</p>
                  <p className="text-2xl font-bold text-gray-800">{stats?.todaysTasks || 0}</p>
                  <p className="text-xs text-gray-600">Tasks</p>
                </div>
                <div className="p-2 bg-violet-50 rounded-lg">
                  <Target className="w-5 h-5 text-violet-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Today</p>
                  <p className="text-2xl font-bold text-gray-800">{stats?.completedToday || 0}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Focus</p>
                  <p className="text-2xl font-bold text-gray-800">{stats?.focusMinutesToday || 0}</p>
                  <p className="text-xs text-gray-600">Minutes</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: streakIncreased ? [1, 1.05, 1] : 1,
          }}
          transition={{ 
            delay: 0.3,
            scale: { duration: 0.3 }
          }}
        >
          <Card className={cn(
            "border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all",
            streakIncreased && "shadow-lg shadow-orange-200 animate-pulse"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Streak</p>
                  <motion.p 
                    className="text-2xl font-bold text-gray-800"
                    animate={{
                      scale: streakIncreased ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {stats?.currentStreak || 0}
                  </motion.p>
                  <p className="text-xs text-gray-600">Days</p>
                </div>
                <motion.div 
                  className={cn(
                    "p-2 rounded-lg",
                    streakIncreased ? "bg-gradient-to-br from-orange-100 to-red-100" : "bg-orange-50"
                  )}
                  animate={{
                    rotate: streakIncreased ? [0, -10, 10, -10, 0] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <Zap className={cn(
                    "w-5 h-5",
                    streakIncreased ? "text-orange-600" : "text-orange-500"
                  )} />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Start Session Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-r from-primary-700 to-secondary-500 text-white border-0">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Ready to focus?</CardTitle>
                <CardDescription className="text-white/90">
                  Start a focus session and tackle your most important task.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push('/focus')}
                  variant="secondary"
                  size="lg"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Start Focus Session
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent-500" />
                  Priority Tasks
                </CardTitle>
                <Button
                  onClick={() => router.push('/planner')}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-accent/20 hover:text-accent-700"
                >
                  View all →
                </Button>
              </div>
              <CardDescription className="text-sm text-gray-600">
                Your most important tasks for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{task.title}</p>
                      {task.timeEstimate && (
                        <p className="text-sm text-gray-600">
                          {task.timeEstimate} minutes
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('start-focus-timer', {
                          detail: { taskId: task.id, duration: task.timeEstimate || 25 }
                        }))
                        router.push('/focus')
                      }}
                      size="sm"
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-800 text-center py-4 font-medium">
                No tasks yet. Add some to get started!
              </p>
            )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Assistant - Dashboard Variant with custom wrapper */}
          {config && (
            <div className="relative">
              <AIAssistant 
                variant="dashboard"
                config={config}
                sessionId={sessionId}
                maxHeight="550px"
                className="border-2 border-purple-200 shadow-lg hover:border-purple-300 hover:shadow-xl transition-all duration-300"
                  title={
                    <div className="flex items-center gap-2">
                      <Image
                        src="/logo-notext.png"
                        alt="NureeAI"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                      <span>Nuree AI</span>
                    </div>
                  }
                  subtitle="Ready to help you stay focused and productive"
                  showQuickActions={true}
                  customActions={[
                    { label: "What should I focus on?", action: "What task should I prioritize today?" },
                    { label: "I'm feeling stuck", action: "I'm feeling stuck and need motivation" },
                    { label: "Review my progress", action: "Can you review my progress today?" },
                    { 
                      label: "New Chat", 
                      action: "NEW_CONVERSATION", 
                      icon: <Plus className="h-4 w-4" />,
                      onClick: resetSession  // Use session reset
                    }
                  ]}
              renderMessages={({ messages, isLoading }) => (
                <div className="flex-1 px-4 pb-2 overflow-hidden">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg min-h-[250px] max-h-[350px] overflow-y-auto shadow-inner scroll-smooth">
                    {messages.length === 0 && !isLoading ? (
                      <div className="flex items-center justify-center h-[200px] p-4">
                        <p className="text-gray-500 text-sm text-center italic">
                          Hi! I&apos;m here to help you stay focused and productive. 
                          <br />
                          Ask me anything or use the quick actions below.
                        </p>
                      </div>
                    ) : (
                      <div className="px-1 py-2 w-full">
                        <AIMessages 
                          maxMessages={10}
                          className="space-y-2 w-full"
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              renderInput={({ placeholder }) => (
                <div className="border-t border-gray-200">
                  <div className="px-4 py-3">
                    {/* Offline/Error indicator */}
                    {!isOnline && (
                      <div className="mb-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-xs text-yellow-800 text-center">
                          You&apos;re offline. Messages will be sent when reconnected.
                        </p>
                      </div>
                    )}
                    {aiError && isOnline && (
                      <div className="mb-2 px-2 py-1 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-800 text-center">
                          Error sending message. Please try again.
                        </p>
                      </div>
                    )}
                    <AIInput
                      placeholder={!isOnline ? "Waiting for connection..." : placeholder}
                      onSend={async (message) => {
                        if (!isOnline) {
                          toast({
                            title: 'Offline',
                            description: 'Cannot send messages while offline.'
                          })
                          return
                        }
                        
                        try {
                          setRetryCount(0) // Reset retry count on new message
                          await sendMessage(message)
                        } catch (error) {
                          console.error('Failed to send message:', error)
                        }
                      }}
                      isLoading={isAILoading}
                    />
                    {/* Clear chat and new conversation buttons */}
                    {messages && messages.length > 0 && (
                      <div className="mt-2 flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            clearHistory()
                            toast({
                              title: 'Chat Cleared',
                              description: 'Conversation history has been cleared.',
                            })
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            startNewConversation()
                            toast({
                              title: 'New Conversation',
                              description: 'Starting a fresh conversation.',
                            })
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          New Chat
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              />
            </div>
          )}
          
          {/* Mood Check */}
          <MoodCheck />
        </div>
      </div>
    </div>
  )
}