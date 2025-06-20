import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth';

interface PatientAssessment {
  id: number;
  assessmentDate: string;
  tamScore: number;
  kapandjiScore: number;
  wristFlexionAngle: number;
  wristExtensionAngle: number;
  percentOfNormalRom: number;
  changeFromBaseline: number;
  deviceConfidenceScore: number;
  isCompleted: boolean;
}

interface PatientDetails {
  id: number;
  patientId: string;
  alias: string;
  status: 'improving' | 'stable' | 'declining';
  cohort: {
    id: number;
    name: string;
    description: string;
  } | null;
  assignedClinician: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  assessmentCount: number;
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

export default function PatientDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();

  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<PatientDetails>({
    queryKey: [`/api/patients/${id}`],
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery<PatientAssessment[]>({
    queryKey: [`/api/patients/${id}/assessments`],
    enabled: !!id,
  });

  if (!hasRole(['clinician', 'admin'])) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view patient details.
        </AlertDescription>
      </Alert>
    );
  }

  if (patientLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (patientError || !patient) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load patient data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const chartData = assessments?.map(assessment => ({
    date: format(new Date(assessment.assessmentDate), 'MMM d'),
    fullDate: assessment.assessmentDate,
    tamScore: assessment.tamScore,
    kapandjiScore: assessment.kapandjiScore,
    wristFlexion: assessment.wristFlexionAngle,
    wristExtension: assessment.wristExtensionAngle,
    romPercent: assessment.percentOfNormalRom,
  })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()) || [];

  const latestAssessment = assessments?.[0];
  const progressTrend = latestAssessment?.changeFromBaseline || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/clinical/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {statusIcons[patient.status]}
              {patient.alias}
            </h2>
            <p className="text-muted-foreground">
              Patient ID: {patient.patientId}
            </p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Patient Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[patient.status]}>
              {patient.status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Current recovery status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cohort</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {patient.cohort?.name || 'No cohort'}
            </div>
            <p className="text-xs text-muted-foreground">
              {patient.cohort?.description || 'Patient not assigned to cohort'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patient.assessmentCount}</div>
            <p className="text-xs text-muted-foreground">
              Since {format(new Date(patient.createdAt), 'MMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            {progressTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${progressTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {progressTrend >= 0 ? '+' : ''}{progressTrend.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Change from baseline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ROM Progress Over Time</CardTitle>
            <CardDescription>
              Range of motion improvement tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? format(new Date(item.fullDate), 'MMM d, yyyy') : label;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="romPercent" 
                    stroke="#8884d8" 
                    name="% of Normal ROM"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No assessment data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Metrics</CardTitle>
            <CardDescription>
              TAM, Kapandji, and wrist measurements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? format(new Date(item.fullDate), 'MMM d, yyyy') : label;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tamScore" 
                    stroke="#82ca9d" 
                    name="TAM Score"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="kapandjiScore" 
                    stroke="#ffc658" 
                    name="Kapandji Score"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No assessment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>
            Latest assessment results and measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessmentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : assessments && assessments.length > 0 ? (
            <div className="space-y-4">
              {assessments.slice(0, 5).map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(new Date(assessment.assessmentDate), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(assessment.assessmentDate), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex space-x-4 text-sm">
                      <span>TAM: {assessment.tamScore?.toFixed(1) || 'N/A'}</span>
                      <span>Kapandji: {assessment.kapandjiScore?.toFixed(1) || 'N/A'}</span>
                      <span>ROM: {assessment.percentOfNormalRom?.toFixed(0) || 'N/A'}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {assessment.deviceConfidenceScore?.toFixed(1) || 'N/A'}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assessments recorded yet.</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Record First Assessment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}