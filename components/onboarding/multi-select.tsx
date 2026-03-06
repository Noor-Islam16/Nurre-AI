'use client';

import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function MultiSelect({ options, value = [], onChange, disabled = false }: MultiSelectProps) {
  const handleToggle = (option: string) => {
    if (option === 'None of the above') {
      // If "None" is selected, clear all other selections
      onChange(['None of the above']);
    } else {
      // Remove "None of the above" if other options are selected
      const newValue = value.filter(v => v !== 'None of the above');
      
      if (value.includes(option)) {
        onChange(newValue.filter(v => v !== option));
      } else {
        onChange([...newValue, option]);
      }
    }
  };
  
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleToggle(option)}
          disabled={disabled}
          className={cn(
            "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
            "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value.includes(option)
              ? "border-primary-600 bg-primary-50 text-primary-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
          )}
        >
          <div className="flex items-center">
            <div className={cn(
              "w-5 h-5 rounded border-2 mr-3 flex items-center justify-center",
              value.includes(option)
                ? "bg-primary-600 border-primary-600"
                : "bg-white border-gray-300"
            )}>
              {value.includes(option) && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">{option}</span>
          </div>
        </button>
      ))}
      
      {value.length > 0 && value[0] !== 'None of the above' && (
        <p className="text-xs text-gray-500 mt-2">
          {value.length} selected
        </p>
      )}
    </div>
  );
}