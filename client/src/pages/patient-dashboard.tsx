import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Activity, CheckCircle, AlertTriangle, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

interface PatientDashboardData {
  id: number;
  patientId: string;
  alias: string;
  injuryType: string;
  enrolledDate: string;
  accessCode: string;
  assessmentsCompleted: number;
  totalAssessments: number;
  lastAssessmentDate: string | null;
  lastAssessmentType: string | null;
  status: 'Active' | 'Complete' | 'Overdue' | 'New';
  daysSinceEnrollment: number;
}

interface DashboardMetrics {
  totalPatients: number;
  activePatients: number;
  completedPatients: number;
  overduePatients: number;
}

interface AssessmentDetail {
  id: number;
  name: string;
  completedAt: string;
  score: number | null;
  notes: string | null;
}

export default function PatientDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [injuryFilter, setInjuryFilter] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientDashboardData | null>(null);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/patients/dashboard'],
  });

  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
  });

  const { data: patientDetails } = useQuery({
    queryKey: ['/api/patients', selectedPatient?.id, 'assessments'],
    enabled: !!selectedPatient,
  });

  const patients = dashboardData?.patients || [];
  const dashboardMetrics = metrics || {
    totalPatients: 0,
    activePatients: 0,
    completedPatients: 0,
    overduePatients: 0
  };

  // Filter patients based on search and filters
  const filteredPatients = patients.filter((patient: PatientDashboardData) => {
    const matchesSearch = 
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.injuryType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.accessCode.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || patient.status.toLowerCase() === statusFilter;
    const matchesInjury = injuryFilter === "all" || patient.injuryType === injuryFilter;
    
    return matchesSearch && matchesStatus && matchesInjury;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      'Active': 'default',
      'Complete': 'success',
      'Overdue': 'destructive',
      'New': 'secondary'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const uniqueInjuryTypes = [...new Set(patients.map((p: PatientDashboardData) => p.injuryType))];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
          <p className="text-muted-foreground">Overview of all enrolled patients and their assessment progress</p>
        </div>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalPatients}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.activePatients}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.completedPatients}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.overduePatients}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            placeholder="Search by Patient ID, Alias, Injury Type, or Access Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="new">New</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={injuryFilter} onValueChange={setInjuryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Injury" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Injuries</SelectItem>
              {uniqueInjuryTypes.map((injury: string) => (
                <SelectItem key={injury} value={injury}>{injury}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Overview</CardTitle>
          <CardDescription>Click on a patient row to view detailed assessment history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Access Code</TableHead>
                <TableHead>Injury Type</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Assessment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient: PatientDashboardData) => (
                <Dialog key={patient.id}>
                  <DialogTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{patient.patientId}</TableCell>
                      <TableCell>{patient.alias}</TableCell>
                      <TableCell className="font-mono text-sm">{patient.accessCode}</TableCell>
                      <TableCell>{patient.injuryType}</TableCell>
                      <TableCell>
                        {format(new Date(patient.enrolledDate), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {patient.daysSinceEnrollment} days ago
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            {patient.assessmentsCompleted}/{patient.totalAssessments}
                          </div>
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(patient.assessmentsCompleted / patient.totalAssessments) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.lastAssessmentDate ? (
                          <div>
                            <div className="font-medium">{patient.lastAssessmentType}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(patient.lastAssessmentDate), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No assessments</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(patient.status)}</TableCell>
                    </TableRow>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Patient Details: {patient.patientId} - {patient.alias}</DialogTitle>
                      <DialogDescription>
                        Access Code: {patient.accessCode} | Injury: {patient.injuryType}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Enrollment Information</h4>
                          <div className="space-y-1 text-sm">
                            <div>Enrolled: {format(new Date(patient.enrolledDate), 'PPP')}</div>
                            <div>Days since enrollment: {patient.daysSinceEnrollment}</div>
                            <div>Status: {getStatusBadge(patient.status)}</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Assessment Progress</h4>
                          <div className="space-y-1 text-sm">
                            <div>Completed: {patient.assessmentsCompleted}/{patient.totalAssessments}</div>
                            <div>Progress: {Math.round((patient.assessmentsCompleted / patient.totalAssessments) * 100)}%</div>
                            {patient.lastAssessmentDate && (
                              <div>Last: {patient.lastAssessmentType} on {format(new Date(patient.lastAssessmentDate), 'MMM dd, yyyy')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {patientDetails?.assessments && (
                        <div>
                          <h4 className="font-semibold mb-2">Assessment History</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Assessment</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {patientDetails.assessments.map((assessment: AssessmentDetail) => (
                                <TableRow key={assessment.id}>
                                  <TableCell>{assessment.name}</TableCell>
                                  <TableCell>{format(new Date(assessment.completedAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                                  <TableCell>{assessment.score || 'N/A'}</TableCell>
                                  <TableCell className="max-w-xs truncate">{assessment.notes || 'No notes'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </TableBody>
          </Table>
          
          {filteredPatients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No patients found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}