'use client'

import { Suspense, useRef, useEffect, useState, Component, ReactNode, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getPersonality, getPersonalityList, type PersonalityId } from '@/lib/config/personalities'

// Error boundary for Three.js errors
class AvatarErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: () => void },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode; onError?: () => void }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface AvatarModelProps {
  state: AvatarState
  audioLevel: number
  avatarUrl: string
}

function AvatarModel({ state, audioLevel, avatarUrl }: AvatarModelProps) {
  const { scene } = useGLTF(avatarUrl)
  const headMeshRef = useRef<THREE.SkinnedMesh | null>(null)
  const eyeLeftMeshRef = useRef<THREE.SkinnedMesh | null>(null)
  const eyeRightMeshRef = useRef<THREE.SkinnedMesh | null>(null)
  const headBoneRef = useRef<THREE.Bone | null>(null)

  const lastBlinkRef = useRef(0)
  const isBlinkingRef = useRef(false)
  const blinkProgressRef = useRef(0)
  const nextBlinkTimeRef = useRef(0)

  // State for smooth transitions
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 })
  const currentRotationRef = useRef({ x: 0, y: 0, z: 0 })

  // Find meshes with morph targets and head bone on mount
  useEffect(() => {
    scene.traverse((child) => {
      // Find mesh with morph targets (for facial expressions)
      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
        // Use Wolf3D_Head for mouth animations
        if (child.name === 'Wolf3D_Head') {
          headMeshRef.current = child
        }
        // Use EyeLeft/EyeRight for eye animations
        if (child.name === 'EyeLeft') {
          eyeLeftMeshRef.current = child
        }
        if (child.name === 'EyeRight') {
          eyeRightMeshRef.current = child
        }
      }

      // Find head bone for rotation
      if (child instanceof THREE.Bone) {
        if (child.name === 'Head' || child.name.includes('Head')) {
          headBoneRef.current = child
        }
      }
    })

    // Initialize next blink time
    nextBlinkTimeRef.current = performance.now() + 2000 + Math.random() * 3000
  }, [scene])

  // Animation loop
  useFrame((frameState) => {
    const time = frameState.clock.elapsedTime
    const now = performance.now()

    // --- Head Movement ---
    if (headBoneRef.current) {
      // Set target rotation based on state
      switch (state) {
        case 'idle':
          // Subtle natural movement
          targetRotationRef.current = {
            x: Math.sin(time * 0.3) * 0.02,
            y: Math.sin(time * 0.5) * 0.03,
            z: Math.sin(time * 0.4) * 0.01
          }
          break

        case 'listening':
          // Attentive tilt - leaning in slightly
          targetRotationRef.current = {
            x: 0.05 + Math.sin(time * 0.8) * 0.02, // Slight forward tilt
            y: 0.08 + Math.sin(time * 1.2) * 0.02, // Tilted to side (like listening with ear)
            z: Math.sin(time * 0.6) * 0.01
          }
          break

        case 'thinking':
          // Looking up and to the side
          targetRotationRef.current = {
            x: -0.1 + Math.sin(time * 0.4) * 0.02, // Looking up
            y: 0.15 + Math.sin(time * 0.3) * 0.03, // Looking to side
            z: 0.02
          }
          break

        case 'speaking':
          // Natural movement while speaking
          targetRotationRef.current = {
            x: Math.sin(time * 0.6) * 0.03,
            y: Math.sin(time * 0.8) * 0.04,
            z: Math.sin(time * 0.5) * 0.02
          }
          break
      }

      // Smooth interpolation to target
      const lerpFactor = 0.05
      currentRotationRef.current.x = THREE.MathUtils.lerp(
        currentRotationRef.current.x,
        targetRotationRef.current.x,
        lerpFactor
      )
      currentRotationRef.current.y = THREE.MathUtils.lerp(
        currentRotationRef.current.y,
        targetRotationRef.current.y,
        lerpFactor
      )
      currentRotationRef.current.z = THREE.MathUtils.lerp(
        currentRotationRef.current.z,
        targetRotationRef.current.z,
        lerpFactor
      )

      headBoneRef.current.rotation.x = currentRotationRef.current.x
      headBoneRef.current.rotation.y = currentRotationRef.current.y
      headBoneRef.current.rotation.z = currentRotationRef.current.z
    }

    // --- Facial Expressions (Morph Targets) ---
    if (!headMeshRef.current?.morphTargetInfluences || !headMeshRef.current.morphTargetDictionary) {
      return
    }

    const mesh = headMeshRef.current
    const dict = mesh.morphTargetDictionary!
    const influences = mesh.morphTargetInfluences!

    // --- Blinking ---
    // Check if it's time to blink
    if (now >= nextBlinkTimeRef.current && !isBlinkingRef.current) {
      isBlinkingRef.current = true
      blinkProgressRef.current = 0
      lastBlinkRef.current = now
    }

    // Process blink animation
    if (isBlinkingRef.current) {
      const blinkDuration = 150 // ms for full blink
      const elapsed = now - lastBlinkRef.current
      blinkProgressRef.current = elapsed / blinkDuration

      if (blinkProgressRef.current >= 1) {
        // Blink complete
        isBlinkingRef.current = false
        // Schedule next blink (2-6 seconds)
        nextBlinkTimeRef.current = now + 2000 + Math.random() * 4000

        // Reset eyes
        if (dict['eyesClosed'] !== undefined) {
          influences[dict['eyesClosed']] = 0
        }
        if (dict['eyeBlinkLeft'] !== undefined) {
          influences[dict['eyeBlinkLeft']] = 0
        }
        if (dict['eyeBlinkRight'] !== undefined) {
          influences[dict['eyeBlinkRight']] = 0
        }
      } else {
        // Animate blink (quick close, slower open)
        let blinkValue: number
        if (blinkProgressRef.current < 0.3) {
          // Quick close
          blinkValue = blinkProgressRef.current / 0.3
        } else {
          // Slower open
          blinkValue = 1 - ((blinkProgressRef.current - 0.3) / 0.7)
        }

        // Apply to eye morph targets
        if (dict['eyesClosed'] !== undefined) {
          influences[dict['eyesClosed']] = blinkValue
        }
        if (dict['eyeBlinkLeft'] !== undefined) {
          influences[dict['eyeBlinkLeft']] = blinkValue
        }
        if (dict['eyeBlinkRight'] !== undefined) {
          influences[dict['eyeBlinkRight']] = blinkValue
        }
      }
    }

    // --- Mouth and Expression based on state ---

    // Target values for smooth transitions
    let targetMouthOpen = 0
    let targetMouthSmile = 0
    let targetEyeLookUp = 0

    switch (state) {
      case 'idle':
        // Neutral expression
        targetMouthOpen = 0
        targetMouthSmile = 0.1 // Very slight smile
        break

      case 'listening':
        // Attentive, slight smile
        targetMouthSmile = 0.25
        break

      case 'thinking':
        // Contemplative - eyes look up
        targetEyeLookUp = 0.3
        targetMouthOpen = 0.05
        break

      case 'speaking':
        // Lip sync - use audio level if available, otherwise simulate
        const effectiveAudioLevel = audioLevel > 0
          ? audioLevel
          : (Math.sin(time * 8) * 0.5 + 0.5) * 0.7 // Simulated talking
        targetMouthOpen = effectiveAudioLevel * 0.5
        targetMouthSmile = 0.15
        break
    }

    // Apply with smooth lerp
    if (dict['mouthOpen'] !== undefined) {
      influences[dict['mouthOpen']] = THREE.MathUtils.lerp(
        influences[dict['mouthOpen']],
        targetMouthOpen,
        0.3
      )
    }

    if (dict['mouthSmile'] !== undefined) {
      influences[dict['mouthSmile']] = THREE.MathUtils.lerp(
        influences[dict['mouthSmile']],
        targetMouthSmile,
        0.1
      )
    }

    if (dict['eyesLookUp'] !== undefined) {
      influences[dict['eyesLookUp']] = THREE.MathUtils.lerp(
        influences[dict['eyesLookUp']],
        targetEyeLookUp,
        0.1
      )
    }

    // Also try viseme for more natural mouth movement when speaking
    if (state === 'speaking' && dict['viseme_aa'] !== undefined) {
      influences[dict['viseme_aa']] = THREE.MathUtils.lerp(
        influences[dict['viseme_aa']],
        audioLevel * 0.5,
        0.3
      )
    }
  })

  return (
    <primitive
      object={scene}
      scale={3}
      position={[0, -1.8, 0]}
    />
  )
}

