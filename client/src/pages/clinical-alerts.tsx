import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  User,
  Calendar,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface OutlierAlert {
  id: number;
  patientId: number;
  cohortId: number;
  alertType: string;
  severity: 'warning' | 'critical';
  metric: string;
  deviationValue: number;
  consecutiveOccurrences: number;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

const severityColors = {
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const severityIcons = {
  warning: <AlertTriangle className="h-4 w-4" />,
  critical: <TrendingDown className="h-4 w-4" />,
};

export default function ClinicalAlerts() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const { data: alerts, isLoading, error } = useQuery<OutlierAlert[]>({
    queryKey: ['/api/alerts'],
    enabled: hasRole(['clinician', 'admin']),
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await apiRequest(`/api/alerts/${alertId}/resolve`, {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "Alert resolved",
        description: "The alert has been successfully resolved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve alert. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredAlerts = alerts?.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  }).filter(alert => !alert.isResolved) || [];

  const resolvedAlerts = alerts?.filter(alert => alert.isResolved) || [];

  const handleResolveAlert = (alertId: number) => {
    resolveAlertMutation.mutate(alertId);
  };

  if (!hasRole(['clinician', 'admin'])) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view alerts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alerts</h2>
          <p className="text-muted-foreground">
            Monitor patient recovery outliers and critical events
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredAlerts.filter(a => a.severity === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {resolvedAlerts.filter(a => 
                a.resolvedAt && 
                new Date(a.resolvedAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully handled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All Alerts
        </Button>
        <Button
          variant={filter === 'critical' ? 'default' : 'outline'}
          onClick={() => setFilter('critical')}
          size="sm"
        >
          Critical
        </Button>
        <Button
          variant={filter === 'warning' ? 'default' : 'outline'}
          onClick={() => setFilter('warning')}
          size="sm"
        >
          Warning
        </Button>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Patients showing concerning recovery patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load alerts. Please try again.
              </AlertDescription>
            </Alert>
          ) : filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`rounded-lg border p-4 ${
                    alert.severity === 'critical' 
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' 
                      : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900'
                      }`}>
                        {severityIcons[alert.severity]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-sm">
                            Patient Recovery Alert
                          </h4>
                          <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>{alert.metric}</strong> shows {alert.deviationValue} point deviation from cohort mean
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>Patient ID: {alert.patientId}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Activity className="h-3 w-3" />
                            <span>{alert.consecutiveOccurrences} consecutive occurrences</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(alert.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveAlert(alert.id)}
                        disabled={resolveAlertMutation.isPending}
                      >
                        {resolveAlertMutation.isPending ? (
                          <Clock className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        )}
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
              <p className="text-muted-foreground">
                All patients are within expected recovery parameters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Resolved */}
      {resolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Resolved</CardTitle>
            <CardDescription>
              Alerts that have been addressed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolvedAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {alert.metric} alert resolved
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Patient ID: {alert.patientId} • Resolved {alert.resolvedAt ? format(new Date(alert.resolvedAt), 'MMM d, yyyy') : 'recently'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Resolved
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}