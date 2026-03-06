// Design tokens inline definition for Tailwind config
const tokens = {
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '3rem',     // 48px
    '2xl': '4rem',  // 64px
  },
  
  radius: {
    none: '0',
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    full: '9999px',
  },
  
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
  },
  
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    modal: 1050,
    popover: 1100,
    toast: 1150,
    tooltip: 1200,
  },
  
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  container: {
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
  },
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Safelist for dynamic personality-based gradient classes
  safelist: [
    'from-gray-50',
    'via-violet-50/40',
    'to-fuchsia-50/20',
    'via-emerald-50/40',
    'to-amber-50/20',
    'via-blue-50/40',
    'to-cyan-50/20',
  ],
  theme: {
    extend: {
      // Design Tokens Integration
      spacing: tokens.spacing,
      borderRadius: tokens.radius,
      transitionDuration: tokens.duration,
      fontSize: tokens.fontSize,
      boxShadow: tokens.shadow,
      zIndex: tokens.zIndex,
      transitionTimingFunction: tokens.easing,
      maxWidth: tokens.container,
      
      // Animations
      animation: {
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-gold': 'shimmer-gold 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'music-bar-1': 'music-bar-1 0.8s ease-in-out infinite',
        'music-bar-2': 'music-bar-2 0.8s ease-in-out infinite',
        'music-bar-3': 'music-bar-3 0.8s ease-in-out infinite',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-position': '0% 50%',
            'background-size': '200% 200%',
          },
          '50%': {
            'background-position': '100% 50%',
            'background-size': '200% 200%',
          }
        },
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          }
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(10px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          }
        },
        'shimmer': {
          '0%': {
            'background-position': '-200% center',
          },
          '100%': {
            'background-position': '200% center',
          }
        },
        'shimmer-gold': {
          '0%': {
            'background-position': '-200% center',
          },
          '100%': {
            'background-position': '200% center',
          }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'music-bar-1': {
          '0%, 100%': { height: '40%' },
          '50%': { height: '80%' },
        },
        'music-bar-2': {
          '0%, 100%': { height: '70%' },
          '50%': { height: '100%' },
        },
        'music-bar-3': {
          '0%, 100%': { height: '50%' },
          '50%': { height: '85%' },
        },
      },
      
      colors: {
        // CSS Variable mapping for shadcn/ui
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Navy color scale
          50: '#f0f3f7',
          100: '#dce3ec',
          200: '#bcc7d9',
          300: '#94a3b8',
          400: '#6b7a8f',
          500: '#4a5568',
          600: '#3E4C5E',
          700: '#303951', // Main navy color
          800: '#1e2530',
          900: '#141820',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          // Purple color scale
          50: '#f3f1fc',
          100: '#e7e2f8',
          200: '#d0c9f2',
          300: '#b9abeb',
          400: '#9580d4',
          500: '#7d67ca', // Main purple color
          600: '#6b5db8',
          700: '#5a4ba3',
          800: '#483a85',
          900: '#362a65',
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Keep legacy colors for compatibility
        navy: {
          DEFAULT: '#303951',
          dark: '#1f2937',
          light: '#4a5568',
          50: '#f0f3f7',
          100: '#dce3ec',
          200: '#bcc7d9',
          300: '#94a3b8',
          400: '#6b7a8f',
          500: '#4a5568',
          600: '#3E4C5E',
          700: '#2B3544',
          800: '#1e2530',
          900: '#141820',
        },
        // Semantic Colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981', // Main success green
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Main danger red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B', // Main warning amber
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F'
        },
        // Keep amber for backwards compatibility
        amber: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F'
        },
        // Coral color palette for voice widget
        coral: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d'
        },
        // Modern widget accent colors - subtle and sophisticated
        'widget-ai': {
          DEFAULT: 'rgb(147, 51, 234)', // purple-600
          light: 'rgb(196, 181, 253)', // purple-300
          dark: 'rgb(124, 58, 237)', // purple-700
        },
        'widget-tasks': {
          DEFAULT: 'rgb(59, 130, 246)', // blue-500
          light: 'rgb(147, 197, 253)', // blue-300
          dark: 'rgb(37, 99, 235)', // blue-600
        },
        'widget-focus': {
          DEFAULT: 'rgb(16, 185, 129)', // emerald-500
          light: 'rgb(110, 231, 183)', // emerald-300
          dark: 'rgb(5, 150, 105)', // emerald-600
        },
        'widget-rewards': {
          DEFAULT: 'rgb(245, 158, 11)', // amber-500
          light: 'rgb(252, 211, 77)', // amber-300
          dark: 'rgb(217, 119, 6)', // amber-600
        },
        'widget-voice': {
          DEFAULT: 'rgb(244, 114, 182)', // rose-400
          light: 'rgb(251, 207, 232)', // rose-200
          dark: 'rgb(236, 72, 153)', // rose-500
        },
      },

      // Height utilities for widgets
      height: {
        'widget': '8rem',
        'widget-lg': '12rem',
        'ai-section': '70vh',
      },

      // Modern subtle background gradients - minimalistic
      backgroundImage: {
        'gradient-subtle-purple': 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
        'gradient-subtle-blue': 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
        'gradient-subtle-emerald': 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
        'gradient-subtle-amber': 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
        'gradient-subtle-rose': 'linear-gradient(135deg, rgba(244, 114, 182, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
      }
    },
  },
  plugins: [],
}