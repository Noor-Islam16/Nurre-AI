import { statsCache } from '@/lib/cache/cache-manager';
import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
  currentStreak: number;
  longestStreak: number;
  totalTasks: number;
  completedTasks: number;
  todayTasks: number;
  focusMinutes: number;
  todayFocusMinutes: number;
  averageFocusSession: number;
  moodToday?: string;
  energyLevel?: number;
  lastActive: string;
}

export class CachedDashboardStats {
  static async getStats(userId: string): Promise<DashboardStats> {
    const key = `dashboard:${userId}`;
    
    return statsCache.getOrSet(
      key,
      async () => {
        const supabase = await createClient();
        
        // Get all stats in a single optimized query using parallel promises
        const [
          userStats,
          taskStats,
          focusStats,
          moodStats
        ] = await Promise.all([
          // User stats (streak data)
          supabase
            .from('users')
            .select('current_streak, longest_streak, updated_at')
            .eq('id', userId)
            .single(),
          
          // Task stats
          supabase
            .from('tasks')
            .select('completed, created_at')
            .eq('user_id', userId)
            .eq('is_deleted', false),
          
          // Focus session stats
          supabase
            .from('focus_sessions')
            .select('actual_duration, created_at')
            .eq('user_id', userId)
            .eq('completed', true)
            .eq('is_deleted', false),
          
          // Latest mood
          supabase
            .from('mood_entries')
            .select('mood, energy, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
        ]);

        // Process task stats
        const tasks = taskStats.data || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTasks = tasks.filter(t => 
          t.completed && new Date(t.created_at) >= todayStart
        ).length;

        // Process focus stats
        const sessions = focusStats.data || [];
        const totalFocusMinutes = sessions.reduce((sum, s) => sum + (s.actual_duration || 0), 0);
        const todaySessions = sessions.filter(s => 
          new Date(s.created_at) >= todayStart
        );
        const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + (s.actual_duration || 0), 0);
        const averageFocusSession = sessions.length > 0 
          ? Math.round(totalFocusMinutes / sessions.length)
          : 0;

        // Process mood stats
        const latestMood = moodStats.data?.[0];

        return {
          currentStreak: userStats.data?.current_streak || 0,
          longestStreak: userStats.data?.longest_streak || 0,
          totalTasks,
          completedTasks,
          todayTasks,
          focusMinutes: totalFocusMinutes,
          todayFocusMinutes,
          averageFocusSession,
          moodToday: latestMood?.mood,
          energyLevel: latestMood?.energy,
          lastActive: userStats.data?.updated_at || new Date().toISOString(),
        };
      },
      { ttl: 60 } // Cache for 1 minute
    );
  }

  static async invalidate(userId: string): Promise<void> {
    await statsCache.delete(`dashboard:${userId}`);
  }

  // Invalidate when specific data changes
  static async onTaskChange(userId: string): Promise<void> {
    await this.invalidate(userId);
  }

  static async onFocusSessionChange(userId: string): Promise<void> {
    await this.invalidate(userId);
  }

  static async onMoodChange(userId: string): Promise<void> {
    await this.invalidate(userId);
  }

  static async onStreakChange(userId: string): Promise<void> {
    await this.invalidate(userId);
  }
}