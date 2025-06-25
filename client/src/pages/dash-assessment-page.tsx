import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DashAssessment from '@/components/dash-assessment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PatientHeader } from '@/components/patient-header';

export default function DashAssessmentPage() {
  const [, setLocation] = useLocation();
  const [isCompleted, setIsCompleted] = useState(false);
  const [dashScore, setDashScore] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user data from sessionStorage
  const storedUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const userCode = storedUser.code || localStorage.getItem('currentUserCode') || 'DEMO01';
  const userId = storedUser.id || 1;

  const completeDashMutation = useMutation({
    mutationFn: async (data: { responses: Record<number, number>; dashScore: number }) => {
      return fetch(`/api/users/${userId}/assessments/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: 6, // DASH Survey assessment ID
          responses: data.responses,
          dashScore: data.dashScore,
          completedAt: new Date().toISOString()
        })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/history`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/progress`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${userCode}/daily-assessments`] });
      toast({
        title: "DASH Assessment Completed!",
        description: `Your disability score is ${dashScore?.toFixed(1)} points. Lower scores indicate better function.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save DASH assessment. Please try again.",
        variant: "destructive"
      });
      console.error('DASH completion error:', error);
    }
  });

  const handleComplete = (responses: Record<number, number>, score: number) => {
    setDashScore(score);
    completeDashMutation.mutate({ responses, dashScore: score });
    setIsCompleted(true);
  };

  const handleCancel = () => {
    setLocation(`/patient/${userCode}/dashboard`);
  };

  const handleReturnToDashboard = () => {
    setLocation(`/patient/${userCode}/dashboard`);
  };

  const getDashScoreInterpretation = (score: number) => {
    if (score <= 15) return { level: "Minimal", color: "text-green-600", description: "Little to no disability" };
    if (score <= 30) return { level: "Mild", color: "text-yellow-600", description: "Mild disability" };
    if (score <= 50) return { level: "Moderate", color: "text-orange-600", description: "Moderate disability" };
    if (score <= 70) return { level: "Severe", color: "text-red-600", description: "Severe disability" };
    return { level: "Extreme", color: "text-red-800", description: "Extreme disability" };
  };

  if (isCompleted && dashScore !== null) {
    const interpretation = getDashScoreInterpretation(dashScore);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <PatientHeader patientCode={userCode} />
        
        <div className="max-w-4xl mx-auto p-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                DASH Assessment Completed!
              </CardTitle>
              <CardDescription className="text-green-700">
                Thank you for completing your disability assessment
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {dashScore.toFixed(1)} / 100
                </div>
                <div className="text-lg">
                  <span className={`font-semibold ${interpretation.color}`}>
                    {interpretation.level} Disability
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {interpretation.description}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">Understanding Your Score:</h3>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• <span className="text-green-600 font-medium">0-15:</span> Minimal disability - excellent function</li>
                  <li>• <span className="text-yellow-600 font-medium">16-30:</span> Mild disability - good function with minor limitations</li>
                  <li>• <span className="text-orange-600 font-medium">31-50:</span> Moderate disability - some functional limitations</li>
                  <li>• <span className="text-red-600 font-medium">51-70:</span> Severe disability - significant functional impairment</li>
                  <li>• <span className="text-red-800 font-medium">71-100:</span> Extreme disability - major functional limitations</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Next Assessment:</strong> Complete your next DASH assessment in one week to track your recovery progress. 
                  You'll receive a reminder on your dashboard.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <Button onClick={handleReturnToDashboard} className="min-w-[200px]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientHeader patientCode={userCode} />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                DASH Assessment Instructions
              </CardTitle>
              <CardDescription>
                The DASH questionnaire measures your ability to perform certain activities and symptoms in your arm, shoulder, and hand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">What to Expect:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 30 questions about daily activities</li>
                    <li>• Each question rated from 1-5</li>
                    <li>• Takes about 5-10 minutes to complete</li>
                    <li>• Answer at least 27 questions to get a valid score</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Scoring:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Lower scores = better function</li>
                    <li>• Higher scores = more disability</li>
                    <li>• Range: 0-100 points</li>
                    <li>• Track progress over time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DashAssessment 
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}