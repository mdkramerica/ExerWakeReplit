import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Play, Eye, Calendar, History, RotateCcw, TrendingUp } from "lucide-react";
import { useLocation, Link } from "wouter";
import AssessmentReplay from "@/components/assessment-replay";
import { getInjuryIcon } from "@/components/medical-icons";

interface Assessment {
  id: number;
  name: string;
  description: string;
  videoUrl: string | null;
  duration: number;
  repetitions: number | null;
  instructions: string | null;
  isActive: boolean | null;
  orderIndex: number;
  isCompleted?: boolean;
  completedAt?: string;
}

interface UserProgress {
  completed: number;
  total: number;
  percentage: number;
}

interface UserAssessment {
  id: number;
  assessmentName: string;
  completedAt: string;
  totalActiveRom?: string;
  indexFingerRom?: string;
  middleFingerRom?: string;
  ringFingerRom?: string;
  pinkyFingerRom?: string;
  maxMcpAngle?: string;
  maxPipAngle?: string;
  maxDipAngle?: string;
}

export default function AssessmentList() {
  const [, navigate] = useLocation();
  const [showReplay, setShowReplay] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get user code from URL path - handle both /assessments and /assessment-list/:code routes
  const pathParts = window.location.pathname.split('/');
  const userCode = pathParts[1] === 'assessment-list' ? pathParts[2] : null;

  // If user is on /assessments without a code, redirect to patient access page
  React.useEffect(() => {
    if (pathParts[1] === 'assessments' && !userCode) {
      navigate('/patient');
    }
  }, [pathParts, userCode, navigate]);

  // First get user data using the code to get the actual user ID
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: [`/api/users/by-code/${userCode}`],
    enabled: !!userCode,
  });

  const userId = userData?.user?.id;

  const { data: assessmentData, isLoading: assessmentsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/assessments`],
    enabled: !!userId,
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: [`/api/users/${userId}/progress`],
    enabled: !!userId,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: [`/api/users/${userId}/history`],
    enabled: !!userId,
  });

  const isLoading = userLoading || assessmentsLoading || progressLoading || historyLoading;

  // Debug logging
  console.log('Assessment List Debug:', {
    userCode,
    userData,
    userId,
    pathParts,
    assessmentData,
    progressData,
    historyData
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assessmentData?.assessments) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent className="pt-6">
            <p className="text-gray-600">No assessment data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessments: Assessment[] = assessmentData.assessments;
  const sortedAssessments = [...assessments].sort((a, b) => a.orderIndex - b.orderIndex);
  const nextAssessment = sortedAssessments.find(a => !a.isCompleted);
  const allCompleted = assessments.length > 0 && assessments.every(a => a.isCompleted);
  
  // Calculate days remaining based on study duration
  const injuryType = userData.user.injuryType;
  const studyDuration = injuryType === 'Trigger Finger' || injuryType === 'Metacarpal ORIF' || injuryType === 'Phalanx Fracture' ? 28 : 84;
  const createdDate = new Date(userData.user.createdAt);
  const currentDate = new Date();
  const daysSinceStart = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, studyDuration - daysSinceStart);
  const currentDay = daysSinceStart + 1;

  if (showReplay) {
    // Check if it's the new format with ID:NAME or just a value
    const isNewFormat = showReplay.includes(':');
    let userAssessmentId: string | undefined;
    let assessmentName: string;
    
    if (isNewFormat) {
      const [id, name] = showReplay.split(':');
      userAssessmentId = id;
      assessmentName = name;
    } else {
      // Legacy format - check if it's numeric (user assessment ID) or text (assessment name)
      const isUserAssessmentId = !isNaN(parseInt(showReplay));
      userAssessmentId = isUserAssessmentId ? showReplay : undefined;
      assessmentName = isUserAssessmentId ? "Motion Replay" : showReplay;
    }
    
    return (
      <AssessmentReplay
        assessmentName={assessmentName}
        userAssessmentId={userAssessmentId}
        onClose={() => setShowReplay(null)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Central Navigation Hub */}
      <Card className="medical-card mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getInjuryIcon(userData?.user?.injuryType)}
                Your Recovery Dashboard
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Track your progress and complete assessments for {userData?.user?.injuryType || 'your condition'}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              Code: {userCode}
            </Badge>
          </div>
          
          {/* Central Navigation Buttons */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
            <Link href="/daily-assessments">
              <Button variant="default" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Daily Assessments
              </Button>
            </Link>
            <Link href="/progress">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Progress Charts
              </Button>
            </Link>
            <Link href={`/assessment-list/${userCode}`}>
              <Button variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                All Assessments
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      <Card className="medical-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Your Assessments</CardTitle>
              <p className="text-sm text-gray-800 mt-1">
                Complete each assessment by watching the instruction video and recording your range of motion.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <div className="text-right">
                <div className="text-sm text-gray-800">Progress</div>
                <div className="text-2xl font-bold text-blue-600">
                  {progressData.completed}/{progressData.total}
                </div>
              </div>
            </div>
          </div>
          <Progress value={progressData.percentage} className="w-full" />
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {sortedAssessments.map((assessment) => (
              <div key={assessment.id} className="assessment-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      {(() => {
                        const IconComponent = getInjuryIcon(assessment.name);
                        return <IconComponent className="w-6 h-6 text-blue-600" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{assessment.name}</h3>
                      <p className="text-sm text-gray-800">{assessment.description}</p>
                      {assessment.isCompleted && assessment.completedAt && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-700">
                            Completed {new Date(assessment.completedAt).toLocaleDateString()}, {new Date(assessment.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {assessment.isCompleted ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-700">
                        Pending
                      </Badge>
                    )}
                    
                    {assessment.isCompleted ? (
                      <div className="flex gap-2">
                        {/* Special routing for wrist assessments */}
                        {assessment.name.toLowerCase().includes('wrist') ? (
                          (() => {
                            const userAssessment = historyData?.history?.find((h: any) => h.assessmentName === assessment.name);
                            return userAssessment ? (
                              <Link href={`/wrist-results/${userCode}/${userAssessment.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  View Details
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const historySection = document.getElementById('patient-history');
                                  if (historySection) {
                                    historySection.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                View Results
                              </Button>
                            );
                          })()
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const historySection = document.getElementById('patient-history');
                              if (historySection) {
                                historySection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            View Results
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => navigate(`/assessment/${assessment.id}/video/${userCode}`)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Redo Assessment
                        </Button>
                      </div>
                    ) : assessment.id === nextAssessment?.id ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/assessment/${assessment.id}/video/${userCode}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Start Assessment
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-gray-400 border-gray-200 cursor-not-allowed"
                      >
                        Locked
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {allCompleted && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900">All Assessments Complete!</h3>
                    <p className="text-sm text-green-800 mt-1">
                      Great job! You've completed all assessments. Review your results below.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient History Section */}
      {historyData.history && historyData.history.length > 0 && (
        <Card id="patient-history" className="medical-card mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <History className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Patient History</CardTitle>
                <p className="text-sm text-gray-800">All recorded assessments in chronological order</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {historyData.history.map((record: UserAssessment, index: number) => (
                <div
                  key={record.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-green-700">
                          {historyData.history.length - index}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{record.assessmentName}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-800 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(record.completedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(record.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {record.handType && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Hand:</span>
                              <span>{record.handType}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* TAM Assessment ROM Breakdown */}
                        {record.assessmentName?.includes('TAM') && (record.indexFingerRom || record.middleFingerRom || record.ringFingerRom || record.pinkyFingerRom) && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Total ROM by Finger</div>
                            <div className="flex gap-3">
                              <div className={`px-3 py-2 rounded-lg border-2 ${
                                record.indexFingerRom && (parseFloat(record.indexFingerRom) < 240 || parseFloat(record.indexFingerRom) > 280)
                                  ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                              }`}>
                                <div className={`font-bold text-xs ${
                                  record.indexFingerRom && (parseFloat(record.indexFingerRom) < 240 || parseFloat(record.indexFingerRom) > 280)
                                    ? 'text-red-700' : 'text-gray-700'
                                }`}>Index</div>
                                <div className={`font-bold text-lg ${
                                  record.indexFingerRom && (parseFloat(record.indexFingerRom) < 240 || parseFloat(record.indexFingerRom) > 280)
                                    ? 'text-red-900' : 'text-gray-900'
                                }`}>
                                  {record.indexFingerRom ? parseFloat(record.indexFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                              <div className={`px-3 py-2 rounded-lg border-2 ${
                                record.middleFingerRom && (parseFloat(record.middleFingerRom) < 240 || parseFloat(record.middleFingerRom) > 280)
                                  ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                              }`}>
                                <div className={`font-bold text-xs ${
                                  record.middleFingerRom && (parseFloat(record.middleFingerRom) < 240 || parseFloat(record.middleFingerRom) > 280)
                                    ? 'text-red-700' : 'text-gray-700'
                                }`}>Middle</div>
                                <div className={`font-bold text-lg ${
                                  record.middleFingerRom && (parseFloat(record.middleFingerRom) < 240 || parseFloat(record.middleFingerRom) > 280)
                                    ? 'text-red-900' : 'text-gray-900'
                                }`}>
                                  {record.middleFingerRom ? parseFloat(record.middleFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                              <div className={`px-3 py-2 rounded-lg border-2 ${
                                record.ringFingerRom && (parseFloat(record.ringFingerRom) < 240 || parseFloat(record.ringFingerRom) > 280)
                                  ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                              }`}>
                                <div className={`font-bold text-xs ${
                                  record.ringFingerRom && (parseFloat(record.ringFingerRom) < 240 || parseFloat(record.ringFingerRom) > 280)
                                    ? 'text-red-700' : 'text-gray-700'
                                }`}>Ring</div>
                                <div className={`font-bold text-lg ${
                                  record.ringFingerRom && (parseFloat(record.ringFingerRom) < 240 || parseFloat(record.ringFingerRom) > 280)
                                    ? 'text-red-900' : 'text-gray-900'
                                }`}>
                                  {record.ringFingerRom ? parseFloat(record.ringFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                              <div className={`px-3 py-2 rounded-lg border-2 ${
                                record.pinkyFingerRom && (parseFloat(record.pinkyFingerRom) < 220 || parseFloat(record.pinkyFingerRom) > 260)
                                  ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                              }`}>
                                <div className={`font-bold text-xs ${
                                  record.pinkyFingerRom && (parseFloat(record.pinkyFingerRom) < 220 || parseFloat(record.pinkyFingerRom) > 260)
                                    ? 'text-red-700' : 'text-purple-700'
                                }`}>Pinky</div>
                                <div className={`font-bold text-lg ${
                                  record.pinkyFingerRom && (parseFloat(record.pinkyFingerRom) < 220 || parseFloat(record.pinkyFingerRom) > 260)
                                    ? 'text-red-900' : 'text-purple-900'
                                }`}>
                                  {record.pinkyFingerRom ? parseFloat(record.pinkyFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                Quality: <span className="font-medium">100%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kapandji Score Breakdown */}
                        {record.assessmentName?.includes('Kapandji') && record.totalActiveRom !== null && record.totalActiveRom !== undefined && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Kapandji Opposition Score</div>
                            <div className="flex gap-3">
                              <div className={`px-4 py-3 rounded-lg border-2 ${
                                parseFloat(record.totalActiveRom) < 8 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
                              }`}>
                                <div className={`font-bold text-xs ${
                                  parseFloat(record.totalActiveRom) < 8 ? 'text-red-700' : 'text-green-700'
                                }`}>Score</div>
                                <div className={`font-bold text-2xl ${
                                  parseFloat(record.totalActiveRom) < 8 ? 'text-red-900' : 'text-green-900'
                                }`}>
                                  {Math.round(parseFloat(record.totalActiveRom))}/10
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                Quality: <span className="font-medium">{record.qualityScore || 100}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => userCode && navigate(`/assessment-results/${userCode}/${record.id}`)}
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                        title="View Assessment Results"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setShowReplay(`${record.id}:${record.assessmentName || 'Assessment'}`)}
                        className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
                        title="View Motion Replay"
                      >
                        <Play className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}