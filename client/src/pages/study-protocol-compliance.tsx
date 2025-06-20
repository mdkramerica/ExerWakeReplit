import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertTriangle, CheckCircle, Clock, TrendingDown, Users } from 'lucide-react';

interface ComplianceMetrics {
  patientId: string;
  injuryType: string;
  enrollmentDate: string;
  expectedVisits: number;
  completedVisits: number;
  missedVisits: number;
  adherenceRate: number;
  lastVisitDate: string;
  nextVisitDue: string;
  riskLevel: 'low' | 'moderate' | 'high';
  interventionsNeeded: string[];
}

export default function StudyProtocolCompliance() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('current');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const { data: patients } = useQuery({
    queryKey: ['/api/patients']
  });

  const { data: studyVisits } = useQuery({
    queryKey: ['/api/study-visits/all']
  });

  const { data: assessments } = useQuery({
    queryKey: ['/api/patient-assessments/all']
  });

  const studyPatients = patients?.filter((p: any) => p.enrolledInStudy) || [];

  // Calculate compliance metrics for each patient
  const complianceData: ComplianceMetrics[] = useMemo(() => {
    return studyPatients.map((patient: any) => {
      const patientVisits = studyVisits?.filter((v: any) => v.patientId === patient.id) || [];
      const completedVisits = patientVisits.filter((v: any) => v.visitStatus === 'completed').length;
      const missedVisits = patientVisits.filter((v: any) => v.visitStatus === 'missed').length;
      const expectedVisits = 13; // 13 weeks total
      
      const adherenceRate = (completedVisits / expectedVisits) * 100;
      
      // Determine risk level
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (adherenceRate < 60 || missedVisits >= 4) {
        riskLevel = 'high';
      } else if (adherenceRate < 80 || missedVisits >= 2) {
        riskLevel = 'moderate';
      }
      
      // Determine interventions needed
      const interventionsNeeded: string[] = [];
      if (missedVisits >= 2) interventionsNeeded.push('Contact patient');
      if (adherenceRate < 70) interventionsNeeded.push('Review protocol');
      if (riskLevel === 'high') interventionsNeeded.push('Case manager review');
      
      const lastVisit = patientVisits
        .filter((v: any) => v.visitStatus === 'completed')
        .sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
      
      const nextVisit = patientVisits
        .filter((v: any) => v.visitStatus === 'scheduled')
        .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
      
      return {
        patientId: patient.patientId,
        injuryType: patient.injuryType,
        enrollmentDate: patient.studyEnrollmentDate,
        expectedVisits,
        completedVisits,
        missedVisits,
        adherenceRate,
        lastVisitDate: lastVisit?.scheduledDate || 'None',
        nextVisitDue: nextVisit?.scheduledDate || 'None',
        riskLevel,
        interventionsNeeded
      };
    });
  }, [studyPatients, studyVisits]);

  // Filter by risk level
  const filteredData = useMemo(() => {
    if (riskFilter === 'all') return complianceData;
    return complianceData.filter(d => d.riskLevel === riskFilter);
  }, [complianceData, riskFilter]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalPatients = complianceData.length;
    const highRisk = complianceData.filter(d => d.riskLevel === 'high').length;
    const moderateRisk = complianceData.filter(d => d.riskLevel === 'moderate').length;
    const lowRisk = complianceData.filter(d => d.riskLevel === 'low').length;
    const avgAdherence = complianceData.reduce((sum, d) => sum + d.adherenceRate, 0) / totalPatients;
    const totalMissedVisits = complianceData.reduce((sum, d) => sum + d.missedVisits, 0);
    
    return {
      totalPatients,
      highRisk,
      moderateRisk,
      lowRisk,
      avgAdherence,
      totalMissedVisits
    };
  }, [complianceData]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Study Protocol Compliance</h2>
          <p className="text-muted-foreground">
            Phase 2: Patient adherence monitoring and intervention tracking
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="moderate">Moderate Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Study participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryMetrics.highRisk}</div>
            <p className="text-xs text-muted-foreground">
              Need intervention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderate Risk</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryMetrics.moderateRisk}</div>
            <p className="text-xs text-muted-foreground">
              Monitor closely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryMetrics.lowRisk}</div>
            <p className="text-xs text-muted-foreground">
              Good compliance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Adherence</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.avgAdherence.toFixed(1)}%</div>
            <Progress value={summaryMetrics.avgAdherence} className="mt-1 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalMissedVisits}</div>
            <p className="text-xs text-muted-foreground">
              Total across study
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Compliance Details</CardTitle>
          <CardDescription>
            Individual patient adherence rates and intervention needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredData.map((patient, index) => (
              <div key={patient.patientId} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{patient.patientId}</Badge>
                    <div>
                      <div className="font-medium">{patient.injuryType}</div>
                      <div className="text-sm text-muted-foreground">
                        Enrolled: {new Date(patient.enrollmentDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={getRiskColor(patient.riskLevel)} variant="outline">
                    {patient.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold">{patient.completedVisits}/{patient.expectedVisits}</div>
                    <div className="text-xs text-muted-foreground">Visits Completed</div>
                  </div>
                  
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className={`text-lg font-bold ${getAdherenceColor(patient.adherenceRate)}`}>
                      {patient.adherenceRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Adherence Rate</div>
                  </div>
                  
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-red-600">{patient.missedVisits}</div>
                    <div className="text-xs text-muted-foreground">Missed Visits</div>
                  </div>
                  
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-sm font-medium">
                      {patient.nextVisitDue !== 'None' 
                        ? new Date(patient.nextVisitDue).toLocaleDateString()
                        : 'Complete'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Next Visit</div>
                  </div>
                </div>
                
                {patient.interventionsNeeded.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Interventions Needed:</div>
                    <div className="flex flex-wrap gap-2">
                      {patient.interventionsNeeded.map((intervention, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {intervention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-3">
                  <Progress value={patient.adherenceRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
          <CardDescription>
            Protocol interventions based on compliance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            
            {/* High Risk Patients */}
            {summaryMetrics.highRisk > 0 && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Immediate Action Required</span>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  {summaryMetrics.highRisk} patients are at high risk for study dropout. 
                  Contact these patients within 24 hours to address barriers to participation.
                </p>
                <Button variant="destructive" size="sm">
                  Generate Contact List
                </Button>
              </div>
            )}
            
            {/* Moderate Risk Patients */}
            {summaryMetrics.moderateRisk > 0 && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Enhanced Monitoring</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  {summaryMetrics.moderateRisk} patients need closer monitoring. 
                  Schedule additional check-ins and review protocol adherence.
                </p>
                <Button variant="outline" size="sm">
                  Schedule Check-ins
                </Button>
              </div>
            )}
            
            {/* Overall Study Health */}
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Study Health Assessment</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Overall adherence rate of {summaryMetrics.avgAdherence.toFixed(1)}% 
                {summaryMetrics.avgAdherence >= 80 ? ' meets' : ' is below'} target threshold (80%).
                {summaryMetrics.avgAdherence < 80 && ' Consider protocol modifications or additional support resources.'}
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Protocol Review
                </Button>
                <Button variant="outline" size="sm">
                  Export Compliance Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}