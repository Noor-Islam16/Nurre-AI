'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/** Retry an async function with exponential backoff */
async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelay = 1000 }: { retries?: number; baseDelay?: number } = {}
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export async function signUp(email: string, password: string, name?: string) {
  try {
    const supabase = await createClient()

    const { error, data } = await withRetry(() =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: {
            name: name || '',
            display_name: name || ''
          }
        },
      })
    )

    if (error) {
      return { error: error.message }
    }

    // Check if email already exists (identities array is empty for existing users)
    const emailExists = data.user?.identities?.length === 0

    if (emailExists) {
      return {
        error: 'An account with this email already exists. Please sign in or reset your password.',
        emailExists: true
      }
    }

    // If signup successful and we have a user ID, save the name to users table
    if (data.user?.id && name) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          name: name,
          email: data.user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (profileError) {
        console.error('Failed to save user profile:', profileError)
        // Don't fail the signup, name can be set later in onboarding
      }
    }

    return { success: true, user: data.user }
  } catch (err) {
    console.error('[Auth] signUp failed:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createClient()

    const { error, data } = await withRetry(() =>
      supabase.auth.signInWithPassword({
        email,
        password,
      })
    )

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      const { data: coachRow } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (coachRow) {
        redirect('/coach')
      }
    }

    redirect('/dashboard')
  } catch (err) {
    // redirect() throws a special Next.js error — rethrow it
    if (err && typeof err === 'object' && 'digest' in err) throw err
    console.error('[Auth] signIn failed:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function signInWithMagicLink(email: string) {
  try {
    const supabase = await createClient()

    const { error } = await withRetry(() =>
      supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })
    )

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Auth] signInWithMagicLink failed:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPasswordForEmail(email: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Auth] resetPasswordForEmail failed:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Auth] updatePassword failed:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}
