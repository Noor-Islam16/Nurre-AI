'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Search,
  Filter,
  ExternalLink,
  UserX,
  Download,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserTableProps {
  users: Array<{
    id: string
    email: string
    name: string | null
    adhd_persona: string | null
    adhd_presentation: string | null
    onboarding_completed: boolean
    onboarding_version: number | null
    created_at: string
    current_streak: number
    inatt_severity: number | null
    hyper_severity: number | null
    last_active?: string
    total_tasks?: number
    completed_tasks?: number
    total_focus_sessions?: number
    has_restriction?: boolean
  }>
}

export function UserTable({ users: initialUsers }: UserTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'onboarded' | 'pending' | 'restricted'>('all')
  const [presentationFilter, setPresentationFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  // Filter users
  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery && !user.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !user.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Type filter
    if (filterType === 'onboarded' && !user.onboarding_completed) return false
    if (filterType === 'pending' && user.onboarding_completed) return false
    if (filterType === 'restricted' && !user.has_restriction) return false

    // Presentation filter
    if (presentationFilter !== 'all' && user.adhd_presentation !== presentationFilter) return false

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        <Select value={filterType} onValueChange={(value: any) => {
          setFilterType(value)
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="onboarded">Onboarded</SelectItem>
            <SelectItem value="pending">Pending Onboarding</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={presentationFilter} onValueChange={(value) => {
          setPresentationFilter(value)
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ADHD Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
            <SelectItem value="inattentive">Inattentive</SelectItem>
            <SelectItem value="hyperactive">Hyperactive</SelectItem>
            <SelectItem value="borderline">Borderline</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ADHD Profile</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {user.onboarding_completed ? (
                      <Badge variant="default" className="w-fit">Onboarded</Badge>
                    ) : (
                      <Badge variant="secondary" className="w-fit">Pending</Badge>
                    )}
                    {user.has_restriction && (
                      <Badge variant="destructive" className="w-fit">
                        <Shield className="h-3 w-3 mr-1" />
                        Restricted
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.adhd_presentation ? (
                    <div>
                      <Badge variant="outline" className="capitalize">
                        {user.adhd_presentation}
                      </Badge>
                      {user.inatt_severity !== null && (
                        <div className="text-xs text-muted-foreground mt-1">
                          I: {user.inatt_severity}% H: {user.hyper_severity}%
                        </div>
                      )}
                    </div>
                  ) : user.adhd_persona ? (
                    <Badge variant="secondary" className="capitalize">
                      {user.adhd_persona} (v1)
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not set</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {user.last_active ? (
                      <>
                        <div>
                          {formatDistanceToNow(new Date(user.last_active), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.total_tasks} tasks • {user.total_focus_sessions} sessions
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Never active</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <UserX className="mr-2 h-4 w-4" />
                        Suspend User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}