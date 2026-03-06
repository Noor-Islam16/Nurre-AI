import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    
    // Check if there's a recent export request to prevent abuse
    const { data: recentRequest } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(1)
      .single();
    
    if (recentRequest) {
      return NextResponse.json(
        { error: 'Export request already processed recently. Please wait before requesting again.' },
        { status: 429 }
      );
    }
    
    // Create export request record
    const { data: exportRequest, error: requestError } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        format: 'json',
        status: 'processing',
      })
      .select()
      .single();
    
    if (requestError) {
      console.error('Failed to create export request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create export request' },
        { status: 500 }
      );
    }
    
    // Collect all user data
    const userData: any = {
      exportDate: new Date().toISOString(),
      requestId: exportRequest.id,
      user: {},
      data: {}
    };
    
    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      userData.user = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        adhd_persona: profile.adhd_persona,
        created_at: profile.created_at,
        onboarding_completed: profile.onboarding_completed,
      };
    }
    
    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    userData.data.tasks = tasks || [];
    
    // Get focus sessions
    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    userData.data.focusSessions = focusSessions || [];
    
    // Get conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    userData.data.conversations = conversations || [];
    
    // Get mood entries
    const { data: moodEntries } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    userData.data.moodEntries = moodEntries || [];
    
    // Get events (last 90 days only for performance)
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    
    userData.data.events = events || [];
    
    // Get preferences
    const { data: preferences } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (preferences) {
      userData.data.preferences = preferences;
    }
    
    // Get consent history
    const { data: consents } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    userData.data.consentHistory = consents || [];
    
    // Update export request as completed
    await supabase
      .from('data_export_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportRequest.id);
    
    // Log to privacy audit
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: user.id,
        action: 'data_exported',
        details: {
          request_id: exportRequest.id,
          format: 'json',
          data_types: Object.keys(userData.data),
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    
    // Return data as downloadable JSON
    return new NextResponse(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="nureeai-data-export-${user.id}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}