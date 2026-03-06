'use client'

import * as React from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

type FilterType = 'today' | 'upcoming' | 'all' | 'completed'
type SortType = 'priority' | 'time' | 'recent'

interface TaskFiltersProps {
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  sort: SortType
  onSortChange: (sort: SortType) => void
  search: string
  onSearchChange: (search: string) => void
  className?: string
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Done' },
]

const SORTS: { value: SortType; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'time', label: 'Time' },
  { value: 'recent', label: 'Recent' },
]

export function TaskFilters({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  className
}: TaskFiltersProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-3", className)}>
      {/* Filter Tabs */}
      <div className="flex gap-0.5 p-1 bg-gray-100 rounded-lg flex-shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              filter === f.value
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Sort Dropdown */}
      <div className="relative flex-shrink-0">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortType)}
          className={cn(
            "h-9 px-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white",
            "text-gray-700 font-medium appearance-none cursor-pointer",
            "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          )}
        >
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}
