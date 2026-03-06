import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { checkOnboardingStatus } from '@/lib/auth/helpers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const origin = requestUrl.origin
  
  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the user immediately after successful exchange
      const { data: { user } } = await supabase.auth.getUser()

      // Check if this is a password recovery flow
      // type=recovery: from our app's resetPasswordForEmail redirectTo
      // No type but recent recovery_sent_at: from Supabase dashboard or PKCE
      // flow where type isn't preserved in the redirect URL
      const isRecovery = type === 'recovery' || (
        !type && user?.recovery_sent_at &&
        (Date.now() - new Date(user.recovery_sent_at).getTime()) < 3600000
      )

      if (isRecovery) {
        // Redirect to reset password page
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      
      // Check if this is a magic link login
      if (type === 'magiclink' || type === 'email') {
        if (user) {
          // Check if user has completed onboarding
          const { data: profile } = await supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()
          
          // If user exists and has completed onboarding, go to dashboard
          if (profile?.onboarding_completed) {
            return NextResponse.redirect(`${origin}/dashboard`)
          }
          
          // If user exists but hasn't completed onboarding, go to onboarding
          if (profile && !profile.onboarding_completed) {
            return NextResponse.redirect(`${origin}/onboarding/booking`)
          }

          // If no profile exists yet (new user via magic link), create profile and go to onboarding
          if (!profile) {
            // User signed in with magic link but has no profile yet
            return NextResponse.redirect(`${origin}/onboarding/booking`)
          }
        }
      }
      
      // Handle regular email confirmation for signup flow
      if (user?.email_confirmed_at) {
        // Check if onboarding is needed
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        
        if (!profile?.onboarding_completed) {
          // Set cookie to indicate email was just confirmed
          const response = NextResponse.redirect(`${origin}/onboarding/booking`)
          response.cookies.set('email_just_confirmed', 'true', {
            path: '/',
            maxAge: 60 // expires in 1 minute
          })
          return response
        }
      }
      
      // Default redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  
  // Handle errors
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
