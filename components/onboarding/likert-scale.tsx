'use client';

import { cn } from '@/lib/utils';

interface LikertScaleProps {
  value?: number;
  onChange: (value: number) => void;
  labels?: string[];
  disabled?: boolean;
}

const defaultLabels = [
  'Strongly disagree',
  'Disagree',
  'Neither agree nor disagree',
  'Agree',
  'Strongly agree'
];

export function LikertScale({ 
  value, 
  onChange, 
  labels = defaultLabels,
  disabled = false 
}: LikertScaleProps) {
  const scales = [1, 2, 3, 4, 5];
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        {scales.map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => onChange(scale)}
            disabled={disabled}
            className={cn(
              "flex-1 min-w-0 py-3 px-2 text-sm font-medium rounded-lg transition-all",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              value === scale
                ? "bg-primary-600 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="text-lg font-bold mb-1">{scale}</div>
            <div className="text-xs leading-tight hidden sm:block">
              {labels[scale - 1]}
            </div>
          </button>
        ))}
      </div>
      
      {/* Mobile-friendly labels */}
      <div className="sm:hidden text-center">
        {value && (
          <span className="text-sm text-gray-600">
            {labels[value - 1]}
          </span>
        )}
      </div>
    </div>
  );
}