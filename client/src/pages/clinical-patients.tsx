import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  Plus,
  Calendar,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';

interface PatientWithDetails {
  id: number;
  patientId: string;
  alias: string;
  status: 'improving' | 'stable' | 'declining';
  cohort: {
    id: number;
    name: string;
  } | null;
  assignedClinician: {
    firstName: string;
    lastName: string;
  } | null;
  lastAssessment: {
    assessmentDate: string;
    percentOfNormalRom: number;
  } | null;
  assessmentCount: number;
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

export default function ClinicalPatients() {
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');

  const { data: patients, isLoading: patientsLoading, error: patientsError } = useQuery<PatientWithDetails[]>({
    queryKey: ['/api/patients'],
  });

  const { data: cohorts } = useQuery({
    queryKey: ['/api/cohorts'],
  });

  // Filter patients based on search and filters
  const filteredPatients = patients?.filter(patient => {
    const matchesSearch = patient.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    
    const matchesCohort = cohortFilter === 'all' || 
                         (patient.cohort && patient.cohort.id.toString() === cohortFilter);
    
    return matchesSearch && matchesStatus && matchesCohort;
  }) || [];

  if (!hasRole(['clinician', 'admin'])) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view patient data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Patients</h2>
          <p className="text-muted-foreground">
            Manage and track patient progress
          </p>
        </div>
        <Link href="/clinical/patients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or patient ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="improving">Improving</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="declining">Declining</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by cohort" />
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
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patientsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
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
          ) : filteredPatients.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Assessment</TableHead>
                    <TableHead>ROM Progress</TableHead>
                    <TableHead>Clinician</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            {statusIcons[patient.status]}
                          </div>
                          <span>{patient.alias}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {patient.patientId}
                      </TableCell>
                      <TableCell>
                        {patient.cohort ? (
                          <Badge variant="outline">{patient.cohort.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">No cohort</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[patient.status]}>
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.lastAssessment ? (
                          <div className="text-sm">
                            <div>{format(new Date(patient.lastAssessment), 'MMM d, yyyy')}</div>
                            <div className="text-muted-foreground text-xs">
                              {patient.assessmentCount || 0} total assessments
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No assessments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.lastAssessment ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {patient.lastAssessment.percentOfNormalRom ? Math.round(Number(patient.lastAssessment.percentOfNormalRom)) : 0}%
                            </div>
                            <div className="text-muted-foreground text-xs">
                              of normal ROM
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.assignedClinician ? (
                          <span className="text-sm">
                            Dr. {patient.assignedClinician.lastName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/clinical/patients/${patient.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No patients found matching your criteria.</p>
              <Link href="/clinical/patients/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Patient
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}