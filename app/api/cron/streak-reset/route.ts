import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()
    
    // Call the reset_broken_streaks function
    const { error } = await supabase.rpc('reset_broken_streaks')
    
    if (error) {
      console.error('Error resetting broken streaks:', error)
      return NextResponse.json({ error: 'Failed to reset streaks' }, { status: 500 })
    }
    
    // Log the reset for monitoring
    console.log(`[${new Date().toISOString()}] Streak reset cron job completed successfully`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Broken streaks reset successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Streak reset cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}