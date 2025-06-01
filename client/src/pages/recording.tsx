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

export default function Recording() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRepetition, setCurrentRepetition] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [trackingQuality, setTrackingQuality] = useState("Poor");
  const [handPosition, setHandPosition] = useState("Not Detected");
  const [recordedData, setRecordedData] = useState<any[]>([]);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[]>([]);
  const [recordingMotionData, setRecordingMotionData] = useState<any[]>([]);
  const recordingMotionDataRef = useRef<any[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [currentROM, setCurrentROM] = useState<JointAngles>({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });
  const [maxROM, setMaxROM] = useState<JointAngles>({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });
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
        setLocation(`/results/${userAssessmentId}`);
      } else {
        setLocation("/assessments");
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
          if (prev >= (assessment?.duration || 10)) {
            setIsRecording(false);
            // Delay clearing start time to allow final motion data capture
            setTimeout(() => {
              recordingStartTimeRef.current = null;
              handleRepetitionComplete();
            }, 100);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, assessment?.duration]);

  const startRecording = () => {
    const startTime = Date.now();
    console.log(`startRecording called - setting start time to ${startTime}`);
    recordingStartTimeRef.current = startTime; // Set start time first using ref
    setIsRecording(true);
    setRecordingTimer(0);
    setRecordingMotionData([]); // Clear previous motion data
    recordingMotionDataRef.current = []; // Clear ref data too
    // Reset ROM values for new recording
    setMaxROM({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });
    console.log(`Recording state set: isRecording=true, startTime=${recordingStartTimeRef.current}`);
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

    const repetitionData = {
      repetition: currentRepetition,
      duration: recordingTimer,
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
      qualityScore: romData.averageQuality
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
    
    // Store current landmarks for recording
    if (data.landmarks && data.landmarks.length > 0) {
      setCurrentLandmarks(data.landmarks);
      
      // Calculate real-time ROM for trigger finger assessment
      // Check both exact match and contains for flexibility
      const isTriggerFingerAssessment = currentUser?.injuryType === 'Trigger Finger' || 
                                       assessment?.name?.includes('TAM') || 
                                       assessment?.name?.includes('Total Active Motion');
      
      if (isTriggerFingerAssessment && data.landmarks.length >= 21) {
        try {
          const romData = calculateCurrentROM(data.landmarks);
          console.log('ROM calculated for trigger finger:', romData);
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
              console.log('Max ROM updated during recording:', updated);
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
                <p className="text-medical-gray">
                  Position your hand in the camera view and perform the {assessment.name.toLowerCase()} movement.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-medical-gray">Repetition</div>
                <div className="text-2xl font-semibold text-medical-blue">
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
                    <Hand className={`w-4 h-4 ${handDetected ? 'text-medical-success' : 'text-red-500'}`} />
                    <span>{handDetected ? 'Hand Detected' : 'No Hand'}</span>
                  </div>
                </div>
                
                {/* Timer */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
                    <div className="text-white text-2xl font-mono">
                      {formatTime(recordingTimer)}
                    </div>
                  </div>
                </div>

                {/* Real-time ROM Display on Video for Trigger Finger */}
                {currentUser?.injuryType === 'Trigger Finger' && handDetected && (
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 rounded-lg p-3">
                    <div className="text-white text-sm">
                      <div className="font-medium mb-2">Range of Motion (Live)</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>MCP:</span>
                          <span className="font-mono">{currentROM.mcpAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PIP:</span>
                          <span className="font-mono">{currentROM.pipAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DIP:</span>
                          <span className="font-mono">{currentROM.dipAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-400 pt-1">
                          <span className="font-medium">Total:</span>
                          <span className="font-mono font-bold">{currentROM.totalActiveRom.toFixed(1)}°</span>
                        </div>
                        {isRecording && (
                          <div className="mt-2 pt-2 border-t border-green-400">
                            <div className="text-green-400 text-xs mb-1">Session Max:</div>
                            <div className="text-green-400 font-mono text-lg">{maxROM.totalActiveRom.toFixed(1)}°</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    disabled={!handDetected}
                    className="bg-red-500 text-white w-16 h-16 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    className="bg-red-500 text-white w-16 h-16 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <Square className="w-6 h-6" />
                  </Button>
                )}
                <Button
                  onClick={retakeRecording}
                  variant="outline"
                  className="px-6 py-3"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Current Assessment Info */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Current Assessment</h3>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{assessment.name}</div>
                  <div className="text-medical-gray">{assessment.instructions}</div>
                </div>
              </div>

              {/* Hand Landmarks Status */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Hand className="w-5 h-5 text-medical-blue mr-2" />
                  Hand Tracking
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-medical-gray">Landmarks Detected:</span>
                    <span className={`font-medium ${landmarksCount === 21 ? 'text-medical-success' : 'text-red-500'}`}>
                      {landmarksCount}/21
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-medical-gray">Tracking Quality:</span>
                    <span className={`font-medium ${
                      trackingQuality === "Excellent" ? 'text-medical-success' :
                      trackingQuality === "Good" ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {trackingQuality}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-medical-gray">Hand Position:</span>
                    <span className={`font-medium ${handPosition === "Centered" ? 'text-medical-success' : 'text-orange-500'}`}>
                      {handPosition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time ROM Display for Trigger Finger */}
              {currentUser?.injuryType === 'Trigger Finger' && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">Range of Motion (Live)</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">MCP Joint:</span>
                      <span className="font-medium text-blue-900">{currentROM.mcpAngle.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">PIP Joint:</span>
                      <span className="font-medium text-blue-900">{currentROM.pipAngle.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">DIP Joint:</span>
                      <span className="font-medium text-blue-900">{currentROM.dipAngle.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="font-medium text-blue-700">Total Active ROM:</span>
                      <span className="font-bold text-blue-900">{currentROM.totalActiveRom.toFixed(1)}°</span>
                    </div>
                  </div>

                  {isRecording && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                      <h4 className="font-medium text-green-900 mb-2">Maximum Values (This Session)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Max MCP:</span>
                          <span className="font-medium text-green-900">{maxROM.mcpAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Max PIP:</span>
                          <span className="font-medium text-green-900">{maxROM.pipAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Max DIP:</span>
                          <span className="font-medium text-green-900">{maxROM.dipAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-green-300">
                          <span className="font-medium text-green-700">Max Total:</span>
                          <span className="font-bold text-green-900">{maxROM.totalActiveRom.toFixed(1)}°</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 text-amber-600 mr-2" />
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
