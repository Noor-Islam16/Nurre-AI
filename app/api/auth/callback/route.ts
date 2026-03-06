import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the user to check their status
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        
        // Determine the appropriate redirect
        let redirectTo = next
        
        // If email just confirmed and onboarding not complete, go to onboarding
        if (user.email_confirmed_at && !profile?.onboarding_completed) {
          redirectTo = '/onboarding'
        } 
        // If onboarding complete, go to dashboard
        else if (profile?.onboarding_completed) {
          redirectTo = '/dashboard'
        }
        // If intended destination was provided and safe, use it
        else if (next && next !== '/' && !next.includes('auth') && !next.includes('confirm')) {
          redirectTo = next
        }
        
        // Store a flag that email was just confirmed for UI feedback
        const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
        response.cookies.set('email_just_confirmed', 'true', {
          maxAge: 10, // Expires in 10 seconds
          httpOnly: false,
          sameSite: 'lax'
        })
        
        return response
      }
    }
  }
  
  // If there was an error or no code, redirect to login with error message
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
}