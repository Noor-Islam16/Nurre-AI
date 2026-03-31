"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

interface ConsentModalProps {
  open: boolean
  onAccept: () => void
}

export function ConsentModal({ open, onAccept }: ConsentModalProps) {
  const [isChecked, setIsChecked] = useState(false)

  const handleAccept = () => {
    if (isChecked) {
      // Set consent in localStorage
      try {
        localStorage.setItem('assessments-consent', 'true')
      } catch (error) {
        console.error('Failed to save consent:', error)
      }
      onAccept()
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-blue-700" />
            </div>
            <DialogTitle className="text-xl">
              Assessment Consent
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700 pt-2">
            Before you begin, please review and acknowledge the following information about our screening assessments.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* What screenings are */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">What These Assessments Are</h4>
              <ul className="text-sm text-gray-700 space-y-1 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>NHS-approved screening tools that help identify symptoms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Validated questionnaires used in UK clinical settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Results can support GP referrals for formal assessment</span>
                </li>
              </ul>
            </div>

            {/* What they are NOT */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">What These Assessments Are NOT</h4>
              <ul className="text-sm text-gray-700 space-y-1 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>NOT a formal diagnosis or substitute for professional medical advice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>NOT a replacement for seeing your GP or mental health professional</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>NOT emergency services - if in crisis, seek immediate help</span>
                </li>
              </ul>
            </div>

            {/* Storage and visibility */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">Storage & Visibility</h4>
              <ul className="text-sm text-gray-700 space-y-1 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Your responses are stored securely and privately in your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>You can choose to share results with your GP if needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Your data remains confidential and is not shared without your consent</span>
                </li>
              </ul>
            </div>

            {/* PHQ-9 Q9 emergency rule */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-semibold text-red-900 mb-1">Important: Self-Harm Risk</h4>
                  <p className="text-red-800">
                    The PHQ-9 depression screening includes a question about thoughts of self-harm.
                    If you indicate any risk, we&apos;ll provide immediate support resources and strongly
                    encourage you to contact emergency services or a crisis helpline.
                  </p>
                </div>
              </div>
            </div>

            {/* Consent checkbox */}
            <div className="pt-4 border-t">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                />
                <span className="text-sm text-gray-900 group-hover:text-gray-700">
                  I understand that these are screening tools and not medical diagnoses. I acknowledge
                  the information above about storage, visibility, and emergency procedures. I am ready
                  to proceed with the assessment.
                </span>
              </label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!isChecked}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            I Agree - Continue to Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
