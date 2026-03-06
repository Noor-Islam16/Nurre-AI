'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Share2, X, Trophy, Target, Calendar, Lightbulb } from 'lucide-react'
import { motion } from 'framer-motion'
import { Achievement, getRarityStyles, getRarityLabel, getRarityColor, getCategoryLabel, getCategoryIcon } from '@/lib/constants/achievements'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface AchievementDetailsModalProps {
  achievement: Achievement | null
  isOpen: boolean
  onClose: () => void
}

export function AchievementDetailsModal({ achievement, isOpen, onClose }: AchievementDetailsModalProps) {
  const { toast } = useToast()
  
  if (!achievement) return null
  
  const progressPercentage = Math.min(100, (achievement.progress / achievement.target) * 100)
  const isUnlocked = achievement.unlocked
  
  const handleShare = () => {
    const shareText = `I just unlocked "${achievement.title}" in NureeAI! ${achievement.description}`
    
    if (navigator.share) {
      navigator.share({
        title: 'Achievement Unlocked!',
        text: shareText,
      })
    } else {
      navigator.clipboard.writeText(shareText)
      toast({
        title: 'Copied to Clipboard',
        description: 'Achievement details copied to share!',
      })
    }
  }
  
  const getNextMilestone = () => {
    if (!achievement.milestones || achievement.milestones.length === 0) return null
    const nextMilestone = achievement.milestones.find(m => m > achievement.progress)
    return nextMilestone || achievement.target
  }
  
  const nextMilestone = getNextMilestone()
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold">Achievement Details</DialogTitle>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Achievement Icon and Title */}
          <div className="text-center">
            <motion.div 
              className={cn(
                "w-24 h-24 mx-auto mb-4 rounded-xl flex items-center justify-center text-5xl border-2",
                getRarityStyles(achievement.rarity),
                isUnlocked ? '' : 'grayscale opacity-50'
              )}
              animate={isUnlocked ? {
                rotate: [0, -5, 5, -5, 0],
              } : {}}
              transition={{ 
                duration: 2,
                repeat: isUnlocked ? Infinity : 0,
                repeatDelay: 5
              }}
            >
              {isUnlocked || !achievement.hidden ? achievement.icon : '🔒'}
            </motion.div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {achievement.title}
            </h3>
            
            <p className="text-gray-600">
              {achievement.description}
            </p>
            
            {/* Category and Rarity Badges */}
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="outline" className="gap-1">
                <span>{getCategoryIcon(achievement.category)}</span>
                {getCategoryLabel(achievement.category)}
              </Badge>
              <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                {getRarityLabel(achievement.rarity)}
              </Badge>
            </div>
          </div>
          
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <Target className="w-4 h-4" />
                Progress
              </span>
              <span className="font-bold text-gray-900">
                {achievement.progress}/{achievement.target}
              </span>
            </div>
            
            <div className="relative">
              {/* Custom Progress Bar */}
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
              
              {/* Milestone markers */}
              {achievement.milestones?.map((milestone) => {
                const position = (milestone / achievement.target) * 100
                const isPassed = achievement.progress >= milestone
                return (
                  <div
                    key={milestone}
                    className={cn(
                      "absolute top-0 w-3 h-3 rounded-full transform -translate-x-1/2",
                      isPassed ? "bg-green-500" : "bg-gray-300"
                    )}
                    style={{ left: `${position}%` }}
                    title={`Milestone: ${milestone}`}
                  />
                )
              })}
            </div>
            
            {nextMilestone && !isUnlocked && (
              <p className="text-xs text-gray-500 text-center">
                Next milestone: {nextMilestone - achievement.progress} more to reach {nextMilestone}
              </p>
            )}
          </div>
          
          {/* Stats */}
          {isUnlocked && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  Status
                </span>
                <span className="font-semibold text-green-600">Unlocked</span>
              </div>
              
              {achievement.unlockedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Unlocked on
                  </span>
                  <span className="font-medium text-gray-900">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Tips */}
          {!isUnlocked && achievement.tips && achievement.tips.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Tips to unlock</span>
              </div>
              <ul className="space-y-1">
                {achievement.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-blue-700">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            {isUnlocked && (
              <Button 
                onClick={handleShare}
                className="flex-1"
                variant="default"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Achievement
              </Button>
            )}
            <Button 
              onClick={onClose}
              variant={isUnlocked ? "outline" : "default"}
              className={isUnlocked ? "flex-1" : "w-full"}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}