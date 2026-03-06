import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const deletionRequestSchema = z.object({
  reason: z.string().optional(),
  confirmDeletion: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = deletionRequestSchema.parse(body);
    
    if (!validatedData.confirmDeletion) {
      return NextResponse.json(
        { error: 'Deletion must be confirmed' },
        { status: 400 }
      );
    }
    
    // Check if there's already a pending deletion request
    const { data: existingRequest } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'scheduled'])
      .single();
    
    if (existingRequest) {
      return NextResponse.json({
        message: 'You already have a pending deletion request',
        request: existingRequest,
        scheduledFor: existingRequest.scheduled_for,
      });
    }
    
    // Create deletion request (soft delete - scheduled for 30 days)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);
    
    const { data: deletionRequest, error: insertError } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: user.id,
        reason: validatedData.reason,
        status: 'scheduled',
        scheduled_for: scheduledDate.toISOString(),
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Failed to create deletion request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create deletion request' },
        { status: 500 }
      );
    }
    
    // Mark user account for deletion
    await supabase
      .from('users')
      .update({
        deletion_requested_at: new Date().toISOString(),
        deletion_scheduled_for: scheduledDate.toISOString(),
      })
      .eq('id', user.id);
    
    // Log to privacy audit
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: user.id,
        action: 'data_deleted',
        details: {
          request_id: deletionRequest.id,
          type: 'deletion_requested',
          scheduled_for: scheduledDate.toISOString(),
          reason: validatedData.reason,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    
    return NextResponse.json({
      success: true,
      message: 'Your data deletion request has been scheduled. Your data will be permanently deleted in 30 days. You can cancel this request anytime before the scheduled date.',
      request: {
        id: deletionRequest.id,
        scheduledFor: deletionRequest.scheduled_for,
        status: deletionRequest.status,
      }
    });
  } catch (error) {
    console.error('Data deletion API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cancel deletion request
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find pending deletion request
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'scheduled'])
      .single();
    
    if (fetchError || !deletionRequest) {
      return NextResponse.json(
        { error: 'No pending deletion request found' },
        { status: 404 }
      );
    }
    
    // Cancel the deletion request
    const { error: updateError } = await supabase
      .from('data_deletion_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'User requested cancellation',
      })
      .eq('id', deletionRequest.id);
    
    if (updateError) {
      console.error('Failed to cancel deletion request:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel deletion request' },
        { status: 500 }
      );
    }
    
    // Remove deletion flags from user account
    await supabase
      .from('users')
      .update({
        deletion_requested_at: null,
        deletion_scheduled_for: null,
      })
      .eq('id', user.id);
    
    // Log to privacy audit
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: user.id,
        action: 'preferences_updated',
        details: {
          request_id: deletionRequest.id,
          type: 'deletion_cancelled',
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    
    return NextResponse.json({
      success: true,
      message: 'Your data deletion request has been cancelled successfully.',
    });
  } catch (error) {
    console.error('Cancel deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get deletion request status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the latest deletion request
    const { data: deletionRequest } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!deletionRequest) {
      return NextResponse.json({
        hasDeletionRequest: false,
      });
    }
    
    return NextResponse.json({
      hasDeletionRequest: true,
      request: {
        id: deletionRequest.id,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requested_at,
        scheduledFor: deletionRequest.scheduled_for,
        reason: deletionRequest.reason,
        canCancel: ['pending', 'scheduled'].includes(deletionRequest.status),
      }
    });
  } catch (error) {
    console.error('Get deletion status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}