// Loading placeholder
function AvatarSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-violet-50 rounded-full">
      <div className="w-24 h-24 rounded-full bg-violet-200 animate-pulse flex items-center justify-center">
        <span className="text-violet-400 text-xs">Loading...</span>
      </div>
    </div>
  )
}

// Error state
function AvatarError({ error }: { error: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-full">
      <div className="text-center p-4">
        <p className="text-red-500 text-xs">Avatar Error</p>
        <p className="text-red-400 text-xs mt-1">{error}</p>
      </div>
    </div>
  )
}

interface NureeAvatarProps {
  state: AvatarState
  audioLevel?: number
  personality?: PersonalityId // Which personality's avatar to show
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function NureeAvatar({
  state,
  audioLevel = 0,
  personality = 'nur',
  className,
  style,
  onClick
}: NureeAvatarProps) {
  const [error, setError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  // Get the avatar URL for the selected personality, with self-hosted fallback
  const avatarUrl = useMemo(() => {
    const config = getPersonality(personality)
    return useFallback ? config.fallbackAvatarUrl : config.avatarUrl
  }, [personality, useFallback])

  if (error) {
    return (
      <div className={className} onClick={onClick} style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}>
        <AvatarError error={error} />
      </div>
    )
  }

  return (
    <div
      className={className}
      onClick={onClick}
      style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}
    >
      <AvatarErrorBoundary
        fallback={<AvatarError error="Failed to load 3D avatar" />}
        onError={() => {
          if (!useFallback) {
            console.warn('[NureeAvatar] Remote avatar failed, switching to self-hosted fallback')
            setUseFallback(true)
          }
        }}
      >
        <Suspense fallback={<AvatarSkeleton />}>
          <Canvas
            camera={{
              position: [0, 0.1, 1.5],
              fov: 40,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance'
            }}
            style={{ background: 'transparent', width: '100%', height: '100%' }}
            onCreated={(state) => {
              // Look straight at origin where face is
              state.camera.lookAt(0, 0, 0)
            }}
            onError={(e) => {
              console.error('[NureeAvatar] Canvas error:', e)
              if (!useFallback) {
                setUseFallback(true)
              } else {
                setError('Canvas error')
              }
            }}
          >
            {/* Lighting */}
            <ambientLight intensity={1} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={0.8}
              castShadow={false}
            />
            {/* Violet accent light for brand color */}
            <pointLight
              position={[-2, 2, 3]}
              intensity={0.4}
              color="#8B5CF6"
            />
            {/* Fill light from below */}
            <pointLight
              position={[0, -2, 2]}
              intensity={0.3}
              color="#ffffff"
            />

            <AvatarModel state={state} audioLevel={audioLevel} avatarUrl={avatarUrl} />
          </Canvas>
        </Suspense>
      </AvatarErrorBoundary>
    </div>
  )
}

// Preload all personality avatars for faster switching
// This runs at module load time
if (typeof window !== 'undefined') {
  getPersonalityList().forEach(p => {
    useGLTF.preload(p.avatarUrl)
    useGLTF.preload(p.fallbackAvatarUrl)
  })
}
