'use client';

import { cn } from '@/lib/utils';

interface FrequencyScaleProps {
  options: string[];
  values?: (number | string)[];
  value?: number | string;
  onChange: (value: number | string) => void;
  disabled?: boolean;
}

export function FrequencyScale({ 
  options, 
  values, 
  value, 
  onChange, 
  disabled = false 
}: FrequencyScaleProps) {
  return (
    <div className="space-y-2">
      {options.map((option, idx) => {
        const optionValue = values ? values[idx] : option;
        const isSelected = value === optionValue;
        
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(optionValue)}
            disabled={disabled}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSelected
                ? "border-primary-600 bg-primary-50 text-primary-900 font-medium"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            )}
          >
            <div className="flex items-center">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 mr-3",
                isSelected
                  ? "border-primary-600 bg-primary-600 ring-2 ring-primary-200"
                  : "border-gray-300 bg-white"
              )}>
                {isSelected && (
                  <div className="w-full h-full rounded-full bg-white scale-50" />
                )}
              </div>
              <span className="text-sm">{option}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}