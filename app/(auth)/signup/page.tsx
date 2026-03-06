'use client'

import { useState, useEffect } from 'react'
import { signUp } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, User, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Check if user is already logged in
  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check email confirmation status
        if (!user.email_confirmed_at) {
          // Email not confirmed, redirect to confirmation page
          router.push(`/confirm-email?email=${encodeURIComponent(user.email || '')}`)
          return
        }

        const { data: coachRow } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (coachRow) {
          router.push('/coach')
          return
        }

        // Check if onboarding is already completed
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        
        if (profile?.onboarding_completed) {
          router.push('/dashboard')
        } else {
          // Email confirmed but onboarding not complete
          router.push('/onboarding/booking')
        }
      }
    }
    
    checkAuthState()
  }, [router, supabase])
  
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setEmailExists(false)

    try {
      const result = await signUp(email, password, name)
      if (result?.success) {
        router.push(`/confirm-email?email=${encodeURIComponent(email)}`)
      } else if (result?.error) {
        setMessage(result.error)
        if (result.emailExists) {
          setEmailExists(true)
        }
      }
    } catch (err) {
      console.error('[Signup] Unexpected error:', err)
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
                  Join NureeAI
                </h2>
                <p className="mt-2 text-gray-600 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 text-secondary-500" />
                  Your AI-powered second brain
                </p>
              </div>
            </div>
        
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">Name <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="text-gray-900 pl-10 h-12 border-gray-200 focus:border-secondary-400 focus:ring-secondary-400 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-gray-900 pl-10 h-12 border-gray-200 focus:border-secondary-400 focus:ring-secondary-400 transition-all"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password <span className="text-red-500">*</span></Label>
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
                      placeholder="Enter password (min. 6 characters)"
                    />
                  </div>
                </div>
              </div>
          
              {message && (
                <div className="space-y-3">
                  <div className="text-sm p-3 rounded-md bg-red-50 text-red-600 border border-red-200">
                    {message}
                  </div>
                  {emailExists && (
                    <div className="flex flex-col space-y-2">
                      <Link href="/login" className="w-full">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-secondary-400 text-secondary-700 hover:bg-secondary-50"
                        >
                          Sign in instead
                        </Button>
                      </Link>
                      <Link href="/forgot-password" className="text-center text-sm text-secondary-600 hover:text-secondary-700 hover:underline">
                        Forgot your password?
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white transition-all transform hover:scale-[1.02] shadow-lg"
                size="lg"
              >
                {isLoading && <LoadingSpinner size="sm" className="mr-2 text-white" />}
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
              
              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-secondary-600 hover:text-secondary-700 hover:underline font-medium transition-colors">
                  Sign in
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
