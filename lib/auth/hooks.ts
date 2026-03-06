'use client'

import { useEffect, useState } from 'react'
import { useUser } from './client'
import { createClient } from './client'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useUser()

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // Get user's email from the users table
        const { data: profile } = await supabase
          .from('users')
          .select('email')
          .eq('id', user.id)
          .single()

        if (!profile?.email) {
          setIsAdmin(false)
          setLoading(false)
          return
        }

        // Check if the email is in the admin list
        // Note: We can't access process.env.ADMIN_EMAILS directly in client components
        // So we'll check by attempting to access the admin API
        const response = await fetch('/api/admin/check-access', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        setIsAdmin(response.ok)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  return { isAdmin, loading }
}