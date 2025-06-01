import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import AssessmentReplay from "@/components/assessment-replay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, Activity } from "lucide-react";

export default function SharedAssessment() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/shared", token],
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
  const motionData = [];
  
  // Extract motion data from repetition data
  if (Array.isArray(userAssessment.repetitionData)) {
    userAssessment.repetitionData.forEach((rep: any) => {
      if (rep.motionData && Array.isArray(rep.motionData)) {
        motionData.push(...rep.motionData);
      }
    });
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Shared Motion Assessment
          </h1>
          <p className="text-lg text-gray-600">
            View recorded motion data and analysis results
          </p>
        </div>

        {/* Assessment Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {assessment.name}
            </CardTitle>
            <CardDescription>
              {assessment.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Completed: {userAssessment.completedAt ? formatDate(userAssessment.completedAt) : 'Not completed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Duration: {assessment.duration} seconds
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Quality Score: {userAssessment.qualityScore || 'N/A'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROM Results */}
        {userAssessment.totalActiveRom && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Range of Motion Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {userAssessment.maxMcpAngle || '0'}°
                  </p>
                  <p className="text-sm text-gray-600">MCP Angle</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {userAssessment.maxPipAngle || '0'}°
                  </p>
                  <p className="text-sm text-gray-600">PIP Angle</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {userAssessment.maxDipAngle || '0'}°
                  </p>
                  <p className="text-sm text-gray-600">DIP Angle</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {userAssessment.totalActiveRom || '0'}°
                  </p>
                  <p className="text-sm text-gray-600">Total Active ROM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Motion Replay */}
        {motionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Motion Replay</CardTitle>
              <CardDescription>
                Recorded hand tracking data with joint analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssessmentReplay
                assessmentName={assessment.name}
                recordingData={motionData}
                onClose={() => {}}
              />
            </CardContent>
          </Card>
        )}

        {/* Powered by */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Powered by ExerAI Medical Research Platform
          </p>
        </div>
      </div>
    </div>
  );
}