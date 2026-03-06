"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DomainFilter = 'all' | 'attention' | 'mood' | 'anxiety' | 'stress'
export type SortOption = 'recommended' | 'shortest' | 'most_used' | 'a_to_z'

interface FilterBarProps {
  domain: DomainFilter
  onDomainChange: (domain: DomainFilter) => void
  search: string
  onSearchChange: (search: string) => void
  sort: SortOption
  onSortChange: (sort: SortOption) => void
}

export function FilterBar({
  domain,
  onDomainChange,
  search,
  onSearchChange,
  sort,
  onSortChange
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(search)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, onSearchChange])

  // Sync external search changes
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const domains: Array<{ value: DomainFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'attention', label: 'Attention' },
    { value: 'mood', label: 'Mood' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'stress', label: 'Stress' },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Segmented Domain Filter */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg flex-wrap sm:flex-nowrap">
        {domains.map((d) => (
          <button
            key={d.value}
            onClick={() => onDomainChange(d.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              'hover:bg-gray-200',
              domain === d.value
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-700'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search assessments..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <Select value={sort} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="shortest">Shortest</SelectItem>
              <SelectItem value="most_used">Most used</SelectItem>
              <SelectItem value="a_to_z">A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
