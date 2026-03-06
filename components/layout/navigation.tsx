'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, CheckSquare, Clock,
  MessageCircle, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Shield, Wind, User
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth/actions'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@/lib/auth/client'
import { useIsAdmin } from '@/lib/auth/hooks'
import { useTimerStore } from '@/store/timer-store'
import { useMusicPlayer } from '@/components/music/Player'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/planner', label: 'Tasks', icon: CheckSquare },
  { href: '/focus', label: 'Focus', icon: Clock },
  { href: '/calm', label: 'Calm', icon: Wind },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const { user } = useUser()
  const { isAdmin } = useIsAdmin()
  const isRunning = useTimerStore((state) => state.isRunning)
  const { currentTrack } = useMusicPlayer()

  // Calculate banner padding to avoid overlap with sticky banners
  // Focus timer banner shows when running; music banner only shows when focus is NOT running
  const hasFocusBanner = isRunning
  const hasMusicBanner = currentTrack !== null && !isRunning
  const bannerPadding = hasFocusBanner && currentTrack ? 'pt-24' : (hasFocusBanner || hasMusicBanner) ? 'pt-14' : 'pt-0'
  
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('nav-collapsed')
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState))
    }
  }, [])
  
  // Save collapsed state to localStorage when it changes
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('nav-collapsed', JSON.stringify(newState))
    window.dispatchEvent(new CustomEvent('nav-collapsed-changed', { detail: newState }))
  }
  
  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }
  
  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav
        className="hidden md:flex fixed left-0 top-0 h-full bg-white border-r shadow-sm z-30"
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className={cn("flex flex-col w-full transition-all duration-300", bannerPadding)}>
          {/* Logo */}
          <div className="p-6 border-b">
            <Link href="/dashboard" className="flex items-center">
              <AnimatePresence mode="wait">
                {isCollapsed ? (
                  <motion.div
                    key="logo-icon"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <Image
                      src="/logo-notext.png"
                      alt="NureeAI"
                      width={40}
                      height={40}
                      className="object-contain"
                      priority
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="logo-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center"
                  >
                    <Image
                      src="/logo-horizontal.png"
                      alt="NureeAI"
                      width={160}
                      height={40}
                      className="object-contain"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>
          
          {/* Navigation Items */}
          <div className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <li key={item.href}>
                    <div className="relative group">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center px-4 py-3 rounded-lg transition-all",
                          isActive
                            ? "bg-secondary-500 text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100",
                          isCollapsed ? "justify-center" : "space-x-3"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span 
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                              className="font-medium overflow-hidden whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                      
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          
          {/* Bottom Actions */}
          <div className="p-4 border-t space-y-2">
            {/* Admin Console Link - Only visible to admins */}
            {isAdmin && (
              <div className="relative group">
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors",
                    isCollapsed ? "justify-center" : "space-x-3"
                  )}
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium overflow-hidden whitespace-nowrap"
                      >
                        Admin Console
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Admin Console
                  </div>
                )}
              </div>
            )}

            <div className="relative group">
              <Link
                href="/profile"
                className={cn(
                  "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors",
                  isCollapsed ? "justify-center" : "space-x-3"
                )}
              >
                <User className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium overflow-hidden whitespace-nowrap"
                    >
                      My Profile
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  My Profile
                </div>
              )}
            </div>

            <div className="relative group">
              <Link
                href="/settings"
                className={cn(
                  "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors",
                  isCollapsed ? "justify-center" : "space-x-3"
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium overflow-hidden whitespace-nowrap"
                    >
                      Settings
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Settings
                </div>
              )}
            </div>
            
            {user && (
              <div className="relative group">
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors",
                    isCollapsed ? "justify-center" : "space-x-3"
                  )}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium overflow-hidden whitespace-nowrap"
                      >
                        Sign Out
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Sign Out
                  </div>
                )}
              </div>
            )}
            
            {/* Collapse Toggle Button */}
            <button
              onClick={toggleCollapsed}
              className="w-full flex items-center justify-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mt-4 border-t pt-4"
              aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>
      
      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile Header - pushed down when banners are active */}
        <header className={cn(
          "fixed left-0 right-0 bg-white border-b shadow-sm z-40 transition-all duration-300",
          hasFocusBanner && currentTrack ? "top-24" : (hasFocusBanner || hasMusicBanner) ? "top-14" : "top-0"
        )}>
          <div className="flex items-center justify-between p-4">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/logo-horizontal.png"
                alt="NureeAI"
                width={120}
                height={30}
                className="object-contain"
                priority
              />
            </Link>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </header>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed inset-0 bg-white z-30 pt-16"
            >
              <div className="p-4">
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                            isActive
                              ? "bg-secondary-500 text-white shadow-md"
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                
                <div className="mt-8 pt-8 border-t">
                  {/* Admin Console Link for Mobile - Only visible to admins */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">Admin Console</span>
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">My Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                  </Link>
                  {user && (
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
