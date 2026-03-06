'use client'

import { useState, useEffect } from 'react'
import { updatePassword } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Sparkles, CheckCircle } from 'lucide-react'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  
  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setHasValidSession(true)
      } else {
        setMessage('Invalid or expired reset link. Please request a new password reset.')
        setMessageType('error')
        setHasValidSession(false)
      }
      setCheckingSession(false)
    }
    
    checkSession()
  }, [supabase])
  
  const validatePassword = () => {
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      setMessageType('error')
      return false
    }
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setMessageType('error')
      return false
    }
    
    return true
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    
    if (!validatePassword()) {
      return
    }
    
    setIsLoading(true)
    
    const result = await updatePassword(password)
    
    if (result?.success) {
      setMessage('Password updated successfully! Redirecting to login...')
      setMessageType('success')
      setPasswordUpdated(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?password_reset=true')
      }, 2000)
    } else if (result?.error) {
      setMessage(result.error)
      setMessageType('error')
    }
    
    setIsLoading(false)
  }
  
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center px-4 animate-fade-in">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-200 rounded-full opacity-20 blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="w-full max-w-md relative">
        {/* Card with enhanced design */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
          {/* Gradient top accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 animate-gradient-x"></div>
          
          <div className="p-8 space-y-8">
            {/* Header with brand icon and gradient text */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Image
                  src="/logo.png"
                  alt="NureeAI"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-secondary-500 bg-clip-text text-transparent">
                  Create New Password
                </h2>
                <p className="mt-2 text-gray-600 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 text-secondary-500" />
                  Choose a strong password for your account
                </p>
              </div>
            </div>
        
            {!passwordUpdated && hasValidSession ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">
                      New Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="text-gray-900 pl-10 h-12 border-gray-200 focus:border-secondary-400 focus:ring-secondary-400 transition-all"
                        placeholder="Enter new password (min. 6 characters)"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="text-gray-900 pl-10 h-12 border-gray-200 focus:border-secondary-400 focus:ring-secondary-400 transition-all"
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 bg-gradient-to-br from-gray-50 to-secondary-50/30 p-3 rounded-md border border-gray-100">
                  <p className="font-medium mb-1">Password Requirements:</p>
                  <ul className="space-y-1">
                    <li className={password.length >= 6 ? 'text-green-600' : ''}>
                      • At least 6 characters long
                    </li>
                    <li className={password === confirmPassword && password.length > 0 ? 'text-green-600' : ''}>
                      • Passwords must match
                    </li>
                  </ul>
                </div>
            
                {message && !passwordUpdated && (
                  <div className={`text-sm p-3 rounded-md ${
                    messageType === 'error' 
                      ? 'bg-red-50 text-red-600 border border-red-200' 
                      : 'bg-green-50 text-green-600 border border-green-200'
                  }`}>
                    {message}
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white transition-all transform hover:scale-[1.02] shadow-lg"
                  size="lg"
                >
                  {isLoading && <LoadingSpinner size="sm" className="mr-2 text-white" />}
                  {isLoading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            ) : passwordUpdated ? (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500 animate-scale-in" />
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 font-medium text-lg">Password Updated Successfully!</p>
                    <p className="text-green-600 text-sm mt-2">
                      Redirecting you to the login page...
                    </p>
                  </div>
                  <LoadingSpinner size="sm" className="mx-auto" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-red-700 font-medium">Invalid Reset Link</p>
                    <p className="text-red-600 text-sm mt-2">
                      {message || 'This password reset link is invalid or has expired.'}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push('/forgot-password')}
                      className="w-full bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white"
                    >
                      Request New Reset Link
                    </Button>
                    
                    <Button
                      onClick={() => router.push('/login')}
                      variant="outline"
                      className="w-full border-secondary-400 text-secondary-700 hover:bg-secondary-50"
                    >
                      Back to Sign In
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}