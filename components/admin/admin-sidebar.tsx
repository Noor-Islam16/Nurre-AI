'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Shield,
  Brain,
  Settings,
  FileText,
  AlertCircle,
  Trash2,
  Home,
  ChevronLeft
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Moderation', href: '/admin/moderation', icon: Shield },
  { name: 'Assessments', href: '/admin/assessments', icon: Brain },
  { name: 'System', href: '/admin/system', icon: Settings },
  { name: 'Privacy', href: '/admin/privacy', icon: FileText },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex w-64 flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
          {/* Logo/Title */}
          <div className="flex h-16 flex-shrink-0 items-center px-4 border-b">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-notext.png"
                alt="NureeAI Admin"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
              <span className="text-lg font-semibold">Admin Console</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                             (item.href !== '/admin' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                      isActive
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="flex flex-shrink-0 border-t p-4">
            <Link
              href="/dashboard"
              className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="mr-3 h-5 w-5 flex-shrink-0" />
              Back to App
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}