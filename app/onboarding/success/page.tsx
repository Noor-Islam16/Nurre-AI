import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatDateTime(value: string | null) {
  if (!value) return null
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

export default async function OnboardingSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ code?: string; expiresAt?: string }>
}) {
  const params = await searchParams
  const code = params?.code
  const expiresAt = formatDateTime(params?.expiresAt ?? null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Your coaching session has been scheduled. You&apos;ll find the claim code in the calendar invite, but you can also keep it handy here.
          </p>

          {code ? (
            <div className="rounded-md border border-primary/40 bg-primary/10 p-4 text-base text-foreground">
              <div className="font-semibold">Claim code</div>
              <div className="text-lg font-bold tracking-wider">{code}</div>
              {expiresAt && <div className="mt-1 text-xs text-muted-foreground">Expires {expiresAt}</div>}
            </div>
          ) : (
            <div className="rounded-md border border-muted bg-muted/40 p-4 text-sm">
              Return to booking to generate a claim code, or check your calendar invite for existing details.
            </div>
          )}

          <div className="space-y-2">
            <p>
              Want to book another professional? Head back to the booking page—you can use the same claim code up to the number of professionals you selected.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/onboarding/booking">Book another session</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
