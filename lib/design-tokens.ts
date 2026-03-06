/**
 * Design Tokens System for NureeAI
 * 
 * Centralized design tokens to ensure consistency across the application.
 * These tokens serve as the single source of truth for spacing, typography,
 * colors, and other design decisions.
 */

export const tokens = {
  // Spacing Scale (based on 4px grid system)
  spacing: {
    xs: '0.5rem',   // 8px - tight spacing for close elements
    sm: '1rem',     // 16px - default component spacing
    md: '1.5rem',   // 24px - section spacing
    lg: '2rem',     // 32px - large section gaps
    xl: '3rem',     // 48px - major layout spacing
    '2xl': '4rem',  // 64px - page-level spacing
  },
  
  // Border Radius tokens
  radius: {
    none: '0',
    sm: '0.25rem',  // 4px - subtle rounding
    md: '0.5rem',   // 8px - default component rounding
    lg: '0.75rem',  // 12px - prominent components
    xl: '1rem',     // 16px - large cards/modals
    full: '9999px', // fully rounded (pills/avatars)
  },
  
  // Animation Duration tokens
  duration: {
    instant: '0ms',    // no animation
    fast: '150ms',     // quick micro-interactions
    normal: '250ms',   // default animation speed
    slow: '350ms',     // deliberate animations
    slower: '500ms',   // emphasis animations
  },
  
  // Typography Scale with line heights
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px - captions, labels
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px - body text, descriptions
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px - default body text
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px - emphasized text
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px - small headings
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px - section headings
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px - page headings
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px - hero headings
  },
  
  // Box Shadow tokens
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',           // subtle shadow
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',         // default card shadow
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',       // elevated components
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',       // modals, dropdowns
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',  // pressed/inset state
  },
  
  // Z-index Scale for layering
  zIndex: {
    hide: -1,          // hidden behind content
    base: 0,           // default layer
    dropdown: 1000,    // dropdowns, selects
    sticky: 1020,      // sticky headers
    modal: 1050,       // modal overlays
    popover: 1100,     // popovers, tooltips
    toast: 1150,       // notifications, toasts
    tooltip: 1200,     // tooltips (highest priority)
  },
  
  // Animation Easing curves
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Container/Layout tokens
  container: {
    xs: '20rem',     // 320px - mobile
    sm: '24rem',     // 384px - small mobile
    md: '28rem',     // 448px - tablet
    lg: '32rem',     // 512px - small desktop
    xl: '36rem',     // 576px - desktop
    '2xl': '42rem',  // 672px - large desktop
    '3xl': '48rem',  // 768px - wide screens
    '4xl': '56rem',  // 896px - very wide
    '5xl': '64rem',  // 1024px - ultra wide
  },
  
  // Focus ring tokens (for accessibility)
  focus: {
    ring: '2px solid rgb(59 130 246 / 0.5)', // blue focus ring
    offset: '2px',                            // focus ring offset
  },
} as const

// Type definitions for TypeScript support
export type SpacingToken = keyof typeof tokens.spacing
export type RadiusToken = keyof typeof tokens.radius
export type DurationToken = keyof typeof tokens.duration
export type FontSizeToken = keyof typeof tokens.fontSize
export type ShadowToken = keyof typeof tokens.shadow
export type ZIndexToken = keyof typeof tokens.zIndex
export type EasingToken = keyof typeof tokens.easing
export type ContainerToken = keyof typeof tokens.container

// Helper functions for token usage
export const getToken = {
  spacing: (key: SpacingToken) => tokens.spacing[key],
  radius: (key: RadiusToken) => tokens.radius[key],
  duration: (key: DurationToken) => tokens.duration[key],
  shadow: (key: ShadowToken) => tokens.shadow[key],
  zIndex: (key: ZIndexToken) => tokens.zIndex[key],
  easing: (key: EasingToken) => tokens.easing[key],
  container: (key: ContainerToken) => tokens.container[key],
} as const