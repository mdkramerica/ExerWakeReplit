import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Users, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import { getInjuryIcon } from '@/components/medical-icons';

interface Cohort {
  id: number;
  name: string;
  description: string;
  injuryType: string;
  targetRomImprovement: number;
  baselinePeriodDays: number;
}

interface Patient {
  id: number;
  patientId: string;
  alias: string;
  enrolledInStudy: boolean;
  injuryType: string;
  postOpDay?: number;
  studyWeek?: number;
}

export default function StudyCohortOverview() {
  const { data: cohorts } = useQuery<Cohort[]>({
    queryKey: ['/api/cohorts']
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ['/api/patients']
  });

  const studyPatients = patients?.filter(p => p.enrolledInStudy) || [];

  const getCohortStats = (cohortName: string) => {
    const cohortPatients = studyPatients.filter(p => p.injuryType === cohortName);
    const activePatients = cohortPatients.filter(p => (p.studyWeek || 0) <= 12);
    const completedPatients = cohortPatients.filter(p => (p.studyWeek || 0) > 12);
    
    return {
      total: cohortPatients.length,
      active: activePatients.length,
      completed: completedPatients.length,
      completionRate: cohortPatients.length > 0 ? (completedPatients.length / cohortPatients.length) * 100 : 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Study Cohort Overview</h2>
          <p className="text-muted-foreground">
            Comprehensive view of all injury type cohorts in the HAND-HEAL study
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cohorts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Injury type categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Participants</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyPatients.length}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled patients
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Studies</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studyPatients.filter(p => (p.studyWeek || 0) <= 12).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ongoing assessments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studyPatients.length > 0 
                ? Math.round((studyPatients.filter(p => (p.studyWeek || 0) > 12).length / studyPatients.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Studies completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts?.map((cohort) => {
          const stats = getCohortStats(cohort.name);
          const InjuryIcon = getInjuryIcon(cohort.name);
          
          return (
            <Card key={cohort.id} className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <InjuryIcon className="h-6 w-6 text-primary" />
                  <span className="text-lg">{cohort.name}</span>
                </CardTitle>
                <CardDescription>
                  {cohort.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Patient Count */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Patients</span>
                  <Badge variant="outline">{stats.total}</Badge>
                </div>
                
                {/* Active vs Completed */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span>{stats.completed} / {stats.total} completed</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>
                
                {/* Study Parameters */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target ROM Improvement</span>
                    <span className="font-medium">{cohort.targetRomImprovement}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Baseline Period</span>
                    <span className="font-medium">{cohort.baselinePeriodDays} days</span>
                  </div>
                </div>
                
                {/* Status Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{stats.active}</div>
                    <div className="text-xs text-blue-600">Active</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                </div>
                
                {/* Action Button */}
                <Link href={`/clinical/study/enroll?cohort=${cohort.id}`}>
                  <Button className="w-full" size="sm">
                    Enroll New Patient
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Injury Types Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Injury Type Coverage</CardTitle>
          <CardDescription>
            All injury types from the assessment overview are included in the study design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              "Trigger Finger",
              "Carpal Tunnel", 
              "Distal Radius Fracture",
              "CMC Arthroplasty",
              "Metacarpal ORIF",
              "Phalanx Fracture", 
              "Radial Head Replacement",
              "Terrible Triad Injury",
              "Dupuytren's Contracture",
              "Flexor Tendon Injury",
              "Extensor Tendon Injury"
            ].map((injuryType) => {
              const hasPatients = studyPatients.some(p => p.injuryType === injuryType);
              const InjuryIcon = getInjuryIcon(injuryType);
              
              return (
                <div key={injuryType} className="flex items-center space-x-2 p-2 rounded border">
                  <InjuryIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{injuryType}</span>
                  {hasPatients && (
                    <Badge variant="secondary" className="text-xs">
                      {studyPatients.filter(p => p.injuryType === injuryType).length}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}