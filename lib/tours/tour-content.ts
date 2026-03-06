export interface TourStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for highlighting
  action?: string // Optional action to trigger
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface FeatureTour {
  id: string
  name: string
  description: string
  icon: string
  steps: TourStep[]
}

export const FEATURE_TOURS: Record<string, FeatureTour> = {
  task_creation: {
    id: 'task_creation',
    name: 'Creating Tasks',
    description: 'Learn how to create and manage tasks with AI assistance',
    icon: '📝',
    steps: [
      {
        id: 'step1',
        title: 'Open Task Planner',
        description: 'Click on the Planner tab to see your tasks',
        target: '[data-tour="planner-tab"]',
        position: 'bottom'
      },
      {
        id: 'step2',
        title: 'Create a New Task',
        description: 'Click the "Add Task" button to create your first task',
        target: '[data-tour="add-task-button"]',
        position: 'bottom'
      },
      {
        id: 'step3',
        title: 'AI Task Breakdown',
        description: 'I can break down complex tasks into smaller, ADHD-friendly steps. Just ask me to help!',
        target: '[data-tour="ai-chat"]',
        position: 'top'
      },
      {
        id: 'step4',
        title: 'Time Estimates',
        description: 'Each task can have a time estimate to help you plan your day',
        target: '[data-tour="time-estimate"]',
        position: 'left'
      }
    ]
  },
  
  focus_timer: {
    id: 'focus_timer',
    name: 'Focus Timer',
    description: 'Master the ADHD-friendly focus timer',
    icon: '⏱️',
    steps: [
      {
        id: 'step1',
        title: 'Navigate to Focus',
        description: 'Click on the Focus tab to access the timer',
        target: '[data-tour="focus-tab"]',
        position: 'bottom'
      },
      {
        id: 'step2',
        title: 'Set Your Duration',
        description: 'Choose a duration that works for you - we recommend starting with 15-25 minutes',
        target: '[data-tour="duration-selector"]',
        position: 'bottom'
      },
      {
        id: 'step3',
        title: 'Link to a Task',
        description: 'You can link your focus session to a specific task to track time spent',
        target: '[data-tour="task-selector"]',
        position: 'right'
      },
      {
        id: 'step4',
        title: 'AI Support During Focus',
        description: 'I\'ll check in on you and help you stay on track. You can pause anytime!',
        target: '[data-tour="ai-support"]',
        position: 'top'
      }
    ]
  },
  
  ai_assistance: {
    id: 'ai_assistance',
    name: 'AI Coach Features',
    description: 'Discover how I can help you stay productive',
    icon: '🤖',
    steps: [
      {
        id: 'step1',
        title: 'Proactive Check-ins',
        description: 'I\'ll notice when you might be stuck and offer help without you having to ask',
        target: '[data-tour="ai-chat"]',
        position: 'top'
      },
      {
        id: 'step2',
        title: 'Task Assistance',
        description: 'Ask me to break down tasks, set timers, or help prioritize your work',
        target: '[data-tour="ai-input"]',
        position: 'top'
      },
      {
        id: 'step3',
        title: 'Personalized Support',
        description: 'I adapt to your ADHD persona and working style - I remember what works for you',
        target: '[data-tour="settings-tab"]',
        position: 'bottom'
      },
      {
        id: 'step4',
        title: 'Mood Awareness',
        description: 'I adjust my coaching based on how you\'re feeling',
        target: '[data-tour="mood-indicator"]',
        position: 'left'
      }
    ]
  },
  
  quick_tour: {
    id: 'quick_tour',
    name: 'Quick App Overview',
    description: 'Get oriented with the main features in 2 minutes',
    icon: '🚀',
    steps: [
      {
        id: 'step1',
        title: 'Welcome to Your Dashboard',
        description: 'Your home base - see today\'s tasks, progress, and get quick insights',
        target: '[data-tour="dashboard"]',
        position: 'bottom'
      },
      {
        id: 'step2',
        title: 'Task Planner',
        description: 'Organize and prioritize your tasks with AI help',
        target: '[data-tour="planner-tab"]',
        position: 'bottom'
      },
      {
        id: 'step3',
        title: 'Focus Timer',
        description: 'Stay on track with ADHD-friendly timed work sessions',
        target: '[data-tour="focus-tab"]',
        position: 'bottom'
      },
      {
        id: 'step4',
        title: 'AI Assistant',
        description: 'I\'m always here to help - just type your question or ask for support!',
        target: '[data-tour="ai-chat"]',
        position: 'top'
      },
      {
        id: 'step5',
        title: 'You\'re All Set!',
        description: 'That\'s the basics! Feel free to explore and ask me anything.',
        position: 'bottom'
      }
    ]
  },
  
  dashboard_tour: {
    id: 'dashboard_tour',
    name: 'Dashboard Features',
    description: 'Explore your personalized dashboard',
    icon: '📊',
    steps: [
      {
        id: 'step1',
        title: 'Today\'s Overview',
        description: 'See your tasks for today and current progress at a glance',
        target: '[data-tour="today-overview"]',
        position: 'bottom'
      },
      {
        id: 'step2',
        title: 'Quick Actions',
        description: 'Start a focus session or create a task with one click',
        target: '[data-tour="quick-actions"]',
        position: 'left'
      },
      {
        id: 'step3',
        title: 'Progress Tracking',
        description: 'Track your streaks and celebrate your wins!',
        target: '[data-tour="progress-stats"]',
        position: 'top'
      }
    ]
  }
}

// Helper function to get available tours for a user
export function getAvailableTours(completedTours: string[] = []): FeatureTour[] {
  return Object.values(FEATURE_TOURS).filter(
    tour => !completedTours.includes(tour.id)
  )
}

// Helper function to get tour by ID
export function getTourById(tourId: string): FeatureTour | undefined {
  return FEATURE_TOURS[tourId]
}