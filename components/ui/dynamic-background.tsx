'use client'

import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'

/**
 * DynamicBackground Component
 *
 * Renders a fixed-position gradient layer behind all content.
 * Subtle color tints that change based on selected coach:
 * - Nur: Warm violet/fuchsia tint
 * - Farin: Earthy green/amber tint
 * - Zak: Cool blue/cyan tint
 */
export function DynamicBackground() {
  const profile = useUserStore(state => state.profile)
  const selectedPersonalityId = (profile?.selected_personality as PersonalityId) || 'nur'
  const personality = getPersonality(selectedPersonalityId)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        background: personality.gradientStyle,
        pointerEvents: 'none',
      }}
    />
  )
}
