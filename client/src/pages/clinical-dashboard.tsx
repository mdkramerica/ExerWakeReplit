import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Calendar,
  Activity,
  FileText,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientWithDetails {
  id: number;
  patientId: string;
  alias: string;
  status: 'improving' | 'stable' | 'declining';
  cohort: {
    id: number;
    name: string;
  } | null;
  lastAssessment: {
    assessmentDate: string;
    percentOfNormalRom: number;
  } | null;
  assessmentCount: number;
}

interface OutlierAlert {
  id: number;
  patientId: number;
  alertType: string;
  severity: 'warning' | 'critical';
  metric: string;
  deviationValue: number;
  consecutiveOccurrences: number;
  createdAt: string;
}

const statusIcons = {
  improving: <TrendingUp className="h-4 w-4 text-green-500" />,
  stable: <Minus className="h-4 w-4 text-yellow-500" />,
  declining: <TrendingDown className="h-4 w-4 text-red-500" />,
};

const statusColors = {
  improving: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  stable: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  declining: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function ClinicalDashboard() {
  const { user, hasRole } = useAuth();

  const { data: patients, isLoading: patientsLoading, error: patientsError } = useQuery<PatientWithDetails[]>({
    queryKey: ['/api/patients'],
    enabled: hasRole(['clinician', 'admin']),
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<OutlierAlert[]>({
    queryKey: ['/api/alerts'],
    enabled: hasRole(['clinician', 'admin']),
  });

  const { data: cohorts, isLoading: cohortsLoading } = useQuery({
    queryKey: ['/api/cohorts'],
  });

  // Calculate dashboard stats
  const totalPatients = patients?.length || 0;
  const improvingPatients = patients?.filter(p => p.status === 'improving').length || 0;
  const decliningPatients = patients?.filter(p => p.status === 'declining').length || 0;
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;

  // Recent patients (last 5)
  const recentPatients = patients?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName}</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your patients today.
          </p>
        </div>
        {hasRole(['clinician', 'admin']) && (
          <div className="flex space-x-2">
            <Link href="/clinical/study/enroll">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Enroll in Study
              </Button>
            </Link>
            <Link href="/clinical/patients/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            {hasRole(['clinician', 'admin']) && (
              <p className="text-xs text-muted-foreground">
                Active in your care
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improving</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{improvingPatients}</div>
            <p className="text-xs text-muted-foreground">
              Showing progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{decliningPatients}</div>
            <p className="text-xs text-muted-foreground">
              Declining progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Patients */}
        {hasRole(['clinician', 'admin']) && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Patients</CardTitle>
              <CardDescription>
                Patients with recent assessment activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patientsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : patientsError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load patient data. Please try again.
                  </AlertDescription>
                </Alert>
              ) : recentPatients.length > 0 ? (
                <div className="space-y-3">
                  {recentPatients.map((patient, index) => (
                    <div key={`dashboard-patient-${patient.id}-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {statusIcons[patient.status]}
                        </div>
                        <div>
                          <Link href={`/clinical/patients/${patient.id}`}>
                            <p className="text-sm font-medium hover:underline cursor-pointer">
                              {patient.alias}
                            </p>
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {patient.cohort?.name || 'No cohort'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={statusColors[patient.status]}>
                          {patient.status}
                        </Badge>
                        {patient.lastAssessment && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(patient.lastAssessment.percentOfNormalRom)}% ROM
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <Link href="/clinical/patients">
                    <Button variant="outline" className="w-full mt-4">
                      View All Patients
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No patients found.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Critical Alerts */}
        {hasRole(['clinician', 'admin']) && (
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>
                Patients requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={`alert-${alert.id}`} className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                      <div className="flex items-start justify-between">
                        <div className="flex">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                          <div className="ml-2">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              Patient needs attention
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-300">
                              {alert.metric} deviation: {alert.deviationValue}
                            </p>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Link href="/clinical/alerts">
                    <Button variant="outline" className="w-full mt-4">
                      View All Alerts
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No critical alerts.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Researchers */}
        {hasRole(['researcher']) && (
          <Card>
            <CardHeader>
              <CardTitle>Research Tools</CardTitle>
              <CardDescription>
                Access cohort data and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/clinical/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Cohort Analytics
                </Button>
              </Link>
              <Link href="/clinical/reports">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Cohort Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Cohort Overview</CardTitle>
            <CardDescription>
              Active patient cohorts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cohortsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : cohorts && cohorts.length > 0 ? (
              <div className="space-y-2">
                {cohorts.slice(0, 5).map((cohort: any) => (
                  <div key={cohort.id} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">{cohort.name}</span>
                    <Badge variant="secondary">
                      {patients?.filter(p => p.cohort?.id === cohort.id).length || 0} patients
                    </Badge>
                  </div>
                ))}
                <Link href="/clinical/analytics">
                  <Button variant="outline" className="w-full mt-4">
                    View Analytics
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No cohorts available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}