'use client'

import { useEffect, useState } from 'react'
import { useUser } from './client'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useUser()

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    let cancelled = false

    const checkAdminStatus = async () => {
      try {
        // /api/admin/check-access already validates the session and looks up
        // the user's email server-side, so there's no need to duplicate that
        // lookup here first — that pre-check was a wasted round-trip that
        // never even fed its result into the API call below.
        const response = await fetch('/api/admin/check-access', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!cancelled) {
          setIsAdmin(response.ok)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        if (!cancelled) {
          setIsAdmin(false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkAdminStatus()

    return () => {
      cancelled = true
    }
  }, [user])

  return { isAdmin, loading }
}