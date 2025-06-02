import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Hand, Lightbulb, Square, RotateCcw } from "lucide-react";
import ProgressBar from "@/components/progress-bar";
import ExerAIHandler from "@/components/mediapipe-handler";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateCurrentROM, calculateMaxROM, type JointAngles } from "@/lib/rom-calculator";
import { calculateFingerROM } from "@shared/rom-calculator";

export default function Recording() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRepetition, setCurrentRepetition] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [trackingQuality, setTrackingQuality] = useState("Poor");
  const [handPosition, setHandPosition] = useState("Not Detected");
  const [detectedHandType, setDetectedHandType] = useState<string>("");
  const [recordedData, setRecordedData] = useState<any[]>([]);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[]>([]);
  const [recordingMotionData, setRecordingMotionData] = useState<any[]>([]);
  const recordingMotionDataRef = useRef<any[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [currentROM, setCurrentROM] = useState<JointAngles>({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });
  const [maxROM, setMaxROM] = useState<JointAngles>({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });
  const [allFingersROM, setAllFingersROM] = useState({
    index: { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 },
    middle: { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 },
    ring: { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 },
    pinky: { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 }
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      console.log('Loaded user from sessionStorage:', user);
      setCurrentUser(user);
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const { data: assessmentData } = useQuery({
    queryKey: [`/api/assessments/${id}`],
    enabled: !!id,
  });

  const completeAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/users/${currentUser.id}/assessments/${id}/complete`, data);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate both assessment list and progress queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/assessments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/progress`] });
      
      const userAssessmentId = data?.userAssessment?.id;
      
      toast({
        title: "Assessment Complete!",
        description: "Your range of motion data has been recorded successfully.",
      });
      
      // Navigate to detailed results page if we have an assessment ID
      if (userAssessmentId) {
        setLocation(`/assessment-results/${currentUser.code}/${userAssessmentId}`);
      } else {
        setLocation(`/assessment-list/${currentUser.code}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save assessment data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const assessment = assessmentData?.assessment;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer(prev => {
          if (prev <= 0) {
            setIsRecording(false);
            // Delay clearing start time to allow final motion data capture
            setTimeout(() => {
              recordingStartTimeRef.current = null;
              handleRepetitionComplete();
            }, 100);
            return assessment?.duration || 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, assessment?.duration]);

  const startRecording = () => {
    // Start countdown
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Start actual recording after countdown
          const startTime = Date.now();
          console.log(`Recording started after countdown - setting start time to ${startTime}`);
          recordingStartTimeRef.current = startTime;
          setIsRecording(true);
          setRecordingTimer(assessment?.duration || 10);
          setRecordingMotionData([]);
          recordingMotionDataRef.current = [];
          setMaxROM({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });
          setCountdown(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Delay clearing start time to allow final motion data capture
    setTimeout(() => {
      recordingStartTimeRef.current = null;
      handleRepetitionComplete();
    }, 100);
  };

  const handleRepetitionComplete = () => {
    console.log(`Repetition ${currentRepetition} completed with ${recordingMotionData.length} motion frames (state) and ${recordingMotionDataRef.current.length} motion frames (ref)`);
    
    // Calculate final ROM values from recorded motion data
    const finalMaxROM = recordingMotionDataRef.current.length > 0 
      ? calculateMaxROM(recordingMotionDataRef.current) 
      : maxROM;

    // Calculate actual duration from motion data timestamps
    const actualDuration = recordingMotionDataRef.current.length > 0 
      ? Math.round((recordingMotionDataRef.current[recordingMotionDataRef.current.length - 1].timestamp - recordingMotionDataRef.current[0].timestamp) / 1000)
      : assessment?.duration || 10;

    const repetitionData = {
      repetition: currentRepetition,
      duration: actualDuration,
      landmarksDetected: landmarksCount,
      qualityScore: calculateQualityScore(),
      timestamp: new Date().toISOString(),
      motionData: [...recordingMotionDataRef.current], // Use ref data for immediate access
      romData: finalMaxROM // Include ROM calculations
    };

    const newRecordedData = [...recordedData, repetitionData];
    setRecordedData(newRecordedData);

    // Assessment complete after 1 repetition - pass data directly
    completeAssessment(newRecordedData);
  };

  const calculateQualityScore = () => {
    // Simple quality calculation based on tracking metrics
    let score = 0;
    if (landmarksCount === 21) score += 40;
    if (handDetected) score += 30;
    if (trackingQuality === "Excellent") score += 30;
    else if (trackingQuality === "Good") score += 20;
    else if (trackingQuality === "Fair") score += 10;
    return Math.min(score, 100);
  };

  const completeAssessment = (finalRecordedData = recordedData) => {
    const romData = {
      assessmentId: id,
      repetitionsCompleted: currentRepetition,
      totalDuration: finalRecordedData.reduce((sum, rep) => sum + rep.duration, 0),
      averageQuality: finalRecordedData.length > 0 ? finalRecordedData.reduce((sum, rep) => sum + rep.qualityScore, 0) / finalRecordedData.length : 0
    };

    console.log(`Completing assessment with ${finalRecordedData.length} repetitions:`, finalRecordedData);

    completeAssessmentMutation.mutate({
      romData,
      repetitionData: finalRecordedData,
      qualityScore: romData.averageQuality,
      handType: detectedHandType
    });
  };

  const retakeRecording = () => {
    setCurrentRepetition(1);
    setRecordedData([]);
    setRecordingTimer(0);
    setIsRecording(false);
  };

  const handleMediaPipeUpdate = (data: any) => {
    const currentTime = Date.now();
    const recordingElapsed = recordingStartTimeRef.current ? (currentTime - recordingStartTimeRef.current) / 1000 : 0;
    
    console.log(`MediaPipe update: handDetected=${data.handDetected}, landmarks=${data.landmarks ? data.landmarks.length : 'none'}, isRecording=${isRecording}, elapsed=${recordingElapsed.toFixed(1)}s, startTime=${recordingStartTimeRef.current}`);
    console.log(`Current user injury type: ${currentUser?.injuryType}`);
    
    setHandDetected(data.handDetected);
    setLandmarksCount(data.landmarksCount);
    setTrackingQuality(data.trackingQuality);
    setHandPosition(data.handPosition);
    
    // Update detected hand type
    if (data.handType) {
      setDetectedHandType(data.handType);
    }
    
    // Store current landmarks for recording
    if (data.landmarks && data.landmarks.length > 0) {
      setCurrentLandmarks(data.landmarks);
      
      // Calculate real-time ROM for all fingers
      if (data.landmarks.length >= 21) {
        try {
          // Calculate ROM for all individual fingers
          const indexROM = calculateFingerROM(data.landmarks, 'INDEX');
          const middleROM = calculateFingerROM(data.landmarks, 'MIDDLE');
          const ringROM = calculateFingerROM(data.landmarks, 'RING');
          const pinkyROM = calculateFingerROM(data.landmarks, 'PINKY');
          
          // Update all fingers ROM state
          setAllFingersROM({
            index: indexROM,
            middle: middleROM,
            ring: ringROM,
            pinky: pinkyROM
          });
          
          // Also calculate trigger finger specific ROM for compatibility
          const romData = calculateCurrentROM(data.landmarks);
          setCurrentROM(romData);
          
          // Update max ROM values during recording
          if (isRecording) {
            setMaxROM(prev => {
              const updated = {
                mcpAngle: Math.max(prev.mcpAngle, romData.mcpAngle),
                pipAngle: Math.max(prev.pipAngle, romData.pipAngle),
                dipAngle: Math.max(prev.dipAngle, romData.dipAngle),
                totalActiveRom: Math.max(prev.totalActiveRom, romData.totalActiveRom)
              };
              return updated;
            });
          }
        } catch (error) {
          console.error('ROM calculation error:', error);
        }
      }
      
      // Capture motion data if we're within the recording period (0-10 seconds)
      if (recordingStartTimeRef.current && recordingElapsed > 0 && recordingElapsed <= 10 && data.handDetected && data.landmarks && data.landmarks.length > 0) {
        console.log(`Recording motion data: ${data.landmarks.length} landmarks detected, elapsed: ${recordingElapsed.toFixed(1)}s`);
        const motionFrame = {
          timestamp: currentTime,
          landmarks: data.landmarks.map((landmark: any) => ({
            x: parseFloat(landmark.x) || 0,
            y: parseFloat(landmark.y) || 0,
            z: parseFloat(landmark.z) || 0
          })),
          handedness: "Right",
          quality: data.trackingQuality === "Excellent" ? 90 : data.trackingQuality === "Good" ? 70 : 50
        };
        
        setRecordingMotionData(prev => {
          const newData = [...prev, motionFrame];
          console.log(`Total motion frames captured: ${newData.length}`);
          return newData;
        });
        
        // Also update ref for immediate access
        recordingMotionDataRef.current.push(motionFrame);
      } else if (recordingStartTimeRef.current && recordingElapsed > 0 && recordingElapsed <= 10) {
        console.log(`Recording period but no valid landmarks: handDetected=${data.handDetected}, landmarks=${data.landmarks ? data.landmarks.length : 'none'}, elapsed=${recordingElapsed.toFixed(1)}s`);
      }
    }
  };

  const formatTime = (seconds: number) => {
    return `00:${seconds.toString().padStart(2, '0')}`;
  };

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
    <div className="max-w-7xl mx-auto">
      <Card className="medical-card">
        <CardContent>
          <div className="mb-8">
            <ProgressBar currentStep={3} totalSteps={3} />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Recording Assessment</h2>
                <p className="text-gray-800">
                  Position your hand in the camera view and perform the {assessment.name.toLowerCase()} movement.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-800">Repetition</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {currentRepetition}/{assessment.repetitions}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Camera View */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-xl aspect-video relative overflow-hidden mb-4">
                <ExerAIHandler
                  onUpdate={handleMediaPipeUpdate}
                  isRecording={isRecording}
                  assessmentType={assessment.name}
                />
                
                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full recording-indicator"></div>
                    <span className="text-white text-sm font-medium">Recording</span>
                  </div>
                )}
                
                {/* Hand detection feedback */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-lg p-2">
                  <div className="flex items-center space-x-2 text-white text-sm">
                    <Hand className={`w-4 h-4 ${handDetected ? 'text-green-500' : 'text-red-500'}`} />
                    <span>{handDetected ? 'Hand Detected' : 'No Hand'}</span>
                  </div>
                </div>
                
                {/* Countdown Timer - More prominent */}
                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="text-center">
                      <div className="text-8xl font-bold text-white mb-4 countdown-animation">
                        {countdown}
                      </div>
                      <div className="text-2xl text-white">Get Ready!</div>
                    </div>
                  </div>
                )}

                {/* Recording Timer */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
                  <div className="bg-black bg-opacity-75 rounded-lg px-6 py-3 border-2 border-white">
                    <div className="text-white text-3xl font-mono font-bold">
                      {formatTime(recordingTimer)}
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Recording Controls - More prominent and always visible */}
              <div className="flex items-center justify-center space-x-6 mt-6 p-4 bg-gray-50 rounded-lg">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    disabled={!handDetected}
                    className="bg-red-500 text-white w-20 h-20 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    className="bg-red-500 text-white w-20 h-20 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg animate-pulse"
                  >
                    <Square className="w-8 h-8" />
                  </Button>
                )}
                
                <div className="flex flex-col items-center">
                  <Button
                    onClick={retakeRecording}
                    variant="outline"
                    className="px-8 py-4 text-lg"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Retake
                  </Button>
                  <span className="text-sm text-gray-600 mt-2">
                    {!handDetected ? "Position hand to enable recording" : "Ready to record"}
                  </span>
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Assessment Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 text-lg mb-2">{assessment.name}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{assessment.instructions}</p>
              </div>

              {/* Hand Status - Simplified */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Hand Tracking</h4>
                  <div className={`w-3 h-3 rounded-full ${handDetected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Hand Detected</div>
                    <div className={`font-bold ${detectedHandType ? 'text-green-600' : 'text-gray-500'}`}>
                      {detectedHandType || 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Landmarks</div>
                    <div className={`font-bold ${landmarksCount === 21 ? 'text-green-600' : 'text-red-500'}`}>
                      {landmarksCount}/21
                    </div>
                  </div>
                </div>
              </div>

              {/* ROM Display - Detailed */}
              {currentUser?.injuryType === 'Trigger Finger' && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Range of Motion (Live)</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-blue-600 font-medium">MCP</div>
                      <div className="text-lg font-bold text-blue-900">{currentROM.mcpAngle.toFixed(0)}°</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-green-600 font-medium">PIP</div>
                      <div className="text-lg font-bold text-green-900">{currentROM.pipAngle.toFixed(0)}°</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <div className="text-purple-600 font-medium">DIP</div>
                      <div className="text-lg font-bold text-purple-900">{currentROM.dipAngle.toFixed(0)}°</div>
                    </div>
                    <div className="text-center p-2 bg-gray-100 rounded">
                      <div className="text-gray-600 font-medium">Total</div>
                      <div className="text-lg font-bold text-gray-900">{currentROM.totalActiveRom.toFixed(0)}°</div>
                    </div>
                  </div>

                  {isRecording && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="text-center p-3 bg-green-100 rounded">
                        <div className="text-green-700 font-medium text-sm">Session Maximum</div>
                        <div className="text-2xl font-bold text-green-800">{maxROM.totalActiveRom.toFixed(0)}°</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                  Tips
                </h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Keep hand steady and visible</li>
                  <li>• Move slowly and smoothly</li>
                  <li>• Complete the full range of motion</li>
                  <li>• Stop if you feel pain</li>
                </ul>
              </div>

              {/* Progress */}
              <div className="text-center">
                <div className="text-sm text-medical-gray mb-2">Assessment Progress</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-medical-blue h-2 rounded-full transition-all"
                    style={{ width: `${(currentRepetition / assessment.repetitions) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-medical-gray mt-1">
                  Recording assessment (10 seconds)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
