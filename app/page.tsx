import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: coachRow } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (coachRow) {
      redirect('/coach')
    }

    // Check if onboarding is completed
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!profile?.onboarding_completed) {
      redirect('/onboarding/booking')
    } else {
      redirect('/dashboard')
    }
  } else {
    redirect('/login')
  }
}
