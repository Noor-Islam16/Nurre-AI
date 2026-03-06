import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  onValueChange?: (value: number[]) => void
  value?: number[]
  min?: number
  max?: number
  step?: number
  variant?: 'default' | 'seeker' | 'volume' | 'volume-dropdown'
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, onValueChange, value = [50], min = 0, max = 100, step = 1, variant = 'default', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      onValueChange?.([newValue])
    }

    // Calculate fill percentage
    const percentage = ((value[0] - min) / (max - min)) * 100

    // Generate gradient background based on variant
    const getGradientBackground = () => {
      switch (variant) {
        case 'seeker':
          // White filled, light white unfilled - for progress bar
          return `linear-gradient(to right, white 0%, white ${percentage}%, rgba(255,255,255,0.3) ${percentage}%, rgba(255,255,255,0.3) 100%)`
        case 'volume':
          // Semi-white filled, light white unfilled - for inline volume
          return `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${percentage}%, rgba(255,255,255,0.3) ${percentage}%, rgba(255,255,255,0.3) 100%)`
        case 'volume-dropdown':
          // Emerald filled, gray unfilled - for dropdown volume
          return `linear-gradient(to right, rgb(16,185,129) 0%, rgb(16,185,129) ${percentage}%, rgb(229,231,235) ${percentage}%, rgb(229,231,235) 100%)`
        default:
          return undefined
      }
    }

    const gradientBg = getGradientBackground()

    return (
      <input
        type="range"
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className={cn(
          "w-full h-2 rounded-lg appearance-none cursor-pointer",
          variant === 'default' && "bg-muted",
          className
        )}
        style={gradientBg ? { background: gradientBg } : undefined}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }