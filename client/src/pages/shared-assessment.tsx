import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import AssessmentReplay from "@/components/assessment-replay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SharedAssessment() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/shared/${token}`],
    enabled: !!token
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading shared assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Assessment Not Found</CardTitle>
            <CardDescription>
              This shared assessment link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'} 
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userAssessment, assessment } = data;
  const motionData: any[] = [];
  
  // Extract motion data from repetition data
  if (Array.isArray(userAssessment.repetitionData)) {
    userAssessment.repetitionData.forEach((rep: any) => {
      if (rep.motionData && Array.isArray(rep.motionData)) {
        motionData.push(...rep.motionData);
      }
    });
  }

  // Go directly to motion replay if motion data exists
  if (motionData.length > 0) {
    return (
      <AssessmentReplay
        assessmentName={assessment?.name || 'Shared Assessment'}
        recordingData={motionData}
        onClose={() => window.location.href = '/'}
      />
    );
  }

  // Fallback if no motion data
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No Motion Data</CardTitle>
          <CardDescription>
            This shared assessment does not contain motion replay data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.href = '/'} 
            className="w-full"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}