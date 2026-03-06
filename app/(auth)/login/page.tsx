'use client'

import { useState, useEffect } from 'react'
import { signIn, signInWithMagicLink } from '@/lib/auth/actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, Sparkles } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('error')
  const [showResendEmail, setShowResendEmail] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Check for URL parameters and set messages
  useEffect(() => {
    const error = searchParams.get('error')
    const emailConfirmed = searchParams.get('email_confirmed')
    
    if (error === 'auth_callback_error') {
      setMessage('There was an error confirming your email. Please try again.')
      setMessageType('error')
    } else if (emailConfirmed === 'true') {
      setMessage('Email confirmed successfully! You can now sign in.')
      setMessageType('success')
    }
    
    // Check for the email_just_confirmed cookie
    if (document.cookie.includes('email_just_confirmed=true')) {
      setMessage('Email confirmed! Please sign in to continue.')
      setMessageType('success')
    }
  }, [searchParams])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setShowResendEmail(false)

    try {
      if (useMagicLink) {
        const result = await signInWithMagicLink(email)
        if (result?.success) {
          setMessage('Check your email for the magic link!')
          setMessageType('success')
        } else if (result?.error) {
          setMessage(result.error)
          setMessageType('error')
        }
      } else {
        const result = await signIn(email, password)
        if (result?.error) {
          setMessage(result.error)
          setMessageType('error')

          // Check if the error is due to unconfirmed email
          if (result.error.includes('Email not confirmed') ||
              result.error.includes('confirm your email')) {
            setShowResendEmail(true)
          }
        }
      }
    } catch (err) {
      console.error('[Login] Unexpected error:', err)
      setMessage('Something went wrong. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleResendEmail = async () => {
    setResendLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      if (error) {
        setMessage('Failed to resend confirmation email. Please try again.')
        setMessageType('error')
      } else {
        setMessage('Confirmation email sent! Please check your inbox and spam folder.')
        setMessageType('success')
        setShowResendEmail(false)
      }
    } catch (err) {
      setMessage('An error occurred. Please try again.')
      setMessageType('error')
    }
    
    setResendLoading(false)
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
                  Welcome back to NureeAI
                </h2>
                <p className="mt-2 text-gray-600 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 text-secondary-500" />
                  Your AI-powered second brain
                </p>
              </div>
            </div>
        
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-gray-900 pl-10 h-12 border-gray-200 focus:border-secondary-400 focus:ring-secondary-400 transition-all"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                {!useMagicLink && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                      <Link href="/forgot-password" className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="text-gray-900 pl-10 h-12 border-gray-200 focus:border-secondary-400 focus:ring-secondary-400 transition-all"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>
                )}
              </div>
          
          {message && (
            <div className={`text-sm p-3 rounded-md ${
              messageType === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 
              messageType === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 
              'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              {message}
            </div>
          )}
          
          {showResendEmail && (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">
                Haven&apos;t received the confirmation email?
              </div>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendLoading || !email}
                className="w-full rounded-md bg-white border border-gray-300 px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
              </button>
              <div className="text-xs text-gray-700">
                Make sure to check your spam folder
              </div>
            </div>
          )}
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white transition-all transform hover:scale-[1.02] shadow-lg"
            size="lg"
          >
            {isLoading && <LoadingSpinner size="sm" className="mr-2 text-white" />}
            {isLoading ? 'Processing...' : useMagicLink ? 'Send Magic Link' : 'Sign In'}
          </Button>
          
          <div className="text-center text-sm">
            <Button
              type="button"
              onClick={() => setUseMagicLink(!useMagicLink)}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-secondary-500 hover:bg-secondary-50 transition-all font-medium group"
            >
              {useMagicLink ? (
                <>
                  <Lock className="w-4 h-4 mr-1 group-hover:text-secondary-500" />
                  Use password instead
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-1 group-hover:text-secondary-500" />
                  Use magic link instead
                </>
              )}
            </Button>
          </div>
          
              <div className="space-y-3">
                <div className="text-center text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-secondary-600 hover:text-secondary-700 hover:underline font-medium transition-colors">
                    Sign up
                  </Link>
                </div>
                
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800 text-center transition-colors">
                    Having trouble signing in?
                  </summary>
                  <div className="mt-2 space-y-2 p-3 bg-gradient-to-br from-gray-50 to-secondary-50/30 rounded-md border border-gray-100">
                    <p>• Check that your email is spelled correctly</p>
                    <p>• Make sure you&apos;ve confirmed your email address</p>
                    <p>• Check your spam folder for confirmation emails</p>
                    <p>• Try using the magic link option instead</p>
                    <p>• Clear your browser cookies and try again</p>
                    <p className="pt-2 text-secondary-600">Still need help? Contact support@nureeai.com</p>
                  </div>
                </details>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}