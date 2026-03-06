"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, HelpCircle, ShieldCheck, ExternalLink, Brain, Heart, AlertTriangle, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Assessment } from '@/lib/types/assessment'
import { ASSESSMENT_CONFIG } from '@/lib/types/assessment'

interface AssessmentDetailsModalProps {
  assessment: Assessment | null
  open: boolean
  onClose: () => void
}

export function AssessmentDetailsModal({
  assessment,
  open,
  onClose
}: AssessmentDetailsModalProps) {
  if (!assessment) return null

  const config = ASSESSMENT_CONFIG[assessment.type]

  // Map icon names to actual components
  const iconMap: Record<string, any> = {
    Brain: Brain,
    Heart: Heart,
    AlertTriangle: AlertTriangle,
    BarChart3: BarChart3
  }
  const IconComponent = iconMap[config.iconName] || Brain

  // Placeholder evidence links - these should come from assessment metadata in future
  const evidenceLinks = [
    {
      title: 'NHS Approved Assessment',
      url: '#',
      description: 'Validated for use in UK clinical settings'
    },
    {
      title: 'Clinical Validation Study',
      url: '#',
      description: 'Peer-reviewed research supporting this tool'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              config.color === 'purple' && 'bg-purple-100',
              config.color === 'blue' && 'bg-blue-100',
              config.color === 'amber' && 'bg-amber-100',
              config.color === 'teal' && 'bg-teal-100'
            )}>
              <IconComponent className={cn(
                'h-6 w-6',
                config.color === 'purple' && 'text-purple-700',
                config.color === 'blue' && 'text-blue-700',
                config.color === 'amber' && 'text-amber-700',
                config.color === 'teal' && 'text-teal-700'
              )} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {assessment.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    config.color === 'purple' && 'bg-purple-100 text-purple-700',
                    config.color === 'blue' && 'bg-blue-100 text-blue-700',
                    config.color === 'amber' && 'bg-amber-100 text-amber-700',
                    config.color === 'teal' && 'bg-teal-100 text-teal-700'
                  )}
                >
                  {config.code}
                </Badge>
                {config.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {tag === 'Validated' && <ShieldCheck className="h-3 w-3 mr-1" />}
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Assessment Info */}
            <div className="flex items-center gap-4 text-sm text-gray-600 py-3 border-y">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{config.minutes} minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" />
                <span>{config.questions} questions</span>
              </div>
              <div className="text-xs px-2 py-1 bg-gray-100 rounded">
                v{assessment.version}
              </div>
            </div>

            {/* Full Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                About This Assessment
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {assessment.description}
              </p>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                What to Expect
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-1">•</span>
                  <span>Answer {config.questions} questions about your recent experiences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-1">•</span>
                  <span>Takes approximately {config.minutes} minutes to complete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-1">•</span>
                  <span>Your responses are confidential and can be shared with your GP</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-1">•</span>
                  <span>Results provide screening insights, not a formal diagnosis</span>
                </li>
              </ul>
            </div>

            {/* Evidence & Validation */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Clinical Evidence
              </h3>
              <div className="space-y-2">
                {evidenceLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-violet-700">
                          {link.title}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {link.description}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-violet-600 flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Validation Note */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <strong>NHS Validation:</strong> This assessment has been validated for use in
                  UK clinical settings and is recommended for screening purposes. Results can
                  support GP referrals for formal assessment.
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
