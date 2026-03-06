import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

interface AdminAuthSuccess {
  user: User
  email: string
}

interface AdminAuthError {
  error: string
  status: 401 | 403
}

type AdminAuthResult = AdminAuthSuccess | AdminAuthError

/**
 * Verify that the current user is an admin.
 * Uses ADMIN_EMAILS environment variable for authorization.
 *
 * @returns User and email if admin, or error with status code
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []

  if (ADMIN_EMAILS.length === 0) {
    return { error: 'No admins configured', status: 403 }
  }

  // Get user's email from the users table
  const { data: profile } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!ADMIN_EMAILS.includes(profile?.email || '')) {
    return { error: 'Admin access required', status: 403 }
  }

  return { user, email: profile?.email || '' }
}

/**
 * Type guard to check if result is an error
 */
export function isAdminAuthError(result: AdminAuthResult): result is AdminAuthError {
  return 'error' in result
}
