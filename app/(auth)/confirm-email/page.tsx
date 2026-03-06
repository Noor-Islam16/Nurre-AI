'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, CheckCircle, AlertCircle, HelpCircle, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineLoadingDots } from '@/components/ui/loading-dots'

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendSuccess, setResendSuccess] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [resendCount, setResendCount] = useState(0)
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null)
  const supabase = createClient()

  // Check if already confirmed with smart polling
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    const checkEmailConfirmation = async () => {
      // Only check if page is visible
      if (document.hidden) return
      
      setCheckingStatus(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email_confirmed_at) {
        // Email already confirmed, redirect to onboarding or dashboard
        const { data: coachRow } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (coachRow) {
          window.location.href = '/coach'
          return
        }

        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        
        if (profile?.onboarding_completed) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/onboarding/booking'
        }
      }
      setCheckingStatus(false)
    }

    // Initial check
    checkEmailConfirmation()
    
    // Start polling when page is visible
    const startPolling = () => {
      if (!interval && !document.hidden) {
        // Check immediately when becoming visible
        checkEmailConfirmation()
        // Then poll every 3 seconds (more frequent when visible)
        interval = setInterval(checkEmailConfirmation, 3000)
      }
    }
    
    // Stop polling when page is hidden
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }
    
    // Handle focus/blur
    const handleFocus = () => startPolling()
    const handleBlur = () => stopPolling()
    
    // Start initial polling
    startPolling()
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [supabase])

  const handleResendEmail = async () => {
    if (!email) {
      setResendMessage('No email address provided')
      return
    }
    
    // Rate limiting check
    if (lastResendTime) {
      const timeSinceLastResend = Date.now() - lastResendTime.getTime()
      if (timeSinceLastResend < 60000) { // 1 minute cooldown
        const secondsLeft = Math.ceil((60000 - timeSinceLastResend) / 1000)
        setResendMessage(`Please wait ${secondsLeft} seconds before resending`)
        setResendSuccess(false)
        return
      }
    }

    setIsResending(true)
    setResendMessage('')
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        setResendMessage(error.message)
        setResendSuccess(false)
      } else {
        setResendCount(resendCount + 1)
        setLastResendTime(new Date())
        setResendMessage('Confirmation email sent! Please check your inbox and spam folder.')
        setResendSuccess(true)
      }
    } catch (error) {
      setResendMessage('Failed to resend email. Please try again.')
      setResendSuccess(false)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-slate-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h2>
          
          {checkingStatus && (
            <div className="text-xs text-gray-700 flex items-center justify-center gap-1">
              <InlineLoadingDots />
              Checking confirmation status...
            </div>
          )}
          
          <p className="text-gray-700 mb-6">
            We&apos;ve sent a confirmation email to:
          </p>
          
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="font-medium text-slate-800">
              {email || 'your email address'}
            </p>
          </div>
          
          <div className="space-y-4 text-left bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Important: Confirm Your Email First
            </h3>
            <p className="text-sm text-blue-800">
              You must confirm your email before you can complete the onboarding process. 
              This ensures your progress is saved properly.
            </p>
          </div>
          
          <div className="space-y-3 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Click the confirmation link in the email</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>You&apos;ll be redirected to complete your personalization</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Your progress will be saved automatically</span>
            </p>
          </div>
        </div>
        
        <div className="border-t pt-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-3">
              Didn&apos;t receive the email?
            </p>
            
            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full bg-primary-700 hover:bg-primary-800 text-white transition-colors"
              size="lg"
            >
              {isResending ? 'Sending...' : 'Resend Confirmation Email'}
            </Button>
            
            {resendMessage && (
              <div className={`mt-3 p-2 rounded-md text-sm ${
                resendSuccess 
                  ? 'bg-green-50 text-green-600 border border-green-200' 
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {resendMessage}
              </div>
            )}
            
            {resendCount > 2 && (
              <div className="mt-2 text-xs text-gray-700 text-center">
                Sent {resendCount} times. Make sure to check spam folder.
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-700 space-y-2">
              <p>
                Still having trouble? Check your spam folder
              </p>
              <p>
                or{' '}
                <a href="/login" className="text-slate-700 hover:text-slate-800 hover:underline font-medium">
                  try logging in
                </a>
              </p>
            </div>
            
            <details className="border-t pt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Need help? Common issues and solutions
              </summary>
              
              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email not arriving?
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Check your spam/junk folder</li>
                    <li>• Add noreply@nureeai.com to your contacts</li>
                    <li>• Wait 2-3 minutes for delivery</li>
                    <li>• Check if you typed your email correctly</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Link expired or not working?
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Links expire after 24 hours</li>
                    <li>• Click &quot;Resend Confirmation Email&quot; for a new link</li>
                    <li>• Make sure you&apos;re using the latest email</li>
                    <li>• Try copying and pasting the link directly</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Already clicked the link?
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• This page auto-checks every 3 seconds when visible</li>
                    <li>• You&apos;ll be redirected automatically once confirmed</li>
                    <li>• Try refreshing this page</li>
                    <li>• Or go directly to <a href="/login" className="text-slate-700 hover:underline">login</a></li>
                  </ul>
                </div>
                
                <div className="text-center pt-2 border-t">
                  <p className="text-xs text-gray-700">
                    Still need help? Contact{' '}
                    <a href="mailto:support@nureeai.com" className="text-slate-700 hover:underline">
                      support@nureeai.com
                    </a>
                  </p>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
