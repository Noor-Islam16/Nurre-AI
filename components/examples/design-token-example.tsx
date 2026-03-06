/**
 * Design Token Usage Example
 * 
 * This component demonstrates how to use the design tokens system
 * in NureeAI components. Remove this file after the system is adopted.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DesignTokenExample() {
  return (
    <div className="max-w-2xl mx-auto p-lg space-y-lg">
      {/* Spacing tokens example */}
      <Card className="rounded-lg shadow-md">
        <CardHeader className="pb-md">
          <CardTitle className="text-2xl">Design Tokens Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          
          {/* Spacing scale demonstration */}
          <div className="space-y-sm">
            <h3 className="text-lg font-medium">Spacing Scale</h3>
            <div className="space-y-xs">
              <div className="bg-primary-100 p-xs rounded-sm">xs: 8px padding</div>
              <div className="bg-primary-100 p-sm rounded-sm">sm: 16px padding</div>
              <div className="bg-primary-100 p-md rounded-md">md: 24px padding</div>
              <div className="bg-primary-100 p-lg rounded-lg">lg: 32px padding</div>
            </div>
          </div>
          
          {/* Border radius demonstration */}
          <div className="space-y-sm">
            <h3 className="text-lg font-medium">Border Radius</h3>
            <div className="flex gap-sm flex-wrap">
              <div className="bg-secondary-100 p-sm rounded-none">none</div>
              <div className="bg-secondary-100 p-sm rounded-sm">sm (4px)</div>
              <div className="bg-secondary-100 p-sm rounded-md">md (8px)</div>
              <div className="bg-secondary-100 p-sm rounded-lg">lg (12px)</div>
              <div className="bg-secondary-100 p-sm rounded-xl">xl (16px)</div>
              <div className="bg-secondary-100 px-md py-sm rounded-full">full</div>
            </div>
          </div>
          
          {/* Typography scale */}
          <div className="space-y-sm">
            <h3 className="text-lg font-medium">Typography Scale</h3>
            <div className="space-y-xs">
              <p className="text-xs">Extra small text (12px)</p>
              <p className="text-sm">Small text (14px)</p>
              <p className="text-base">Base text (16px)</p>
              <p className="text-lg">Large text (18px)</p>
              <p className="text-xl">Extra large (20px)</p>
              <p className="text-2xl">2XL heading (24px)</p>
            </div>
          </div>
          
          {/* Shadow demonstration */}
          <div className="space-y-sm">
            <h3 className="text-lg font-medium">Shadows</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
              <div className="bg-white p-sm rounded-md shadow-sm text-center">Small</div>
              <div className="bg-white p-sm rounded-md shadow-md text-center">Medium</div>
              <div className="bg-white p-sm rounded-md shadow-lg text-center">Large</div>
              <div className="bg-white p-sm rounded-md shadow-xl text-center">XL</div>
            </div>
          </div>
          
          {/* Animation durations */}
          <div className="space-y-sm">
            <h3 className="text-lg font-medium">Animation Durations</h3>
            <div className="flex gap-sm flex-wrap">
              <Button 
                variant="outline" 
                className="duration-fast hover:scale-105 transition-transform"
              >
                Fast (150ms)
              </Button>
              <Button 
                variant="outline" 
                className="duration-normal hover:scale-105 transition-transform"
              >
                Normal (250ms)
              </Button>
              <Button 
                variant="outline" 
                className="duration-slow hover:scale-105 transition-transform"
              >
                Slow (350ms)
              </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>
    </div>
  )
}