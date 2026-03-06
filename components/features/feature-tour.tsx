'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import { FEATURE_TOURS, type FeatureTour, type TourStep } from '@/lib/tours/tour-content'
import { useRouter } from 'next/navigation'

interface FeatureTourProps {
  tourId: string
  onComplete: () => void
  onSkip: () => void
}

export function FeatureTour({ tourId, onComplete, onSkip }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  const tour = FEATURE_TOURS[tourId]
  const step = tour?.steps[currentStep]
  const isLastStep = tour ? currentStep === tour.steps.length - 1 : false
  const isFirstStep = currentStep === 0
  
  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }
  
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }
  
  // Handle navigation if step requires it
  useEffect(() => {
    if (step?.action?.startsWith('navigate:')) {
      const path = step.action.replace('navigate:', '')
      router.push(path)
    }
  }, [step, router])
  
  // Highlight target element and position tooltip
  useEffect(() => {
    // Clean up previous highlight
    if (highlightedElement) {
      highlightedElement.classList.remove('tour-highlight')
      highlightedElement.style.position = ''
      highlightedElement.style.zIndex = ''
    }
    
    if (step?.target) {
      // Wait a bit for navigation to complete if needed
      const timeoutId = setTimeout(() => {
        const element = document.querySelector(step.target!) as HTMLElement
        if (element) {
          // Add highlight class
          element.classList.add('tour-highlight')
          element.style.position = 'relative'
          element.style.zIndex = '51'
          
          // Scroll into view
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          })
          
          setHighlightedElement(element)
          
          // Position tooltip near the element
          if (tooltipRef.current) {
            const rect = element.getBoundingClientRect()
            const tooltipRect = tooltipRef.current.getBoundingClientRect()
            
            let top = 0
            let left = 0
            
            switch (step.position || 'bottom') {
              case 'top':
                top = rect.top - tooltipRect.height - 20
                left = rect.left + (rect.width - tooltipRect.width) / 2
                break
              case 'bottom':
                top = rect.bottom + 20
                left = rect.left + (rect.width - tooltipRect.width) / 2
                break
              case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2
                left = rect.left - tooltipRect.width - 20
                break
              case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2
                left = rect.right + 20
                break
            }
            
            // Keep tooltip within viewport
            top = Math.max(20, Math.min(window.innerHeight - tooltipRect.height - 20, top))
            left = Math.max(20, Math.min(window.innerWidth - tooltipRect.width - 20, left))
            
            tooltipRef.current.style.top = `${top}px`
            tooltipRef.current.style.left = `${left}px`
          }
        }
      }, step?.action?.startsWith('navigate:') ? 500 : 100)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
    
    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('tour-highlight')
        highlightedElement.style.position = ''
        highlightedElement.style.zIndex = ''
      }
    }
  }, [step, highlightedElement])
  
  // Return null if tour doesn't exist
  if (!tour || !step) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ pointerEvents: 'none' }}
      >
        {/* Dark overlay with hole for highlighted element */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{ pointerEvents: 'auto' }}
          onClick={onSkip}
        />
        
        {/* Tour tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bg-white rounded-xl shadow-2xl p-6 max-w-md"
          style={{ 
            pointerEvents: 'auto',
            position: 'fixed'
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tour.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep + 1} of {tour.steps.length}
              </p>
            </div>
            <button
              onClick={onSkip}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Content */}
          <p className="text-gray-700 mb-6 leading-relaxed">{step.description}</p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {tour.steps.map((_, index) => (
              <div
                key={index}
                className={`transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 h-2 rounded-full bg-primary-600' 
                    : index < currentStep
                    ? 'w-2 h-2 rounded-full bg-primary-400'
                    : 'w-2 h-2 rounded-full bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                isFirstStep 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <button
              onClick={onSkip}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip tour
            </button>
            
            <button
              onClick={handleNext}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all ${
                isLastStep
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isLastStep ? (
                <>
                  Complete
                  <CheckCircle className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}