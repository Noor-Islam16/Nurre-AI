import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BookingReminderCardProps = {
  hasClaimCode?: boolean
  onRegenerate?: () => void
  onShowCode?: () => void
  className?: string
}

export function BookingReminderCard({
  hasClaimCode,
  onRegenerate,
  onShowCode,
  className,
}: BookingReminderCardProps) {
  return (
    <Card className={cn("bg-primary/5", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Your coaching session is booked</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          We’ve added your claim code to the calendar invite. Share it with your coach when the session begins, or regenerate a new one if you’re rescheduling.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default" size="sm">
            <Link href="/onboarding/booking">Book additional sessions</Link>
          </Button>

          <Button variant="outline" size="sm" onClick={onShowCode} disabled={!hasClaimCode}>
            Show claim code
          </Button>

          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate code
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
