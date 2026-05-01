import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { securityHeaders, getContentSecurityPolicy } from '@/lib/security/headers'
import { getSecurityConfig } from '@/lib/security/config'

export async function middleware(request: NextRequest) {
  // Supabase PKCE flow: after token verification, Supabase redirects to the site
  // URL with ?code=xxx. Intercept and route to /auth/callback for code exchange.
  const authCode = request.nextUrl.searchParams.get('code')
  if (authCode && !request.nextUrl.pathname.startsWith('/auth/callback')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(callbackUrl)
  }

  // Generate nonce for CSP (production only)
  let nonce: string | undefined;
  if (process.env.NODE_ENV === 'production') {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    nonce = btoa(String.fromCharCode(...buffer));
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Store security headers to reapply after cookie operations
  const securityHeadersToApply: Record<string, string> = {};
  
  // Prepare security headers
  const config = getSecurityConfig();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    // Only add HSTS in production
    if (key === 'Strict-Transport-Security' && !config.hsts.enabled) {
      return;
    }
    securityHeadersToApply[key] = value;
    response.headers.set(key, value);
  });

  // Add CSP header
  const csp = getContentSecurityPolicy(nonce);
  if (config.csp.reportOnly) {
    securityHeadersToApply['Content-Security-Policy-Report-Only'] = csp;
    response.headers.set('Content-Security-Policy-Report-Only', csp);
  } else {
    securityHeadersToApply['Content-Security-Policy'] = csp;
    response.headers.set('Content-Security-Policy', csp);
  }

  // Store nonce for use in script tags
  if (nonce) {
    securityHeadersToApply['X-Nonce'] = nonce;
    response.headers.set('X-Nonce', nonce);
  }
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Don't create a new response, just set cookies on existing one
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          // Don't create a new response, just set cookies on existing one
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()

  // Enforce 7-day session timeout
  if (user && user.last_sign_in_at) {
    const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
    const lastSignIn = new Date(user.last_sign_in_at).getTime()
    const sessionAge = Date.now() - lastSignIn

    if (sessionAge > MAX_SESSION_AGE_MS) {
      // Session expired - sign out and redirect to login
      await supabase.auth.signOut()
      const redirectResponse = NextResponse.redirect(
        new URL('/login?reason=session_expired', request.url)
      )
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }
  }

  // Batch-fetch user profile data once (used by multiple route checks below)
  let userProfile: { onboarding_completed: boolean | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()
    userProfile = data
  }

  // Define route types
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/signup') ||
                      request.nextUrl.pathname.startsWith('/auth') ||
                      request.nextUrl.pathname.startsWith('/confirm-email')
  
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')
  
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                           request.nextUrl.pathname.startsWith('/chat') ||
                           request.nextUrl.pathname.startsWith('/calm') ||
                           request.nextUrl.pathname.startsWith('/planner') ||
                           request.nextUrl.pathname.startsWith('/focus') ||
                           request.nextUrl.pathname.startsWith('/rewards') ||
                           request.nextUrl.pathname.startsWith('/settings')

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  
  // If not authenticated and trying to access protected routes, admin routes, or onboarding
  if (!user && (isProtectedRoute || isOnboardingRoute || isAdminRoute)) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    // Apply security headers to redirect response
    Object.entries(securityHeadersToApply).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value)
    })
    return redirectResponse
  }

  // Check admin access for admin routes
  if (user && isAdminRoute) {
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []

    // Only check if ADMIN_EMAILS is configured
    if (ADMIN_EMAILS.length > 0) {
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        // Not an admin, redirect to dashboard
        const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
        Object.entries(securityHeadersToApply).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value)
        })
        return redirectResponse
      }
    }
  }
  
  // Special handling for onboarding route - require email confirmation
  if (user && isOnboardingRoute) {
    // Check email confirmation
    if (!user.email_confirmed_at) {
      const redirectResponse = NextResponse.redirect(new URL(`/confirm-email?email=${encodeURIComponent(user.email || '')}`, request.url))
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }
    
    // Check if already completed onboarding
    if (userProfile?.onboarding_completed) {
      // Allow access to booking and success pages which happen immediately after onboarding completion
      const isPostOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding/booking') || 
                                    request.nextUrl.pathname.startsWith('/onboarding/success');
                                    
      if (!isPostOnboardingRoute) {
        const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
        Object.entries(securityHeadersToApply).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value)
        })
        return redirectResponse
      }
    }
  }
  
  // If authenticated, check onboarding status for protected routes
  if (user && isProtectedRoute) {
    // If onboarding not completed, check email confirmation first
    if (!userProfile?.onboarding_completed) {
      if (!user.email_confirmed_at) {
        const redirectResponse = NextResponse.redirect(new URL(`/confirm-email?email=${encodeURIComponent(user.email || '')}`, request.url))
        Object.entries(securityHeadersToApply).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value)
        })
        return redirectResponse
      }
      const redirectResponse = NextResponse.redirect(new URL('/onboarding', request.url))
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }
  }
  
  // If authenticated and on login page (not callback or signup), redirect based on onboarding status
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    // Check if user is admin
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []

    // If user is admin, redirect to admin console
    if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email || '')) {
      const redirectResponse = NextResponse.redirect(new URL('/admin', request.url))
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }

    // Check if user is a coach
    const { data: coachRow } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (coachRow) {
      const redirectResponse = NextResponse.redirect(new URL('/coach', request.url))
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }

    // Non-admin user routing
    if (!userProfile?.onboarding_completed) {
      if (!user.email_confirmed_at) {
        const redirectResponse = NextResponse.redirect(new URL(`/confirm-email?email=${encodeURIComponent(user.email || '')}`, request.url))
        Object.entries(securityHeadersToApply).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value)
        })
        return redirectResponse
      }
      const redirectResponse = NextResponse.redirect(new URL('/onboarding', request.url))
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    } else {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      Object.entries(securityHeadersToApply).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }
  }

  // Allow admin users to access both admin console and main dashboard
  // No auto-redirect from dashboard to admin - admins can navigate freely
  
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
