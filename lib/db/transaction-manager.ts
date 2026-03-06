import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority?: number;
  time_estimate?: number;
  completed: boolean;
  completed_at?: string;
  due_date?: string;
  ai_subtasks?: any;
  parent_id?: string;
  order_index?: number;
}

interface Subtask {
  id: string;
  user_id: string;
  parent_id: string;
  title: string;
  description?: string;
  order_index: number;
  completed: boolean;
}

interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string;
  duration: number;
  actual_duration?: number;
  completed: boolean;
  effectiveness?: number;
  interruptions?: number;
  break_taken?: boolean;
  notes?: string;
}

interface Reward {
  id: string;
  user_id: string;
  type: string;
  points: number;
  reason: string;
}

export class TransactionManager {
  private supabase: SupabaseClient | null = null;

  /**
   * Initialize the transaction manager with a Supabase client
   */
  async initialize() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Execute multiple operations in a transaction-like pattern
   * Note: Supabase doesn't support true transactions via the client library,
   * so we implement compensating transactions for rollback
   */
  async executeTransaction<T>(
    operations: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const client = await this.initialize();
    
    try {
      const result = await operations(client);
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Create a task with its subtasks atomically
   */
  async createTaskWithSubtasks(
    task: Omit<Task, 'id'>,
    subtasks: Omit<Subtask, 'id' | 'parent_id'>[]
  ): Promise<{ task: Task; subtasks: Subtask[] }> {
    const client = await this.initialize();
    
    let createdTask: Task | null = null;
    let createdSubtasks: Subtask[] = [];
    
    try {
      // Step 1: Create the main task
      const { data: taskData, error: taskError } = await client
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (taskError) throw taskError;
      createdTask = taskData;
      
      // Step 2: Create subtasks if any
      if (subtasks.length > 0 && createdTask) {
        const subtasksToInsert = subtasks.map(subtask => ({
          ...subtask,
          parent_id: createdTask!.id,
          user_id: task.user_id
        }));
        
        const { data: subtasksData, error: subtasksError } = await client
          .from('tasks')
          .insert(subtasksToInsert)
          .select();
        
        if (subtasksError) {
          // Rollback: Delete the main task (CASCADE will delete subtasks)
          await client
            .from('tasks')
            .delete()
            .eq('id', createdTask.id);
          
          throw subtasksError;
        }
        
        createdSubtasks = subtasksData || [];
      }
      
      if (!createdTask) {
        throw new Error('Failed to create task');
      }
      
      return { task: createdTask, subtasks: createdSubtasks };
      
    } catch (error) {
      // Compensating transaction: Clean up any created data
      if (createdTask) {
        await client
          .from('tasks')
          .delete()
          .eq('id', createdTask.id);
      }
      
      console.error('Failed to create task with subtasks:', error);
      throw error;
    }
  }

  /**
   * Complete a task and get updated rewards atomically
   */
  async completeTaskWithRewards(
    taskId: string,
    userId: string
  ): Promise<{ task: Task; rewards: any }> {
    const client = await this.initialize();
    
    try {
      // Step 1: Mark task as completed
      const { data: taskData, error: taskError } = await client
        .from('tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (taskError) throw taskError;
      
      // Step 2: Get updated reward statistics
      // Note: Streak calculation happens automatically via database trigger
      const { data: rewardsData, error: rewardsError } = await client
        .rpc('get_user_rewards', {
          p_user_id: userId
        });
      
      if (rewardsError) {
        // Rollback: Mark task as incomplete again
        await client
          .from('tasks')
          .update({
            completed: false,
            completed_at: null
          })
          .eq('id', taskId)
          .eq('user_id', userId);
        
        throw rewardsError;
      }
      
      return { task: taskData, rewards: rewardsData };
      
    } catch (error) {
      console.error('Failed to complete task with rewards:', error);
      throw error;
    }
  }

  /**
   * Create a focus session linked to a task
   */
  async createFocusSessionWithTask(
    session: Omit<FocusSession, 'id'>,
    taskId?: string
  ): Promise<{ session: FocusSession; task?: Task }> {
    const client = await this.initialize();
    
    try {
      // Step 1: Verify task exists if taskId provided
      let task: Task | undefined;
      if (taskId) {
        const { data: taskData, error: taskError } = await client
          .from('tasks')
          .select()
          .eq('id', taskId)
          .eq('user_id', session.user_id)
          .single();
        
        if (taskError) throw new Error('Task not found or unauthorized');
        task = taskData;
      }
      
      // Step 2: Create the focus session
      const { data: sessionData, error: sessionError } = await client
        .from('focus_sessions')
        .insert({
          ...session,
          task_id: taskId
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      return { session: sessionData, task };
      
    } catch (error) {
      console.error('Failed to create focus session:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple tasks
   */
  async batchUpdateTasks(
    userId: string,
    updates: { id: string; updates: Partial<Task> }[]
  ): Promise<Task[]> {
    const client = await this.initialize();
    const updatedTasks: Task[] = [];
    const failedIds: string[] = [];
    
    try {
      // Process updates in sequence to maintain order
      for (const { id, updates: taskUpdates } of updates) {
        const { data, error } = await client
          .from('tasks')
          .update(taskUpdates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) {
          failedIds.push(id);
          console.error(`Failed to update task ${id}:`, error);
        } else {
          updatedTasks.push(data);
        }
      }
      
      if (failedIds.length > 0) {
        throw new Error(`Failed to update tasks: ${failedIds.join(', ')}`);
      }
      
      return updatedTasks;
      
    } catch (error) {
      console.error('Batch update failed:', error);
      throw error;
    }
  }

  /**
   * Delete a task and handle cascading deletes properly
   */
  async deleteTaskWithCascade(
    taskId: string,
    userId: string
  ): Promise<{ deletedCount: number }> {
    const client = await this.initialize();
    
    try {
      // First, get all subtasks
      const { data: subtasks } = await client
        .from('tasks')
        .select('id')
        .eq('parent_id', taskId)
        .eq('user_id', userId);
      
      const subtaskCount = subtasks?.length || 0;
      
      // Delete the task (CASCADE will handle subtasks)
      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return { deletedCount: 1 + subtaskCount };
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  /**
   * Soft delete multiple items with verification
   */
  async softDeleteBatch(
    tableName: string,
    ids: string[],
    userId: string
  ): Promise<{ updatedCount: number }> {
    const client = await this.initialize();
    
    try {
      const { data, error } = await client
        .from(tableName)
        .update({ is_deleted: true })
        .in('id', ids)
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;
      
      return { updatedCount: data?.length || 0 };
      
    } catch (error) {
      console.error(`Failed to soft delete from ${tableName}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const transactionManager = new TransactionManager();