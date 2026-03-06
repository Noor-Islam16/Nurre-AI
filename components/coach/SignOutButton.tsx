'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/actions'

export function SignOutButton() {
  const [pending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
