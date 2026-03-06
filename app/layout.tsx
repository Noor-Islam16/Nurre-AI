import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { AppLayout } from '@/components/layout/app-layout'
import { AuthProvider } from '@/components/providers/auth-provider'
import { TrackingProvider } from '@/components/providers/tracking-provider'
import { DailyMoodProvider } from '@/components/providers/daily-mood-provider'
import { GrowthPointsProvider } from '@/components/providers/growth-points-provider'
import { LevelUpCelebration } from '@/components/rewards/level-up-celebration'
import { ServiceWorkerProvider } from '@/app/providers/service-worker-provider'
import { MusicPlayerProvider } from '@/components/music/Player'
import { ConsentBanner } from '@/components/privacy/consent-banner'

export const metadata: Metadata = {
  title: 'NureeAI - Your AI-Powered ADHD Coach',
  description: 'Personalized AI coach for individuals with ADHD to improve focus, productivity, and emotional regulation.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get nonce from headers (production only)
  const headersList = await headers()
  const nonce = headersList.get('X-Nonce') || undefined
  
  return (
    <html lang="en">
      <head>
        {/* Add nonce to inline scripts if available */}
        {nonce && (
          <meta property="csp-nonce" content={nonce} />
        )}
      </head>
      <body className="min-h-screen">
        <ServiceWorkerProvider>
          <AuthProvider>
            <TrackingProvider>
                <DailyMoodProvider>
                  <GrowthPointsProvider>
                      <MusicPlayerProvider>
                        <AppLayout>
                          {children}
                        </AppLayout>
                        <ConsentBanner />
                        <LevelUpCelebration />
                      </MusicPlayerProvider>
                  </GrowthPointsProvider>
                </DailyMoodProvider>
            </TrackingProvider>
          </AuthProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}
