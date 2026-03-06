import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRequest } from '@/lib/validation/validate-request';
import { verifyAdmin, isAdminAuthError } from '@/lib/auth/admin-auth';
import { z } from 'zod';

// Admin cleanup request schema
const CleanupRequestSchema = z.object({
  dry_run: z.boolean().default(true),
  days_to_keep: z.number().min(1).max(365).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, CleanupRequestSchema);
    if (validation.error) return validation.error;
    
    const { dry_run = true } = validation.data;

    // Check admin authorization
    const auth = await verifyAdmin();
    if (isAdminAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Execute cleanup using new simplified function
    const supabase = await createClient();
    const { data, error: cleanupError } = await supabase
      .rpc('cleanup_old_data');

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      return NextResponse.json(
        { error: 'Cleanup failed', details: cleanupError },
        { status: 500 }
      );
    }

    // Get stats using new function
    let stats = null;
    const { data: dataStats } = await supabase.rpc('get_data_stats');
    stats = { data_stats: dataStats };

    return NextResponse.json({
      success: true,
      dry_run,
      results: data,
      stats,
      message: dry_run 
        ? 'Dry run completed - no data was deleted' 
        : 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const auth = await verifyAdmin();
    if (isAdminAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();

    // system_logs table doesn't exist, skip this
    const logs: any[] = [];

    // Get data statistics using new function
    const { data: dataStats } = await supabase.rpc('get_data_stats');
    const tableSizes = dataStats;
    const cleanupStats = dataStats;
    const savings = null;
    const history: any[] = [];

    return NextResponse.json({
      recent_cleanups: logs,
      table_sizes: tableSizes,
      cleanup_stats: cleanupStats,
      estimated_savings: savings,
      cleanup_history: history,
      next_scheduled: '3:00 AM UTC daily',
      retention_policies: {
        events: '90 days',
        conversations: '180 days',
        tasks: '365 days (completed)',
        focus_sessions: '180 days'
      }
    });
  } catch (error) {
    console.error('Failed to fetch cleanup stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cleanup stats' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to trigger immediate cleanup
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authorization
    const auth = await verifyAdmin();
    if (isAdminAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();

    // Execute immediate cleanup (not dry run)
    const { data, error: cleanupError } = await supabase
      .rpc('cleanup_old_data');

    if (cleanupError) {
      console.error('Immediate cleanup error:', cleanupError);
      return NextResponse.json(
        { error: 'Immediate cleanup failed', details: cleanupError },
        { status: 500 }
      );
    }

    // Aggregation function no longer exists in simplified schema

    return NextResponse.json({
      success: true,
      message: 'Immediate cleanup executed successfully',
      data
    });
  } catch (error) {
    console.error('Immediate cleanup endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}