import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'

export async function checkOnboardingStatus(userId: string) {
  const supabase = createClient()
  
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed, adhd_persona')
    .eq('id', userId)
    .single()
  
  return {
    isComplete: profile?.onboarding_completed ?? false,
    hasPersona: !!profile?.adhd_persona
  }
}

export async function requireOnboarding() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const { isComplete } = await checkOnboardingStatus(user.id)
  
  if (!isComplete) {
    redirect('/onboarding')
  }
  
  return user
}

export async function completeOnboarding(userId: string, persona: string, name: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('users')
    .update({
      adhd_persona: persona,
      name: name,
      onboarding_completed: true,
      first_login_after_onboarding: true, // Set flag for welcome message
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  if (error) {
    throw error
  }
  
  return true
}

export async function checkFirstLoginStatus(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('first_login_after_onboarding')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    return { isFirstLogin: false }
  }
  
  return { isFirstLogin: data.first_login_after_onboarding === true }
}

export async function markFirstLoginComplete(userId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('users')
    .update({
      first_login_after_onboarding: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  return { success: !error, error }
}