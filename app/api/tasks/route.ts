import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSecureApiResponse } from '@/lib/api/with-security-headers';
import { transactionManager } from '@/lib/db/transaction-manager';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get tasks for the user
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
    
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { title, description, subtasks, priority, time_estimate, due_date, ai_subtasks } = body;

    // Use transaction manager to create task with subtasks
    if (subtasks && subtasks.length > 0) {
      const result = await transactionManager.createTaskWithSubtasks(
        {
          user_id: user.id,
          title,
          description,
          priority: priority || 1,
          time_estimate,
          due_date,
          ai_subtasks,
          completed: false,
          order_index: 0
        },
        subtasks.map((st: any, index: number) => ({
          title: st.title,
          description: st.description,
          order_index: index,
          completed: false
        }))
      );

      return NextResponse.json(result);
    } else {
      // Create single task without subtasks
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          description,
          priority: priority || 1,
          time_estimate,
          due_date,
          ai_subtasks,
          completed: false,
          order_index: 0
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
      }
      
      return NextResponse.json({ task: data, subtasks: [] });
    }
    
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      taskId,
      completed,
      title,
      description,
      priority,
      time_estimate,
      due_date,
      recurring_pattern,
      priority_override
    } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Use transaction manager for task completion with rewards
    if (completed === true && body.hasOwnProperty('completed')) {
      const result = await transactionManager.completeTaskWithRewards(taskId, user.id);
      return NextResponse.json(result);
    } else {
      // Build update object with only provided fields
      const updateData: any = {};

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (time_estimate !== undefined) updateData.time_estimate = time_estimate;
      if (due_date !== undefined) updateData.due_date = due_date;
      if (recurring_pattern !== undefined) updateData.recurring_pattern = recurring_pattern;
      if (priority_override !== undefined) updateData.priority_override = priority_override;

      if (completed !== undefined) {
        updateData.completed = completed;
        updateData.completed_at = completed ? new Date().toISOString() : null;
      }

      // Regular update without rewards
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
      }

      return NextResponse.json({ task: data });
    }

  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('id');
    const soft = searchParams.get('soft') === 'true';
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }
    
    if (soft) {
      // Soft delete
      const result = await transactionManager.softDeleteBatch('tasks', [taskId], user.id);
      return NextResponse.json({ success: true, deletedCount: result.updatedCount });
    } else {
      // Hard delete with cascade
      const result = await transactionManager.deleteTaskWithCascade(taskId, user.id);
      return NextResponse.json({ success: true, ...result });
    }
    
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}