import { useEffect, useRef, useState } from 'react'

/**
 * Hook to analyze audio level from an HTMLAudioElement
 * Used for lip-syncing the avatar to AI speech output
 */
export function useAudioLevel(audioElement: HTMLAudioElement | null) {
  const [audioLevel, setAudioLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number>(0)
  const isConnectedRef = useRef(false)

  useEffect(() => {
    if (!audioElement) {
      setAudioLevel(0)
      return
    }

    // Only connect once per audio element
    if (isConnectedRef.current) {
      return
    }

    const setupAnalyzer = () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        audioContextRef.current = audioContext

        // Create analyzer
        const analyzer = audioContext.createAnalyser()
        analyzer.fftSize = 256
        analyzer.smoothingTimeConstant = 0.8
        analyzerRef.current = analyzer

        // Connect audio element to analyzer
        const source = audioContext.createMediaElementSource(audioElement)
        source.connect(analyzer)
        analyzer.connect(audioContext.destination) // Still play audio
        sourceRef.current = source
        isConnectedRef.current = true

        const dataArray = new Uint8Array(analyzer.frequencyBinCount)

        const updateLevel = () => {
          if (!analyzerRef.current) return

          analyzerRef.current.getByteFrequencyData(dataArray)

          // Calculate RMS (root mean square) for better volume representation
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i]
          }
          const rms = Math.sqrt(sum / dataArray.length)

          // Normalize to 0-1 range with some scaling
          const normalized = Math.min(rms / 100, 1)

          setAudioLevel(normalized)
          animationRef.current = requestAnimationFrame(updateLevel)
        }

        // Start analyzing
        updateLevel()
      } catch (error) {
        console.error('Error setting up audio analyzer:', error)
      }
    }

    // Set up on first play
    const handlePlay = () => {
      if (!isConnectedRef.current) {
        setupAnalyzer()
      }
      // Resume context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }
    }

    const handlePause = () => {
      setAudioLevel(0)
    }

    const handleEnded = () => {
      setAudioLevel(0)
    }

    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)

    // If already playing, set up immediately
    if (!audioElement.paused) {
      handlePlay()
    }

    return () => {
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      // Note: We don't disconnect the audio context here because
      // MediaElementSourceNode can only be created once per audio element.
      // The context will be cleaned up when the component unmounts.
    }
  }, [audioElement])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
        isConnectedRef.current = false
      }
    }
  }, [])

  return audioLevel
}
