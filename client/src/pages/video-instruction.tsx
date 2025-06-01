import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Play, Info, AlertTriangle, CheckCircle } from "lucide-react";
import ProgressBar from "@/components/progress-bar";
import { apiRequest } from "@/lib/queryClient";

export default function VideoInstruction() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const { data: assessmentData, isLoading } = useQuery({
    queryKey: [`/api/assessments/${id}`],
    enabled: !!id,
  });

  const startAssessmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/users/${currentUser.id}/assessments/${id}/start`);
      return response.json();
    },
  });

  const handleVideoPlay = () => {
    // In a real implementation, this would control actual video playback
    setVideoWatched(true);
  };

  const handleProceedToRecording = () => {
    startAssessmentMutation.mutate();
    setLocation(`/assessment/${id}/record`);
  };

  const handleBack = () => {
    setLocation("/assessments");
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent>
            <div className="text-center py-8">Loading assessment...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessment = assessmentData?.assessment;

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent>
            <div className="text-center py-8">Assessment not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="medical-card">
        <CardContent>
          <div className="mb-8">
            <ProgressBar currentStep={3} totalSteps={3} />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Assessment Instructions</h2>
            <p className="text-medical-gray">
              Watch the video carefully to understand how to perform the {assessment.name.toLowerCase()} assessment.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="bg-gray-900 rounded-xl aspect-video mb-6 relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450" 
                  alt={`Medical demonstration video showing ${assessment.name.toLowerCase()}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <button
                    onClick={handleVideoPlay}
                    className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all"
                  >
                    <Play className="w-6 h-6 text-blue-600 ml-1" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black bg-opacity-50 rounded-lg p-2">
                    <div className="flex items-center justify-between text-white text-sm">
                      <span>0:00</span>
                      <div className="flex-1 mx-3">
                        <div className="bg-gray-600 h-1 rounded">
                          <div className="bg-white h-1 rounded w-0"></div>
                        </div>
                      </div>
                      <span>2:30</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  onClick={handleProceedToRecording}
                  disabled={!videoWatched}
                  className="medical-button"
                >
                  Ready to Record
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-gray-600 mt-2">
                  Make sure you understand the movement before proceeding
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Info className="w-5 h-5 text-medical-blue mr-2" />
                  Assessment Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assessment:</span>
                    <span className="font-medium">{assessment.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{assessment.duration} seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Repetitions:</span>
                    <span className="font-medium">{assessment.repetitions} times</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-gray-600 mr-2" />
                  Important Reminders
                </h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                    Ensure good lighting and clear camera view
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                    Keep your hand in frame throughout the movement
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                    Move slowly and smoothly as demonstrated
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                    Stop if you experience pain or discomfort
                  </li>
                </ul>
              </div>

              {assessment.instructions && (
                <div className="bg-gray-100 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
                  <p className="text-sm text-gray-700">{assessment.instructions}</p>
                </div>
              )}

              <div className="text-center pt-4">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-900 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Assessment List
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
