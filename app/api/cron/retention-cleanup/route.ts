import { NextRequest, NextResponse } from 'next/server';
import { runRetentionCleanup } from '@/lib/jobs/retention-cleanup';
import { getAbuseDetector } from '@/lib/ai/abuse-detector';

// Vercel Cron configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

// This will be automatically detected by Vercel as a cron job
// Schedule: Daily at 3 AM UTC
export const config = {
  schedule: '0 3 * * *' // Daily at 3 AM UTC
};

export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron (in production)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[Cron] Starting daily cleanup job...');

    // 1. Run retention cleanup (old data)
    console.log('[Cron] Running retention cleanup...');
    const retentionResult = await runRetentionCleanup();

    if (!retentionResult.success) {
      console.error('[Cron] Retention cleanup failed:', retentionResult.error);
    } else {
      console.log('[Cron] Retention cleanup completed:', retentionResult.deleted);
    }

    // 2. Clean old abuse violations (30+ days)
    console.log('[Cron] Cleaning old violations...');
    let violationsCleanedSuccessfully = false;
    try {
      const abuseDetector = getAbuseDetector();
      await abuseDetector.cleanOldViolations();
      violationsCleanedSuccessfully = true;
      console.log('[Cron] Old violations cleaned successfully');
    } catch (violationError) {
      console.error('[Cron] Failed to clean violations:', violationError);
    }

    // Return combined result
    const overallSuccess = retentionResult.success && violationsCleanedSuccessfully;

    return NextResponse.json({
      success: overallSuccess,
      message: 'Daily cleanup completed',
      retention: {
        success: retentionResult.success,
        deleted: retentionResult.deleted,
        error: retentionResult.error
      },
      violations: {
        success: violationsCleanedSuccessfully
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Unexpected error in retention cleanup:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint (for testing)
export async function POST(request: NextRequest) {
  try {
    // Check for API key or admin authentication for manual triggers
    const apiKey = request.headers.get('x-api-key');
    
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Manual] Retention cleanup triggered manually');
    
    const result = await runRetentionCleanup();
    
    return NextResponse.json({
      success: result.success,
      manual: true,
      deleted: result.deleted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}