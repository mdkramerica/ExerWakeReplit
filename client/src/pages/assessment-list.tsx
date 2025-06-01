import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Lock, Play, Eye, Clock } from "lucide-react";
import ProgressBar from "@/components/progress-bar";
import AssessmentReplay from "@/components/assessment-replay";
import type { AssessmentWithProgress } from "@/types/assessment";

export default function AssessmentList() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showReplay, setShowReplay] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: [`/api/users/${currentUser?.id}/assessments`],
    enabled: !!currentUser,
  });

  const { data: progressData } = useQuery({
    queryKey: [`/api/users/${currentUser?.id}/progress`],
    enabled: !!currentUser,
  });

  const handleStartAssessment = (assessmentId: number) => {
    setLocation(`/assessment/${assessmentId}/video`);
  };

  const handleViewAssessment = (assessmentId: number) => {
    // Could show detailed results or allow retake
    setLocation(`/assessment/${assessmentId}/video`);
  };

  const handleBack = () => {
    if (currentUser?.isFirstTime && !currentUser?.injuryType) {
      setLocation("/injury-selection");
    } else {
      setLocation("/");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent>
            <div className="text-center py-8">Loading assessments...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessments: AssessmentWithProgress[] = assessmentsData?.assessments || [];
  const progress = progressData || { completed: 0, total: 0, percentage: 0 };

  // Find next assessment to do
  const nextAssessment = assessments.find(a => !a.isCompleted);
  const allCompleted = assessments.length > 0 && assessments.every(a => a.isCompleted);

  if (showReplay) {
    return (
      <AssessmentReplay
        assessmentName={showReplay}
        onClose={() => setShowReplay(null)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="medical-card">
        <CardContent>
          <div className="mb-8">
            <ProgressBar currentStep={2} totalSteps={3} />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Assessments</h2>
                <p className="text-medical-gray">
                  Complete each assessment by watching the instruction video and recording your range of motion.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-medical-gray">Progress</div>
                <div className="text-2xl font-semibold text-medical-blue">
                  {progress.completed}/{progress.total}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {assessments.map((assessment, index) => {
              const isCompleted = assessment.isCompleted;
              const isNext = assessment.id === nextAssessment?.id;
              const isLocked = !isCompleted && !isNext;

              return (
                <div
                  key={assessment.id}
                  className={`assessment-card ${
                    isCompleted ? "completed border-green-200 bg-green-50" :
                    isNext ? "active border-2 border-medical-blue bg-blue-50" :
                    "locked opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isCompleted ? "bg-medical-success text-white" :
                        isNext ? "bg-medical-blue text-white" :
                        "bg-gray-200 text-gray-400"
                      }`}>
                        {isCompleted ? (
                          <Check className="w-6 h-6" />
                        ) : isNext ? (
                          <Play className="w-6 h-6" />
                        ) : (
                          <Lock className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className={`font-medium ${isLocked ? "text-gray-600" : "text-gray-900"}`}>
                          {assessment.name}
                        </h3>
                        <p className={`text-sm ${isLocked ? "text-gray-400" : "text-medical-gray"}`}>
                          {assessment.description}
                        </p>
                        <div className="flex items-center mt-1 text-xs">
                          {isCompleted && assessment.completedAt ? (
                            <div className="flex items-center text-medical-success">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>
                                Completed {new Date(assessment.completedAt).toLocaleString()}
                              </span>
                            </div>
                          ) : isNext ? (
                            <div className="flex items-center text-medical-blue">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>Est. 3-5 minutes</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <Lock className="w-3 h-3 mr-1" />
                              <span>Unlocks after previous assessment</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isCompleted ? "bg-green-100 text-green-800" :
                        isNext ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {isCompleted ? "Complete" : isNext ? "Next" : "Locked"}
                      </span>
                      {isCompleted ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewAssessment(assessment.id)}
                            className="text-medical-gray hover:text-medical-blue p-2"
                            title="View Results"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowReplay(assessment.userAssessmentId ? assessment.userAssessmentId.toString() : assessment.name)}
                            className="text-medical-gray hover:text-medical-blue p-2"
                            title="View Motion Replay"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isNext ? (
                        <Button
                          onClick={() => handleStartAssessment(assessment.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors border-0"
                          style={{ backgroundColor: '#2563eb', color: 'white' }}
                        >
                          Start
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allCompleted && (
            <div className="text-center mb-8">
              <Button
                onClick={() => setLocation("/thank-you")}
                className="medical-button"
              >
                View Results
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center px-4 py-2 text-medical-gray hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="text-sm text-medical-gray">
                Questions? Contact your healthcare provider
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
