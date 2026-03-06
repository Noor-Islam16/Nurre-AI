import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

async function getPrivacyData() {
  const supabase = await createClient()

  // Get export requests
  const { data: exportRequests } = await supabase
    .from('data_export_requests')
    .select('*, users!inner(email, name)')
    .order('requested_at', { ascending: false })
    .limit(20)

  // Get deletion requests
  const { data: deletionRequests } = await supabase
    .from('data_deletion_requests')
    .select('*, users!inner(email, name)')
    .order('requested_at', { ascending: false })
    .limit(20)

  // Get consent statistics
  const { data: consentData } = await supabase
    .from('user_consents')
    .select('*')
    .order('consented_at', { ascending: false })

  // Get privacy audit logs
  const { data: auditLogs } = await supabase
    .from('privacy_audit_log')
    .select('*, users!inner(email)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Calculate statistics
  const stats = {
    pendingExports: exportRequests?.filter(r => r.status === 'pending').length || 0,
    completedExports: exportRequests?.filter(r => r.status === 'completed').length || 0,
    scheduledDeletions: deletionRequests?.filter(r => r.status === 'scheduled').length || 0,
    completedDeletions: deletionRequests?.filter(r => r.status === 'completed').length || 0,
    consentStats: {
      total: consentData?.length || 0,
      analytics: consentData?.filter(c => c.analytics_consent).length || 0,
      functional: consentData?.filter(c => c.functional_consent).length || 0,
      marketing: consentData?.filter(c => c.marketing_consent).length || 0,
    }
  }

  return {
    exportRequests: exportRequests || [],
    deletionRequests: deletionRequests || [],
    auditLogs: auditLogs || [],
    stats
  }
}

export default async function PrivacyPage() {
  const data = await getPrivacyData()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'pending':
      case 'scheduled':
        return 'secondary'
      case 'processing':
        return 'default'
      case 'failed':
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Privacy & Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Manage GDPR/CCPA requests and privacy compliance
        </p>
      </div>

      {/* Alerts for pending requests */}
      {(data.stats.pendingExports > 0 || data.stats.scheduledDeletions > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have{' '}
            {data.stats.pendingExports > 0 && `${data.stats.pendingExports} pending export requests`}
            {data.stats.pendingExports > 0 && data.stats.scheduledDeletions > 0 && ' and '}
            {data.stats.scheduledDeletions > 0 && `${data.stats.scheduledDeletions} scheduled deletions`}
            {' requiring attention.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingExports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.stats.completedExports} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Deletion Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.scheduledDeletions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.stats.completedDeletions} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Consent Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.consentStats.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                A: {data.stats.consentStats.analytics}
              </Badge>
              <Badge variant="outline" className="text-xs">
                F: {data.stats.consentStats.functional}
              </Badge>
              <Badge variant="outline" className="text-xs">
                M: {data.stats.consentStats.marketing}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audit Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.auditLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recent activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Export Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export Requests (GDPR Article 20)
          </CardTitle>
          <CardDescription>
            User requests for data portability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.exportRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No export requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.exportRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {request.users.name || 'No name'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.users.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.format.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.expires_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(request.expires_at), { addSuffix: true })}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <Button size="sm" variant="outline">
                          Process
                        </Button>
                      )}
                      {request.status === 'completed' && request.download_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={request.download_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Data Deletion Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Deletion Requests (GDPR Article 17)
          </CardTitle>
          <CardDescription>
            Right to erasure requests with 30-day grace period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.deletionRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deletion requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deletionRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {request.users.name || 'No name'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.users.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {request.scheduled_for ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-sm">
                            {format(new Date(request.scheduled_for), 'MMM d, yyyy')}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {request.reason || 'Not specified'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {request.status === 'scheduled' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Cancel
                          </Button>
                          <Button size="sm" variant="destructive">
                            Delete Now
                          </Button>
                        </div>
                      )}
                      {request.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Privacy Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Privacy Audit Log
          </CardTitle>
          <CardDescription>
            Immutable record of all privacy-related actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log.users.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {log.details?.type || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {log.ip_address || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}