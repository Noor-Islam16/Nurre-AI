'use client'

import { useState } from 'react'
import { resetPasswordForEmail } from '@/lib/auth/actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Sparkles, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')
  const [emailSent, setEmailSent] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    const result = await resetPasswordForEmail(email)
    
    if (result?.success) {
      setMessage('Check your email for the password reset link. It may take a few minutes to arrive.')
      setMessageType('success')
      setEmailSent(true)
    } else if (result?.error) {
      setMessage(result.error)
      setMessageType('error')
      
      // Check for rate limit error
      if (result.error.toLowerCase().includes('rate') || result.error.toLowerCase().includes('limit')) {
        setMessage('You can only request 2 password reset emails per hour. Please wait before trying again.')
      }
    }
    
    setIsLoading(false)
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
                  Reset Your Password
                </h2>
                <p className="mt-2 text-gray-600 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 text-secondary-500" />
                  We&apos;ll send you a reset link via email
                </p>
              </div>
            </div>
        
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
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
                </div>
            
                {message && (
                  <div className={`text-sm p-3 rounded-md ${
                    messageType === 'error' 
                      ? 'bg-red-50 text-red-600 border border-red-200' 
                      : 'bg-green-50 text-green-600 border border-green-200'
                  }`}>
                    {message}
                  </div>
                )}
                
                <div className="text-xs text-gray-600 bg-gradient-to-br from-gray-50 to-secondary-50/30 p-3 rounded-md border border-gray-100">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="space-y-1">
                    <li>• Check your spam folder if you don&apos;t see the email</li>
                    <li>• You can request up to 2 reset emails per hour</li>
                    <li>• The reset link expires after 1 hour</li>
                    <li>• Use the same browser/device for security</li>
                  </ul>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white transition-all transform hover:scale-[1.02] shadow-lg"
                  size="lg"
                >
                  {isLoading && <LoadingSpinner size="sm" className="mr-2 text-white" />}
                  {isLoading ? 'Sending...' : 'Send Reset Email'}
                </Button>
                
                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-700 hover:underline font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 font-medium">Email sent successfully!</p>
                    <p className="text-green-600 text-sm mt-2">
                      We&apos;ve sent a password reset link to <strong>{email}</strong>
                    </p>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Please check your email inbox and click the reset link.</p>
                    <p className="font-medium">Can&apos;t find the email?</p>
                    <ul className="text-left space-y-1 bg-gradient-to-br from-gray-50 to-secondary-50/30 p-3 rounded-md border border-gray-100">
                      <li>• Check your spam or junk folder</li>
                      <li>• Make sure you entered the correct email</li>
                      <li>• Wait a few minutes for delivery</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setEmailSent(false)
                        setMessage('')
                      }}
                      variant="outline"
                      className="w-full border-secondary-400 text-secondary-700 hover:bg-secondary-50"
                    >
                      Try Different Email
                    </Button>
                    
                    <Link href="/login" className="block">
                      <Button
                        variant="ghost"
                        className="w-full text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Sign In
                      </Button>
                    </Link>
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