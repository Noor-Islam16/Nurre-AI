import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []

    if (ADMIN_EMAILS.length === 0) {
      return new NextResponse('No admins configured', { status: 403 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (ADMIN_EMAILS.includes(profile?.email || '')) {
      return new NextResponse('Admin access granted', { status: 200 })
    }

    return new NextResponse('Not an admin', { status: 403 })
  } catch (error) {
    console.error('Admin check error:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}