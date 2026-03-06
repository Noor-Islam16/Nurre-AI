/**
 * Data Retention Cleanup Job
 * Runs periodically to enforce data retention policies
 * Should be scheduled via cron job or Vercel cron
 */

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_RETENTION_POLICY } from '@/types/privacy';

export async function runRetentionCleanup() {
  console.log('[Retention Cleanup] Starting retention cleanup job...');
  
  try {
    const supabase = await createClient();
    
    // Get retention policy (could be customized per user in the future)
    const retentionPolicy = DEFAULT_RETENTION_POLICY;
    
    // Clean up old events
    const eventsResult = await cleanupOldData(
      supabase,
      'events',
      retentionPolicy.events
    );
    
    // Clean up old focus sessions
    const focusResult = await cleanupOldData(
      supabase,
      'focus_sessions',
      retentionPolicy.focusSessions
    );
    
    // Clean up old mood entries
    const moodResult = await cleanupOldData(
      supabase,
      'mood_entries',
      retentionPolicy.moodEntries
    );
    
    // Clean up old conversations (keep longer)
    const conversationsResult = await cleanupOldData(
      supabase,
      'conversations',
      retentionPolicy.conversations
    );
    
    // Process scheduled deletions
    const deletionsResult = await processScheduledDeletions(supabase);
    
    // Log to privacy audit
    await supabase
      .from('privacy_audit_log')
      .insert({
        action: 'data_deleted',
        details: {
          type: 'retention_cleanup',
          events_deleted: eventsResult.count,
          focus_sessions_deleted: focusResult.count,
          mood_entries_deleted: moodResult.count,
          conversations_deleted: conversationsResult.count,
          scheduled_deletions_processed: deletionsResult.count,
          timestamp: new Date().toISOString(),
        },
      });
    
    console.log('[Retention Cleanup] Cleanup completed successfully', {
      events: eventsResult.count,
      focusSessions: focusResult.count,
      moodEntries: moodResult.count,
      conversations: conversationsResult.count,
      scheduledDeletions: deletionsResult.count,
    });
    
    return {
      success: true,
      deleted: {
        events: eventsResult.count,
        focusSessions: focusResult.count,
        moodEntries: moodResult.count,
        conversations: conversationsResult.count,
        scheduledDeletions: deletionsResult.count,
      },
    };
  } catch (error) {
    console.error('[Retention Cleanup] Error during cleanup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function cleanupOldData(
  supabase: any,
  tableName: string,
  retentionDays: number
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  try {
    // Soft delete by setting is_deleted flag
    const { data, error } = await supabase
      .from(tableName)
      .update({ is_deleted: true })
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_deleted', false)
      .select('id');
    
    if (error) {
      console.error(`[Retention Cleanup] Error cleaning ${tableName}:`, error);
      return { count: 0, error };
    }
    
    const count = data?.length || 0;
    if (count > 0) {
      console.log(`[Retention Cleanup] Soft deleted ${count} records from ${tableName}`);
    }
    
    return { count, error: null };
  } catch (error) {
    console.error(`[Retention Cleanup] Exception cleaning ${tableName}:`, error);
    return { count: 0, error };
  }
}

async function processScheduledDeletions(supabase: any) {
  try {
    // Get all scheduled deletions that are due
    const { data: scheduledDeletions, error: fetchError } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString());
    
    if (fetchError) {
      console.error('[Retention Cleanup] Error fetching scheduled deletions:', fetchError);
      return { count: 0, error: fetchError };
    }
    
    if (!scheduledDeletions || scheduledDeletions.length === 0) {
      return { count: 0, error: null };
    }
    
    let processedCount = 0;
    
    for (const deletion of scheduledDeletions) {
      try {
        // Update status to processing
        await supabase
          .from('data_deletion_requests')
          .update({ status: 'processing' })
          .eq('id', deletion.id);
        
        // Soft delete all user data
        const tables = ['events', 'tasks', 'focus_sessions', 'conversations', 'mood_entries'];
        
        for (const table of tables) {
          await supabase
            .from(table)
            .update({ is_deleted: true })
            .eq('user_id', deletion.user_id);
        }
        
        // Mark user as deleted
        await supabase
          .from('users')
          .update({ is_deleted: true })
          .eq('id', deletion.user_id);
        
        // Update deletion request as completed
        await supabase
          .from('data_deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', deletion.id);
        
        // Log to privacy audit
        await supabase
          .from('privacy_audit_log')
          .insert({
            user_id: deletion.user_id,
            action: 'data_deleted',
            details: {
              request_id: deletion.id,
              type: 'user_requested',
              timestamp: new Date().toISOString(),
            },
          });
        
        processedCount++;
        console.log(`[Retention Cleanup] Processed deletion for user ${deletion.user_id}`);
      } catch (error) {
        console.error(`[Retention Cleanup] Error processing deletion ${deletion.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('data_deletion_requests')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', deletion.id);
      }
    }
    
    return { count: processedCount, error: null };
  } catch (error) {
    console.error('[Retention Cleanup] Exception processing scheduled deletions:', error);
    return { count: 0, error };
  }
}

// Export for use in cron job
export default runRetentionCleanup;