import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileJson,
  FileText as FilePdf
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReportData {
  id: string;
  name: string;
  type: 'patient' | 'study' | 'compliance' | 'analytics';
  description: string;
  lastGenerated: string;
  recordCount: number;
  status: 'ready' | 'generating' | 'error';
}

export default function ClinicalReports() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: cohorts } = useQuery({
    queryKey: ['/api/cohorts'],
  });

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    enabled: hasRole(['clinician', 'admin']),
  });

  // Mock report data - in real app this would come from API
  const reports: ReportData[] = [
    {
      id: 'patient-progress',
      name: 'Patient Progress Summary',
      type: 'patient',
      description: 'Comprehensive overview of all patient assessment progress',
      lastGenerated: '2025-06-20T14:30:00Z',
      recordCount: 127,
      status: 'ready'
    },
    {
      id: 'study-analytics',
      name: 'Study Analytics Report',
      type: 'study',
      description: 'Statistical analysis of study outcomes and trends',
      lastGenerated: '2025-06-20T10:15:00Z',
      recordCount: 89,
      status: 'ready'
    },
    {
      id: 'compliance-audit',
      name: 'Protocol Compliance Audit',
      type: 'compliance',
      description: 'Assessment of protocol adherence across all cohorts',
      lastGenerated: '2025-06-19T16:45:00Z',
      recordCount: 45,
      status: 'ready'
    },
    {
      id: 'longitudinal-trends',
      name: 'Longitudinal Trend Analysis',
      type: 'analytics',
      description: 'Long-term outcome trends and predictive insights',
      lastGenerated: '2025-06-20T08:20:00Z',
      recordCount: 203,
      status: 'ready'
    }
  ];

  const filteredReports = reports.filter(report => {
    if (reportType !== 'all' && report.type !== reportType) return false;
    return true;
  });

  const handleGenerateReport = async (reportId: string, format: string) => {
    setGenerating(reportId);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Report generated",
        description: `Your ${format.toUpperCase()} report has been generated successfully.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'generating':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'patient':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'study':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'compliance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'analytics':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clinical Reports</h2>
        <p className="text-muted-foreground">
          Generate and export comprehensive reports for patient assessments, study analytics, and compliance audits.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cohort-filter">Study Cohort</Label>
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  {cohorts?.map((cohort: any) => (
                    <SelectItem key={cohort.id} value={cohort.id.toString()}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type-filter">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="patient">Patient Reports</SelectItem>
                  <SelectItem value="study">Study Analytics</SelectItem>
                  <SelectItem value="compliance">Compliance Audits</SelectItem>
                  <SelectItem value="analytics">Trend Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available Reports</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        {/* Available Reports */}
        <TabsContent value="available" className="space-y-6">
          <div className="grid gap-6">
            {filteredReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>{report.name}</span>
                        <Badge className={getTypeColor(report.type)}>
                          {report.type}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {report.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(report.status)}
                      <span className="text-sm text-muted-foreground">
                        {report.recordCount} records
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Last generated: {format(new Date(report.lastGenerated), 'PPp')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(report.id, 'csv')}
                        disabled={generating === report.id}
                      >
                        {generating === report.id ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                        )}
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(report.id, 'xlsx')}
                        disabled={generating === report.id}
                      >
                        {generating === report.id ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                        )}
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(report.id, 'pdf')}
                        disabled={generating === report.id}
                      >
                        {generating === report.id ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FilePdf className="h-4 w-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Reports */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>
                Create custom reports with specific data fields and filters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input id="report-name" placeholder="Enter report name" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="data-fields">Data Fields</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fields to include" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient-demographics">Patient Demographics</SelectItem>
                        <SelectItem value="assessment-scores">Assessment Scores</SelectItem>
                        <SelectItem value="motion-data">Motion Data</SelectItem>
                        <SelectItem value="questionnaire-responses">Questionnaire Responses</SelectItem>
                        <SelectItem value="compliance-data">Compliance Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="output-format">Output Format</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="schedule">Schedule</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Generate Once</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Button className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Create Custom Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Manage automatically generated reports and their schedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Weekly Progress Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      Generated every Monday at 9:00 AM
                    </p>
                  </div>
                  <Badge>Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Monthly Analytics Report</h4>
                    <p className="text-sm text-muted-foreground">
                      Generated on the 1st of each month
                    </p>
                  </div>
                  <Badge>Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Compliance Audit</h4>
                    <p className="text-sm text-muted-foreground">
                      Generated quarterly
                    </p>
                  </div>
                  <Badge variant="secondary">Paused</Badge>
                </div>
              </div>
              
              <Button className="w-full mt-4" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Add Scheduled Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              Available report templates
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Patients with data
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Cohorts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cohorts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active study cohorts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Export</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h</div>
            <p className="text-xs text-muted-foreground">
              Hours ago
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}