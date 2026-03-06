'use client'

import { useEffect } from 'react'
import { useBackgroundNoise } from '@/hooks/use-background-noise'
import { useToast } from '@/components/ui/use-toast'

/**
 * Handles AI-triggered background noise control events
 * Acts as a bridge between AI tool executor and the background noise hook
 */
export function AIBackgroundNoiseController() {
  const { 
    play, 
    stop, 
    setVolume, 
    setSoundType,
    isPlaying,
    settings
  } = useBackgroundNoise()
  const { toast } = useToast()

  useEffect(() => {
    const handleBackgroundNoiseControl = async (event: CustomEvent) => {
      const { action, type, volume, fadeIn, fadeOut, reason, source } = event.detail

      if (action === 'play') {
        // Set sound type if different
        if (type && type !== settings.soundType) {
          setSoundType(type)
        }

        // Set volume if specified
        if (volume !== undefined) {
          setVolume(volume)
        }

        // Play with optional fade in
        if (fadeIn) {
          // Gradually increase volume
          const targetVolume = volume || 50
          setVolume(0)
          await play()
          
          let currentVol = 0
          const fadeInterval = setInterval(() => {
            currentVol += 5
            if (currentVol >= targetVolume) {
              setVolume(targetVolume)
              clearInterval(fadeInterval)
            } else {
              setVolume(currentVol)
            }
          }, 100)
        } else {
          await play()
        }

        // Show feedback if from AI
        if (source === 'ai_tool') {
          toast({
            title: '🎵 Background noise started',
            description: `Playing ${type || settings.soundType} sounds`,
            duration: 3000,
          })
        }
      } else if (action === 'stop') {
        // Stop with optional fade out
        if (fadeOut && isPlaying) {
          // Gradually decrease volume
          const currentVol = settings.volume || 50
          let fadingVol = currentVol
          
          const fadeInterval = setInterval(() => {
            fadingVol -= 5
            if (fadingVol <= 0) {
              stop()
              setVolume(currentVol) // Restore original volume for next play
              clearInterval(fadeInterval)
            } else {
              setVolume(fadingVol)
            }
          }, 100)
        } else {
          stop()
        }

        // Show feedback if from AI
        if (source === 'ai_tool') {
          const reasonText = reason === 'auto_stop' ? ' (timer complete)' : ''
          toast({
            title: '🔇 Background noise stopped',
            description: `Sounds faded out${reasonText}`,
            duration: 3000,
          })
        }
      }
    }

    // Listen for background noise control events
    const eventHandler = ((e: Event) => handleBackgroundNoiseControl(e as CustomEvent)) as EventListener
    window.addEventListener('background-noise-control', eventHandler)

    return () => {
      window.removeEventListener('background-noise-control', eventHandler)
    }
  }, [play, stop, setVolume, setSoundType, isPlaying, settings, toast])

  return null
}