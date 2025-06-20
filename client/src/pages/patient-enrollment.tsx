import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserPlus, CheckCircle, AlertCircle, Calendar, Phone, User } from 'lucide-react';

const patientFormSchema = z.object({
  patientId: z.string().min(3, 'Patient ID must be at least 3 characters'),
  alias: z.string().min(2, 'Alias must be at least 2 characters'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other', '']).optional(),
  injuryDate: z.string().optional(),
  cohortId: z.number().min(1, 'Please select a cohort'),
  eligibilityNotes: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

interface Cohort {
  id: number;
  name: string;
  description: string;
}

interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export default function PatientEnrollment() {
  const [step, setStep] = useState<'create' | 'eligibility' | 'enroll'>('create');
  const [patientId, setPatientId] = useState<number | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      patientId: '',
      alias: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      injuryDate: '',
      eligibilityNotes: '',
    },
  });

  const { data: cohorts } = useQuery({
    queryKey: ['/api/cohorts'],
    select: (data: Cohort[]) => data || [],
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const response = await apiRequest('POST', '/api/patients', {
        patientId: data.patientId,
        alias: data.alias,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        injuryDate: data.injuryDate || null,
        cohortId: data.cohortId,
        eligibilityNotes: data.eligibilityNotes || null,
      });
      return response.json();
    },
    onSuccess: (patient) => {
      setPatientId(patient.id);
      setStep('eligibility');
      toast({
        title: "Patient Created",
        description: `Patient ${patient.alias} has been created with access code: ${patient.accessCode}`,
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkEligibilityMutation = useMutation({
    mutationFn: async ({ patientId, cohortId }: { patientId: number; cohortId: number }) => {
      const response = await apiRequest('GET', `/api/patients/${patientId}/eligibility/${cohortId}`, null);
      return response.json();
    },
    onSuccess: (result: EligibilityResult) => {
      setEligibilityResult(result);
      if (result.eligible) {
        setStep('enroll');
      }
    },
  });

  const enrollPatientMutation = useMutation({
    mutationFn: async ({ patientId, cohortId, enrollmentStatus, eligibilityNotes }: {
      patientId: number;
      cohortId: number;
      enrollmentStatus: string;
      eligibilityNotes?: string;
    }) => {
      const response = await apiRequest('POST', `/api/patients/${patientId}/enroll`, {
        cohortId,
        enrollmentStatus,
        eligibilityNotes,
      });
      return response.json();
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Enrollment Complete",
        description: `Patient ${patient.alias} has been successfully enrolled in the study.`,
      });
      // Reset form
      form.reset();
      setStep('create');
      setPatientId(null);
      setEligibilityResult(null);
    },
    onError: () => {
      toast({
        title: "Enrollment Failed",
        description: "Failed to enroll patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  const handleCheckEligibility = () => {
    const cohortId = form.getValues('cohortId');
    if (patientId && cohortId) {
      checkEligibilityMutation.mutate({ patientId, cohortId });
    }
  };

  const handleEnroll = () => {
    const cohortId = form.getValues('cohortId');
    const eligibilityNotes = form.getValues('eligibilityNotes');
    
    if (patientId && cohortId) {
      enrollPatientMutation.mutate({
        patientId,
        cohortId,
        enrollmentStatus: 'enrolled',
        eligibilityNotes,
      });
    }
  };

  const handleExclude = () => {
    const cohortId = form.getValues('cohortId');
    const eligibilityNotes = form.getValues('eligibilityNotes');
    
    if (patientId && cohortId) {
      enrollPatientMutation.mutate({
        patientId,
        cohortId,
        enrollmentStatus: 'excluded',
        eligibilityNotes,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <UserPlus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Patient Enrollment</h1>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'create' ? 'bg-primary text-primary-foreground' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="text-sm font-medium">Create Patient</span>
        </div>
        <div className="flex-1 h-px bg-gray-200"></div>
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'eligibility' ? 'bg-primary text-primary-foreground' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="text-sm font-medium">Check Eligibility</span>
        </div>
        <div className="flex-1 h-px bg-gray-200"></div>
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'enroll' ? 'bg-primary text-primary-foreground' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="text-sm font-medium">Enroll</span>
        </div>
      </div>

      {step === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Patient Information</span>
            </CardTitle>
            <CardDescription>
              Enter patient details and select study cohort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID *</Label>
                  <Input
                    id="patientId"
                    {...form.register('patientId')}
                    placeholder="PT001"
                  />
                  {form.formState.errors.patientId && (
                    <p className="text-sm text-red-500">{form.formState.errors.patientId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias *</Label>
                  <Input
                    id="alias"
                    {...form.register('alias')}
                    placeholder="John D."
                  />
                  {form.formState.errors.alias && (
                    <p className="text-sm text-red-500">{form.formState.errors.alias.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...form.register('phone')}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...form.register('dateOfBirth')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select onValueChange={(value) => form.setValue('gender', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="injuryDate">Injury Date</Label>
                  <Input
                    id="injuryDate"
                    type="date"
                    {...form.register('injuryDate')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cohortId">Study Cohort *</Label>
                <Select onValueChange={(value) => form.setValue('cohortId', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select study cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts?.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id.toString()}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.cohortId && (
                  <p className="text-sm text-red-500">{form.formState.errors.cohortId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibilityNotes">Notes</Label>
                <Textarea
                  id="eligibilityNotes"
                  {...form.register('eligibilityNotes')}
                  placeholder="Additional notes about patient eligibility..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? 'Creating Patient...' : 'Create Patient'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'eligibility' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Eligibility Check</span>
            </CardTitle>
            <CardDescription>
              Verify patient eligibility for study enrollment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!eligibilityResult ? (
              <Button
                onClick={handleCheckEligibility}
                disabled={checkEligibilityMutation.isPending}
                className="w-full"
              >
                {checkEligibilityMutation.isPending ? 'Checking Eligibility...' : 'Check Eligibility'}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert className={eligibilityResult.eligible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center space-x-2">
                      <Badge variant={eligibilityResult.eligible ? 'default' : 'destructive'}>
                        {eligibilityResult.eligible ? 'Eligible' : 'Not Eligible'}
                      </Badge>
                    </div>
                    {eligibilityResult.reasons.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {eligibilityResult.reasons.map((reason, index) => (
                          <li key={index} className="text-sm">• {reason}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>

                {eligibilityResult.eligible ? (
                  <div className="flex space-x-2">
                    <Button onClick={handleEnroll} className="flex-1">
                      Enroll Patient
                    </Button>
                    <Button variant="outline" onClick={handleExclude} className="flex-1">
                      Exclude Patient
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={handleExclude} className="w-full">
                    Mark as Excluded
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'enroll' && eligibilityResult?.eligible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Finalize Enrollment</span>
            </CardTitle>
            <CardDescription>
              Complete patient enrollment in the study
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Patient is eligible for enrollment. Click below to complete the enrollment process.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button
                onClick={handleEnroll}
                disabled={enrollPatientMutation.isPending}
                className="flex-1"
              >
                {enrollPatientMutation.isPending ? 'Enrolling...' : 'Confirm Enrollment'}
              </Button>
              <Button variant="outline" onClick={() => setStep('create')} className="flex-1">
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}