'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CleanupStats {
  recent_cleanups: any[];
  table_sizes: Array<{
    table_name: string;
    row_count: number;
    total_size: string;
    index_size: string;
  }>;
  cleanup_stats: Array<{
    stat_name: string;
    stat_value: number;
  }>;
  estimated_savings: Array<{
    table_name: string;
    rows_to_delete: number;
    estimated_size_mb: number;
  }>;
  cleanup_history: Array<{
    cleanup_time: string;
    details: any;
    duration_seconds: number;
  }>;
  retention_policies: Record<string, string>;
  next_scheduled: string;
}

export function CleanupMonitor() {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setFetchingStats(true);
    try {
      const response = await fetch('/api/admin/cleanup', {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();

      if (mountedRef.current) {
        setStats(data);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && mountedRef.current) {
        console.error('Failed to fetch cleanup stats:', error);
        setMessage({ type: 'error', text: 'Failed to fetch cleanup statistics' });
      }
    } finally {
      if (mountedRef.current) {
        setFetchingStats(false);
      }
    }
  }, []);

  const runCleanup = useCallback(async (dryRun: boolean) => {
    if (loading) return; // Prevent multiple simultaneous operations

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Cleanup failed');
      }

      const data = await response.json();
      if (mountedRef.current) {
        setMessage({
          type: 'success',
          text: data.message
        });
      }

      // Refresh stats after cleanup with a small delay
      setTimeout(() => {
        if (mountedRef.current) {
          fetchStats();
        }
      }, 1000);
    } catch (error: any) {
      console.error('Cleanup failed:', error);
      if (mountedRef.current) {
        setMessage({
          type: 'error',
          text: error.message || 'Cleanup operation failed'
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loading, fetchStats]);

  const runImmediateCleanup = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous operations

    if (!confirm('Are you sure you want to run immediate cleanup? This will permanently delete old data.')) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Immediate cleanup failed');
      }

      const data = await response.json();
      if (mountedRef.current) {
        setMessage({
          type: 'success',
          text: data.message
        });
      }

      // Refresh stats after cleanup with a small delay
      setTimeout(() => {
        if (mountedRef.current) {
          fetchStats();
        }
      }, 1000);
    } catch (error: any) {
      console.error('Immediate cleanup failed:', error);
      if (mountedRef.current) {
        setMessage({
          type: 'error',
          text: error.message || 'Immediate cleanup failed'
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loading, fetchStats]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();

    return () => {
      mountedRef.current = false;
      // Cancel any ongoing requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats]);

  if (fetchingStats) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading cleanup statistics...</span>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Failed to load cleanup statistics
        </div>
      </Card>
    );
  }

  // Parse cleanup stats into a more usable format
  const statsMap = stats.cleanup_stats?.reduce((acc, stat) => {
    acc[stat.stat_name] = stat.stat_value;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalSavingsMB = stats.estimated_savings?.reduce(
    (sum, item) => sum + item.estimated_size_mb, 
    0
  ) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Cleanup Monitor</CardTitle>
          <CardDescription>
            Manage data retention and cleanup policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Retention Policies */}
          <div>
            <h3 className="font-semibold mb-3">Retention Policies</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(stats.retention_policies).map(([table, retention]) => (
                <div key={table} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm font-medium">{table}:</span>
                  <Badge variant="outline">{retention}</Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Next scheduled cleanup: <strong>{stats.next_scheduled}</strong>
            </p>
          </div>

          {/* Cleanup Statistics */}
          <div>
            <h3 className="font-semibold mb-3">Current Data Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Events</p>
                <p className="text-2xl font-bold">{statsMap.events_count || 0}</p>
                <p className="text-xs text-red-600">{statsMap.events_old || 0} old</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{statsMap.conversations_count || 0}</p>
                <p className="text-xs text-red-600">{statsMap.conversations_old || 0} old</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">AI Errors</p>
                <p className="text-2xl font-bold">{statsMap.ai_errors_count || 0}</p>
                <p className="text-xs text-red-600">{statsMap.ai_errors_old || 0} old</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pattern Events</p>
                <p className="text-2xl font-bold">{statsMap.pattern_events_count || 0}</p>
                <p className="text-xs text-red-600">{statsMap.pattern_events_old || 0} old</p>
              </div>
            </div>
          </div>

          {/* Estimated Savings */}
          {stats.estimated_savings && stats.estimated_savings.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Estimated Cleanup Savings</h3>
              <div className="space-y-2">
                {stats.estimated_savings.map((saving) => (
                  <div key={saving.table_name} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{saving.table_name}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{saving.rows_to_delete} rows</Badge>
                      <Badge variant="outline">{saving.estimated_size_mb} MB</Badge>
                    </div>
                  </div>
                ))}
                <div className="text-right mt-2">
                  <p className="text-sm text-muted-foreground">
                    Total estimated savings: <strong>{totalSavingsMB.toFixed(2)} MB</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Table Sizes */}
          <div>
            <h3 className="font-semibold mb-3">Table Sizes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Table</th>
                    <th className="text-right py-2">Rows</th>
                    <th className="text-right py-2">Total Size</th>
                    <th className="text-right py-2">Index Size</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.table_sizes?.slice(0, 10).map((table) => (
                    <tr key={table.table_name} className="border-b">
                      <td className="py-2">{table.table_name}</td>
                      <td className="text-right py-2">{table.row_count.toLocaleString()}</td>
                      <td className="text-right py-2">{table.total_size}</td>
                      <td className="text-right py-2">{table.index_size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cleanup History */}
          {stats.cleanup_history && stats.cleanup_history.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Recent Cleanup History</h3>
              <div className="space-y-2">
                {stats.cleanup_history.slice(0, 5).map((history, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span>{formatDistanceToNow(new Date(history.cleanup_time), { addSuffix: true })}</span>
                    {history.duration_seconds && (
                      <Badge variant="outline">{history.duration_seconds.toFixed(1)}s</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => runCleanup(true)} 
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Dry Run
                </>
              )}
            </Button>
            <Button 
              onClick={() => runCleanup(false)} 
              disabled={loading}
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Execute Cleanup
                </>
              )}
            </Button>
            <Button 
              onClick={runImmediateCleanup} 
              disabled={loading}
              variant="destructive"
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Immediate Cleanup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}