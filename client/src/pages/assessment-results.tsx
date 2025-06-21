import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share, Play } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import AssessmentReplay from "@/components/assessment-replay";
import { calculateWristResults, getWristClinicalInterpretation, getWristPercentages } from "@shared/wrist-results-calculator";

export default function AssessmentResults() {
  const [, params] = useRoute("/assessment-results/:code/:userAssessmentId");
  const [showReplay, setShowReplay] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Fetch user assessment data
  const { data: assessmentData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${params?.userAssessmentId}/details`],
    enabled: !!params?.userAssessmentId
  });

  const userAssessment = (assessmentData as any)?.userAssessment;

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: [`/api/users/by-code/${params?.code}`],
    enabled: !!params?.code
  });

  const user = (userData as any)?.user || (assessmentData as any)?.user;

  const generateShareLink = async () => {
    try {
      const response = await fetch(`/api/user-assessments/${params?.userAssessmentId}/share`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.shareToken) {
        const url = `${window.location.origin}/shared-assessment/${data.shareToken}`;
        setShareUrl(url);
        navigator.clipboard.writeText(url);
      }
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading assessment results...</div>
      </div>
    );
  }

  if (!userAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h2>
          <p className="text-gray-600 mb-6">The assessment results you're looking for could not be found.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isKapandjiAssessment = userAssessment.assessmentName === "Kapandji Score" || 
                              userAssessment.assessmentName?.includes("Kapandji") ||
                              userAssessment.assessmentId === 27;

  const isWristAssessment = userAssessment.assessmentName === "Wrist Flexion/Extension" ||
                           userAssessment.assessmentName?.includes("Wrist") ||
                           userAssessment.assessmentId === 3;

  return (
    <div className="min-h-screen bg-gray-50">
      {showReplay && (
        <AssessmentReplay
          assessmentName={userAssessment.assessmentName || "Assessment"}
          userAssessmentId={params?.userAssessmentId}
          onClose={() => setShowReplay(false)}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Link href={`/assessment-list/${params?.code}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Assessments
                </Button>
              </Link>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReplay(true)}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Replay Motion
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={generateShareLink}
                  className="flex items-center gap-2"
                >
                  <Share className="w-4 h-4" />
                  Share Results
                </Button>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {userAssessment.assessmentName || "Assessment Results"}
              </h1>
              <p className="text-gray-600">
                Patient: {user?.code || params?.code} | 
                Session {userAssessment.sessionNumber || 1} | 
                {userAssessment.handType && `Hand: ${userAssessment.handType} | `}
                Completed: {userAssessment.completedAt ? new Date(userAssessment.completedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Share URL Display */}
          {shareUrl && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Share link generated and copied to clipboard:</strong>
              </div>
              <div className="text-xs text-green-700 mt-1 break-all">{shareUrl}</div>
            </div>
          )}

          {/* Results Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Assessment Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                
                {/* Assessment Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Quality Score:</span>
                      <span className="ml-2 text-gray-900">{userAssessment.qualityScore || 'N/A'}%</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Hand Used:</span>
                      <span className="ml-2 text-gray-900">{userAssessment.handType || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Session:</span>
                      <span className="ml-2 text-gray-900">{userAssessment.sessionNumber || 1}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Date:</span>
                      <span className="ml-2 text-gray-900">
                        {userAssessment.completedAt ? new Date(userAssessment.completedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kapandji Specific Scoring */}
                {isKapandjiAssessment && (
                  <div className="bg-white border border-gray-200 p-6 rounded-lg">
                    <h4 className="font-medium mb-4 text-gray-900">Kapandji Opposition Score</h4>
                    <div className="space-y-4">
                      <div className="text-center mb-6">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {userAssessment.totalActiveRom || '0'}/10
                        </div>
                        <div className="text-lg text-gray-700">Thumb Opposition Score</div>
                      </div>

                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium mb-3 text-gray-900">Opposition Levels Achieved</h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Level 1: Index Proximal Phalanx</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 1 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 1 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 2: Index Middle Phalanx</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 2 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 2 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 3: Index Finger Tip</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 3 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 3 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 4: Middle Finger Tip</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 4 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 4 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 5: Ring Finger Tip</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 5 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 5 ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Level 6: Little Finger Tip</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 6 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 6 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 7: Little DIP Crease</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 7 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 7 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 8: Little PIP Crease</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 8 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 8 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Level 9: Little MCP Crease</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 9 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 9 ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Level 10: Distal Palmar Crease</span>
                              <span className={parseInt(userAssessment.totalActiveRom || '0') >= 10 ? 'text-green-600 font-bold' : 'text-red-600'}>
                                {parseInt(userAssessment.totalActiveRom || '0') >= 10 ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded border">
                        <h5 className="font-medium mb-2 text-gray-900">Clinical Interpretation</h5>
                        <p className="text-sm text-gray-700">
                          {parseInt(userAssessment.totalActiveRom || '0') >= 8 ? 
                            'Excellent thumb opposition - functional range achieved' : 
                            parseInt(userAssessment.totalActiveRom || '0') >= 5 ? 
                              'Good thumb opposition - adequate for most activities' : 
                              'Limited thumb opposition - may benefit from therapy'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wrist-specific results */}
                {isWristAssessment && (
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <h4 className="font-medium mb-4 text-gray-900">Wrist Range of Motion Analysis</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {(() => {
                            // Use the exact same calculation as motion replay
                            if (userAssessment.repetitionData && userAssessment.repetitionData[0]?.motionData) {
                              try {
                                const motionData = userAssessment.repetitionData[0].motionData;
                                
                                // Calculate wrist angles for all frames like in replay
                                const wristAnglesAllFrames = motionData.map(frame => {
                                  if (frame.landmarks && frame.poseLandmarks) {
                                    return calculateWristAngleByHandType(frame.landmarks, frame.poseLandmarks);
                                  }
                                  return null;
                                }).filter(Boolean);
                                
                                if (wristAnglesAllFrames.length > 0) {
                                  // Use exact motion replay logic - no additional filtering
                                  const allFlexionAngles = wristAnglesAllFrames.map(w => w!.wristFlexionAngle).filter(angle => !isNaN(angle) && angle >= 0);
                                  const maxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
                                  
                                  console.log(`📊 FLEXION - Frames: ${wristAnglesAllFrames.length}, Max: ${maxFlexion.toFixed(1)}°`);
                                  
                                  return maxFlexion.toFixed(1);
                                }
                              } catch (error) {
                                console.error('Error calculating flexion:', error);
                              }
                            }
                            
                            // Fallback only if calculation fails
                            return '0.0';
                          })()}°
                        </div>
                        <div className="text-lg text-gray-700">Maximum Flexion</div>
                        <div className="text-sm text-gray-500 mt-1">Normal: 0-80°</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {(() => {
                            // Use the exact same calculation as motion replay
                            if (userAssessment.repetitionData && userAssessment.repetitionData[0]?.motionData) {
                              try {
                                const motionData = userAssessment.repetitionData[0].motionData;
                                
                                // Calculate wrist angles for all frames like in replay
                                const wristAnglesAllFrames = motionData.map(frame => {
                                  if (frame.landmarks && frame.poseLandmarks) {
                                    return calculateWristAngleByHandType(frame.landmarks, frame.poseLandmarks);
                                  }
                                  return null;
                                }).filter(Boolean);
                                
                                if (wristAnglesAllFrames.length > 0) {
                                  // Use exact motion replay logic - no additional filtering
                                  const allExtensionAngles = wristAnglesAllFrames.map(w => w!.wristExtensionAngle).filter(angle => !isNaN(angle) && angle >= 0);
                                  const maxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
                                  
                                  console.log(`📊 EXTENSION - Frames: ${wristAnglesAllFrames.length}, Max: ${maxExtension.toFixed(1)}°`);
                                  
                                  return maxExtension.toFixed(1);
                                }
                              } catch (error) {
                                console.error('Error calculating extension:', error);
                              }
                            }
                            
                            // Fallback only if calculation fails
                            return '0.0';
                          })()}°
                        </div>
                        <div className="text-lg text-gray-700">Maximum Extension</div>
                        <div className="text-sm text-gray-500 mt-1">Normal: 0-70°</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(() => {
                          // Use the exact same calculation as motion replay for total ROM
                          if (userAssessment.repetitionData && userAssessment.repetitionData[0]?.motionData) {
                            try {
                              const motionData = userAssessment.repetitionData[0].motionData;
                              
                              // Calculate wrist angles for all frames like in replay
                              const wristAnglesAllFrames = motionData.map(frame => {
                                if (frame.landmarks && frame.poseLandmarks) {
                                  return calculateElbowReferencedWristAngle(frame.landmarks, frame.poseLandmarks);
                                }
                                return null;
                              }).filter(Boolean);
                              
                              if (wristAnglesAllFrames.length > 0) {
                                const allFlexionAngles = wristAnglesAllFrames.map(w => w!.wristFlexionAngle).filter(angle => !isNaN(angle) && angle >= 0);
                                const allExtensionAngles = wristAnglesAllFrames.map(w => w!.wristExtensionAngle).filter(angle => !isNaN(angle) && angle >= 0);
                                
                                const maxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
                                const maxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
                                const totalROM = maxFlexion + maxExtension;
                                
                                console.log('Assessment Results - Total ROM calculation:', totalROM);
                                return totalROM.toFixed(1);
                              }
                            } catch (error) {
                              console.error('Error calculating total ROM:', error);
                            }
                          }
                          
                          return '0.0';
                        })()}°
                      </div>
                      <div className="text-lg text-gray-700">Total Wrist ROM</div>
                      <div className="text-sm text-gray-500 mt-1">Normal: 150°</div>
                    </div>

                    <div className="mt-6 p-4 bg-white rounded border">
                      <h5 className="font-medium mb-2 text-gray-900">Clinical Assessment</h5>
                      <p className="text-sm text-gray-700">
                        {(() => {
                          // Use the exact same calculation as motion replay for clinical assessment
                          if (userAssessment.repetitionData && userAssessment.repetitionData[0]?.motionData) {
                            try {
                              const motionData = userAssessment.repetitionData[0].motionData;
                              
                              // Calculate wrist angles for all frames like in replay
                              const wristAnglesAllFrames = motionData.map(frame => {
                                if (frame.landmarks && frame.poseLandmarks) {
                                  return calculateElbowReferencedWristAngle(frame.landmarks, frame.poseLandmarks);
                                }
                                return null;
                              }).filter(Boolean);
                              
                              if (wristAnglesAllFrames.length > 0) {
                                const allFlexionAngles = wristAnglesAllFrames.map(w => w!.wristFlexionAngle).filter(angle => !isNaN(angle) && angle >= 0);
                                const allExtensionAngles = wristAnglesAllFrames.map(w => w!.wristExtensionAngle).filter(angle => !isNaN(angle) && angle >= 0);
                                
                                const maxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
                                const maxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
                                
                                if (maxFlexion >= 60 && maxExtension >= 50) {
                                  return 'Excellent wrist mobility - within normal functional range';
                                } else if (maxFlexion >= 40 || maxExtension >= 30) {
                                  return 'Moderate wrist mobility - some limitation present';
                                } else {
                                  return 'Limited wrist mobility - significant restriction noted';
                                }
                              }
                            } catch (error) {
                              console.error('Error in clinical assessment:', error);
                            }
                          }
                          
                          return 'Unable to assess - insufficient motion data';
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comprehensive ROM Analysis for TAM assessments */}
                {!isKapandjiAssessment && !isWristAssessment && userAssessment.totalActiveRom && (
                  <div className="bg-gray-100 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 text-gray-900">Comprehensive ROM Analysis - All Digits</h4>
                    <div className="space-y-4">
                      {(() => {
                        const allFingers = [
                          { 
                            name: 'Index Finger', 
                            key: 'index', 
                            romValue: userAssessment.indexFingerRom,
                            mcpAngle: userAssessment.maxMcpAngle,
                            pipAngle: userAssessment.maxPipAngle,
                            dipAngle: userAssessment.maxDipAngle,
                            highlight: false 
                          },
                          { 
                            name: 'Middle Finger', 
                            key: 'middle', 
                            romValue: userAssessment.middleFingerRom,
                            mcpAngle: userAssessment.middleFingerMcp,
                            pipAngle: userAssessment.middleFingerPip,
                            dipAngle: userAssessment.middleFingerDip,
                            highlight: false 
                          },
                          { 
                            name: 'Ring Finger', 
                            key: 'ring', 
                            romValue: userAssessment.ringFingerRom,
                            mcpAngle: userAssessment.ringFingerMcp,
                            pipAngle: userAssessment.ringFingerPip,
                            dipAngle: userAssessment.ringFingerDip,
                            highlight: false 
                          },
                          { 
                            name: 'Pinky Finger', 
                            key: 'pinky', 
                            romValue: userAssessment.pinkyFingerRom,
                            mcpAngle: userAssessment.pinkyFingerMcp,
                            pipAngle: userAssessment.pinkyFingerPip,
                            dipAngle: userAssessment.pinkyFingerDip,
                            highlight: false 
                          }
                        ];

                        return allFingers.map((finger, index) => {
                          const mcpAngle = finger.mcpAngle ? parseFloat(finger.mcpAngle) : 0;
                          const pipAngle = finger.pipAngle ? parseFloat(finger.pipAngle) : 0;
                          const dipAngle = finger.dipAngle ? parseFloat(finger.dipAngle) : 0;

                          return (
                            <div key={finger.key} className={`bg-white p-4 rounded border ${
                              finger.highlight ? 'ring-2 ring-blue-500' : ''
                            }`}>
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-medium text-gray-900">{finger.name}</span>
                                <span className="font-bold text-lg text-gray-900">
                                  {finger.romValue ? `${Math.round(parseFloat(finger.romValue))}° TAM` : 'N/A'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className={`p-2 rounded ${
                                  mcpAngle < 70 ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
                                }`}>
                                  <div className="text-xs text-gray-800">MCP Joint</div>
                                  <div className={`font-medium ${
                                    mcpAngle < 70 ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    {Math.round(mcpAngle)}°
                                  </div>
                                  <div className="text-xs text-gray-500">Normal: 70-90°</div>
                                </div>
                                <div className={`p-2 rounded ${
                                  pipAngle < 90 ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
                                }`}>
                                  <div className="text-xs text-gray-800">PIP Joint</div>
                                  <div className={`font-medium ${
                                    pipAngle < 90 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {Math.round(pipAngle)}°
                                  </div>
                                  <div className="text-xs text-gray-500">Normal: 90-110°</div>
                                </div>
                                <div className={`p-2 rounded ${
                                  dipAngle < 70 ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
                                }`}>
                                  <div className="text-xs text-gray-800">DIP Joint</div>
                                  <div className={`font-medium ${
                                    dipAngle < 70 ? 'text-red-600' : 'text-purple-600'
                                  }`}>
                                    {Math.round(dipAngle)}°
                                  </div>
                                  <div className="text-xs text-gray-500">Normal: 70-90°</div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* Motion Quality and Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Assessment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-gray-900">Session Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Assessment Type:</strong> {userAssessment.assessmentName || 'Range of Motion'}</p>
                    <p><strong>Session Number:</strong> {userAssessment.sessionNumber || 1}</p>
                    <p><strong>Duration:</strong> {userAssessment.duration ? `${userAssessment.duration}s` : 'N/A'}</p>
                    <p><strong>Quality Score:</strong> {userAssessment.qualityScore || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3 text-gray-900">Privacy & Data</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Data Processing:</strong> All motion analysis performed locally on your device.</p>
                    <p><strong>Privacy:</strong> No video recordings stored - only anonymous motion landmarks.</p>
                    <p><strong>Quality Score:</strong> Based on hand detection accuracy and landmark stability.</p>
                    <p><strong>Motion Replay:</strong> Privacy-focused visualization showing hand skeleton movements only.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}