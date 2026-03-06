import { ExecutionHistory } from '@/components/ai/execution-history'
import { ArrowLeft, History, Brain } from 'lucide-react'
import Link from 'next/link'

export default function AIHistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Execution History</h1>
              <p className="text-muted-foreground">
                View and manage all AI assistant actions and tool executions
              </p>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Your AI assistant executes tools to help you stay focused and productive. 
                All actions are logged here for transparency and control.
              </span>
            </div>
          </div>
        </div>

        {/* Execution History Component */}
        <ExecutionHistory view="timeline" maxHeight="calc(100vh - 300px)" />
      </div>
    </div>
  )
}