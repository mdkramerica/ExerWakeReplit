import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, User, Stethoscope, ArrowLeft } from 'lucide-react';

const studyEnrollmentSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  alias: z.string().min(1, "Patient alias is required"),
  cohortId: z.number().min(1, "Cohort selection is required"),
  
  // Demographics (de-identified)
  ageGroup: z.enum(["18-25", "26-35", "36-45", "46-55", "56-65", "66-75"]),
  sex: z.enum(["M", "F", "Other"]),
  handDominance: z.enum(["Left", "Right", "Ambidextrous"]),
  occupationCategory: z.enum(["Office Work", "Manual Labor", "Healthcare", "Education", "Retail", "Other"]),
  
  // Surgery details
  surgeryDate: z.string().min(1, "Surgery date is required"),
  procedureCode: z.string().min(1, "Procedure code is required"),
  injuryType: z.string().min(1, "Injury type is required"),
  laterality: z.enum(["Left", "Right", "Bilateral"]),
  surgeonId: z.string().min(1, "Surgeon ID is required"),
});

type StudyEnrollmentData = z.infer<typeof studyEnrollmentSchema>;

interface Cohort {
  id: number;
  name: string;
  description: string;
}

export default function StudyEnrollment() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<StudyEnrollmentData>({
    resolver: zodResolver(studyEnrollmentSchema),
    defaultValues: {
      patientId: '',
      alias: '',
      cohortId: 0,
      ageGroup: '26-35',
      sex: 'M',
      handDominance: 'Right',
      occupationCategory: 'Other',
      surgeryDate: '',
      procedureCode: '',
      laterality: 'Right',
      surgeonId: '',
      injuryType: '',
    },
  });

  const enrollPatientMutation = useMutation({
    mutationFn: async (data: StudyEnrollmentData) => {
      return apiRequest('/api/patients/enroll-study', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          enrolledInStudy: true,
          studyEnrollmentDate: new Date().toISOString(),
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Patient Enrolled",
        description: `${data.alias} has been successfully enrolled in the study.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setLocation('/clinical/patients');
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll patient in study.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StudyEnrollmentData) => {
    enrollPatientMutation.mutate(data);
  };

  // Fetch cohorts from API instead of hardcoding
  const { data: cohortsData } = useQuery({
    queryKey: ['/api/cohorts']
  });

  const cohorts: Cohort[] = cohortsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/clinical/patients')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Study Enrollment</h2>
          <p className="text-muted-foreground">
            Enroll a new patient in the HAND-HEAL longitudinal study
          </p>
        </div>
      </div>

      {/* Enrollment Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Patient Information</span>
          </CardTitle>
          <CardDescription>
            All data is de-identified and HIPAA compliant. Use only anonymous patient identifiers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient ID</FormLabel>
                      <FormControl>
                        <Input placeholder="PT001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="alias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Anonymous Patient A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cohort Selection */}
              <FormField
                control={form.control}
                name="cohortId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Cohort</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select study cohort" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cohorts.map((cohort) => (
                          <SelectItem key={cohort.id} value={cohort.id.toString()}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Demographics */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Demographics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Group</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="18-25">18-25 years</SelectItem>
                            <SelectItem value="26-35">26-35 years</SelectItem>
                            <SelectItem value="36-45">36-45 years</SelectItem>
                            <SelectItem value="46-55">46-55 years</SelectItem>
                            <SelectItem value="56-65">56-65 years</SelectItem>
                            <SelectItem value="66-75">66-75 years</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M">Male</SelectItem>
                            <SelectItem value="F">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="handDominance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hand Dominance</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Right">Right</SelectItem>
                            <SelectItem value="Left">Left</SelectItem>
                            <SelectItem value="Ambidextrous">Ambidextrous</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="occupationCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Office Work">Office Work</SelectItem>
                            <SelectItem value="Manual Labor">Manual Labor</SelectItem>
                            <SelectItem value="Healthcare">Healthcare</SelectItem>
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Retail">Retail</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Surgery Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5" />
                  <span>Surgery Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="surgeryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surgery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="procedureCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedure Code</FormLabel>
                        <FormControl>
                          <Input placeholder="CPT-64721" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="laterality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affected Side</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Right">Right</SelectItem>
                            <SelectItem value="Left">Left</SelectItem>
                            <SelectItem value="Bilateral">Bilateral</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surgeonId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surgeon ID</FormLabel>
                        <FormControl>
                          <Input placeholder="SURG001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="injuryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Injury Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select injury type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Trigger Finger">Trigger Finger</SelectItem>
                            <SelectItem value="Carpal Tunnel">Carpal Tunnel</SelectItem>
                            <SelectItem value="Distal Radius Fracture">Distal Radius Fracture</SelectItem>
                            <SelectItem value="CMC Arthroplasty">CMC Arthroplasty</SelectItem>
                            <SelectItem value="Metacarpal ORIF">Metacarpal ORIF</SelectItem>
                            <SelectItem value="Phalanx Fracture">Phalanx Fracture</SelectItem>
                            <SelectItem value="Radial Head Replacement">Radial Head Replacement</SelectItem>
                            <SelectItem value="Terrible Triad Injury">Terrible Triad Injury</SelectItem>
                            <SelectItem value="Dupuytren's Contracture">Dupuytren's Contracture</SelectItem>
                            <SelectItem value="Flexor Tendon Injury">Flexor Tendon Injury</SelectItem>
                            <SelectItem value="Extensor Tendon Injury">Extensor Tendon Injury</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <Button 
                  type="submit" 
                  disabled={enrollPatientMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>
                    {enrollPatientMutation.isPending ? 'Enrolling...' : 'Enroll in Study'}
                  </span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setLocation('/clinical/patients')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}