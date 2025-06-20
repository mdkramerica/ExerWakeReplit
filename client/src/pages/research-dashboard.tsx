import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Download, FileText, BarChart3, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface StudyMetrics {
  totalEnrolled: number;
  activeParticipants: number;
  completedStudies: number;
  adherenceRate: number;
  enrollmentRate: number;
  dataQualityScore: number;
}

interface PublicationData {
  title: string;
  status: 'draft' | 'submitted' | 'under-review' | 'accepted' | 'published';
  journal: string;
  submissionDate: string;
  authors: string[];
}

export default function ResearchDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('6-months');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');

  const { data: patients } = useQuery({
    queryKey: ['/api/patients']
  });

  const { data: assessments } = useQuery({
    queryKey: ['/api/patient-assessments/all']
  });

  const { data: cohorts } = useQuery({
    queryKey: ['/api/cohorts']
  });

  const studyPatients = patients?.filter((p: any) => p.enrolledInStudy) || [];
  const studyAssessments = assessments?.filter((a: any) => 
    studyPatients.some((p: any) => p.id === a.patientId)
  ) || [];

  // Calculate study metrics
  const studyMetrics: StudyMetrics = useMemo(() => {
    const totalEnrolled = studyPatients.length;
    const activeParticipants = studyPatients.filter((p: any) => (p.studyWeek || 0) <= 12).length;
    const completedStudies = studyPatients.filter((p: any) => (p.studyWeek || 0) > 12).length;
    
    // Calculate adherence rate
    const expectedAssessments = totalEnrolled * 13; // 13 weeks per patient
    const completedAssessments = studyAssessments.length;
    const adherenceRate = expectedAssessments > 0 ? (completedAssessments / expectedAssessments) * 100 : 0;
    
    // Calculate enrollment rate (patients per month)
    const enrollmentRate = 8.5; // Simulated
    
    // Data quality score based on completeness
    const dataQualityScore = 92.4; // Simulated
    
    return {
      totalEnrolled,
      activeParticipants,
      completedStudies,
      adherenceRate,
      enrollmentRate,
      dataQualityScore
    };
  }, [studyPatients, studyAssessments]);

  // Sample publication pipeline data
  const publications: PublicationData[] = [
    {
      title: "Longitudinal Analysis of Hand Function Recovery Patterns in Post-Surgical Patients: A Multi-Cohort Study",
      status: "under-review",
      journal: "Journal of Hand Surgery",
      submissionDate: "2025-05-15",
      authors: ["Dr. Smith", "Dr. Johnson", "Dr. Brown"]
    },
    {
      title: "Predictive Modeling of Range of Motion Outcomes Using Machine Learning Approaches",
      status: "draft",
      journal: "Journal of Biomedical Informatics",
      submissionDate: "",
      authors: ["Dr. Wilson", "Dr. Davis", "Dr. Taylor"]
    },
    {
      title: "Demographic Factors Influencing Recovery Trajectories in Hand Surgery Patients",
      status: "submitted",
      journal: "Clinical Rehabilitation",
      submissionDate: "2025-06-01",
      authors: ["Dr. Anderson", "Dr. Smith", "Dr. Miller"]
    }
  ];

  // Sample grant proposals
  const grantProposals = [
    {
      title: "NIH R01: Advanced Motion Analysis for Rehabilitation Outcomes",
      amount: "$2.4M",
      status: "pending",
      deadline: "2025-07-31",
      pi: "Dr. Smith"
    },
    {
      title: "NSF Grant: AI-Powered Predictive Analytics in Clinical Settings",
      amount: "$850K",
      status: "approved",
      deadline: "2025-06-15",
      pi: "Dr. Johnson"
    }
  ];

  // Data export functionality
  const exportStudyData = (format: 'csv' | 'excel' | 'json') => {
    // Simulate data export
    console.log(`Exporting study data in ${format} format...`);
    // In real implementation, this would trigger API call for data export
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'under-review': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Research Dashboard</h2>
          <p className="text-muted-foreground">
            Phase 2: Comprehensive research analytics and publication pipeline
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportStudyData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Study Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMetrics.totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              Across {cohorts?.length || 0} cohorts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Studies</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMetrics.activeParticipants}</div>
            <p className="text-xs text-muted-foreground">
              Ongoing follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMetrics.completedStudies}</div>
            <p className="text-xs text-muted-foreground">
              12-week studies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adherence Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMetrics.adherenceRate.toFixed(1)}%</div>
            <Progress value={studyMetrics.adherenceRate} className="mt-1 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollment Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMetrics.enrollmentRate}</div>
            <p className="text-xs text-muted-foreground">
              patients/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMetrics.dataQualityScore}%</div>
            <Progress value={studyMetrics.dataQualityScore} className="mt-1 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="study-progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="study-progress">Study Progress</TabsTrigger>
          <TabsTrigger value="publications">Publications</TabsTrigger>
          <TabsTrigger value="data-exports">Data Management</TabsTrigger>
          <TabsTrigger value="grant-funding">Grant Funding</TabsTrigger>
        </TabsList>

        <TabsContent value="study-progress" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Enrollment Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Progress by Cohort</CardTitle>
                <CardDescription>
                  Patient recruitment across injury types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cohorts?.map((cohort: any) => {
                    const cohortPatients = studyPatients.filter((p: any) => p.cohortId === cohort.id);
                    const target = 50; // Target enrollment per cohort
                    const progress = (cohortPatients.length / target) * 100;
                    
                    return (
                      <div key={cohort.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{cohort.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {cohortPatients.length}/{target}
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Study Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Study Timeline & Milestones</CardTitle>
                <CardDescription>
                  Key milestones and upcoming deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <div className="font-medium">Phase 1 Enrollment</div>
                      <div className="text-sm text-muted-foreground">Completed January 2025</div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <div className="font-medium">Phase 2 Analytics Implementation</div>
                      <div className="text-sm text-muted-foreground">In Progress - June 2025</div>
                    </div>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <div className="flex-1">
                      <div className="font-medium">First Publication Submission</div>
                      <div className="text-sm text-muted-foreground">Target: July 2025</div>
                    </div>
                    <Calendar className="h-4 w-4 text-yellow-500" />
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <div className="flex-1">
                      <div className="font-medium">Phase 3 Expansion</div>
                      <div className="text-sm text-muted-foreground">Planned: September 2025</div>
                    </div>
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="publications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Publication Pipeline</CardTitle>
              <CardDescription>
                Research manuscripts and publication status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {publications.map((pub, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium leading-tight">{pub.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Target Journal: {pub.journal}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Authors: {pub.authors.join(', ')}
                        </p>
                        {pub.submissionDate && (
                          <p className="text-sm text-muted-foreground">
                            Submitted: {new Date(pub.submissionDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(pub.status)}>
                        {pub.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-exports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Data Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Data Export & Downloads</CardTitle>
                <CardDescription>
                  Export study data for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => exportStudyData('csv')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data (CSV)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => exportStudyData('excel')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data (Excel)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => exportStudyData('json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Raw Data (JSON)
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Custom Exports</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Demographic Data Only
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Outcome Measures Only
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Assessment Timeline Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Data Quality Assessment</CardTitle>
                <CardDescription>
                  Completeness and quality metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Baseline Data Completeness</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">96.2%</span>
                      <Progress value={96.2} className="w-16 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Follow-up Data Completeness</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">88.7%</span>
                      <Progress value={88.7} className="w-16 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Assessment Quality Score</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">94.1%</span>
                      <Progress value={94.1} className="w-16 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Validation Pass Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">99.3%</span>
                      <Progress value={99.3} className="w-16 h-2" />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Data Issues</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Missing assessments</span>
                      <span className="text-red-600">12 instances</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Incomplete questionnaires</span>
                      <span className="text-yellow-600">8 instances</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Data validation errors</span>
                      <span className="text-red-600">3 instances</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grant-funding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grant Proposals & Funding</CardTitle>
              <CardDescription>
                Research funding pipeline and opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {grantProposals.map((grant, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium">{grant.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Principal Investigator: {grant.pi}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Deadline: {new Date(grant.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{grant.amount}</div>
                        <Badge className={getStatusColor(grant.status)}>
                          {grant.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}