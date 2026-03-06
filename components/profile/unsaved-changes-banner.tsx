'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface UnsavedChangesBannerProps {
  show: boolean
  onSave: () => void
  onDiscard: () => void
  isSaving?: boolean
}

export function UnsavedChangesBanner({
  show,
  onSave,
  onDiscard,
  isSaving = false
}: UnsavedChangesBannerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none"
        >
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl shadow-lg shadow-amber-200/50 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Warning message */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-amber-800 truncate">
                    You have unsaved changes
                  </p>
                </div>

                {/* Right: Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={onDiscard}
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Discard
                  </Button>
                  <Button
                    onClick={onSave}
                    size="sm"
                    disabled={isSaving}
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  >
                    {isSaving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-1.5 text-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
