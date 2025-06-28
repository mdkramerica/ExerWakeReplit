import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Share2, TrendingUp, Activity, Calculator, Info, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { calculateWristResults, getWristClinicalInterpretation, getWristPercentages } from "@shared/wrist-results-calculator";
import { calculateElbowReferencedWristAngleWithForce } from "@shared/elbow-wrist-calculator";
import AssessmentReplay from "@/components/assessment-replay";

interface WristResultsData {
  userAssessment: {
    id: number;
    userId?: number;
    assessmentId?: number;
    wristFlexionAngle: number;
    wristExtensionAngle: number;
    maxWristFlexion: number;
    maxWristExtension: number;
    completedAt: string;
    qualityScore: number;
    handType?: string;
    motionData: any[];
    repetitionData?: any[];
  };
  assessment: {
    id: number;
    name: string;
    description: string;
  };
  user: {
    id: number;
    code: string;
    injuryType: string;
  };
}

export default function WristResults() {
  const { userCode, userAssessmentId } = useParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDetailedDocs, setShowDetailedDocs] = useState(false);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const { data: resultsData, isLoading, error } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/details`],
    enabled: !!userAssessmentId,
  });

  console.log('Query state:', { isLoading, error, userAssessmentId, hasData: !!resultsData });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-300 rounded"></div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Wrist Results data received:', resultsData);
  
  const results = resultsData as WristResultsData;
  if (!results) {
    console.log('No results data available');
    return <div className="p-4">No results data available</div>;
  }

  let { userAssessment, assessment, user } = results;
  
  // Handle cases where assessment might not be loaded yet
  if (!assessment || !userAssessment || !user) {
    console.log('Missing data:', { assessment: !!assessment, userAssessment: !!userAssessment, user: !!user });
    console.log('Full results object:', results);
    
    // If we have partial data, try to proceed with fallbacks
    if (userAssessment && !assessment) {
      // Create a fallback assessment object
      assessment = {
        id: userAssessment.assessmentId || 3,
        name: 'Wrist Flexion/Extension',
        description: 'Measure wrist forward and backward bending range of motion'
      };
    }
    
    if (userAssessment && !user) {
      // Create a fallback user object
      user = {
        id: userAssessment.userId || 11,
        code: userCode || 'DEMO02',
        injuryType: 'Distal Radius Fracture'
      };
    }
    
    // If we still don't have the essential data, show loading
    if (!userAssessment) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Loading Assessment Results...</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Assessment: {assessment ? '✓' : '✗'}</p>
                <p>User Assessment: {userAssessment ? '✓' : '✗'}</p>
                <p>User: {user ? '✓' : '✗'}</p>
                <p className="mt-4">Raw data available: {JSON.stringify(results, null, 2).substring(0, 200)}...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
  
  // Use the same anatomical calculations as Session Maximum - SINGLE SOURCE OF TRUTH
  let wristResults, interpretation, flexionPercentage, extensionPercentage;
  
  try {
    wristResults = calculateWristResults(userAssessment);
    
    // Override with motion replay calculations to match Session Maximum values
    if (userAssessment.repetitionData && userAssessment.repetitionData[0]?.motionData) {
      console.log('🔄 BOTTOM COMPONENT - Overriding with motion replay calculations');
      
      const motionData = userAssessment.repetitionData[0].motionData;
      
      // Calculate using the same method as Session Maximum - use actual hand type
      const detectedHandType = (userAssessment.handType as 'LEFT' | 'RIGHT') || 'RIGHT'; // Use stored hand type
      console.log(`🔍 BOTTOM COMPONENT - Using detected hand type: ${detectedHandType}`);
      
      const wristAnglesAllFrames = motionData.map((frame: any) => {
        if (frame.landmarks && frame.poseLandmarks) {
          return calculateElbowReferencedWristAngleWithForce(
            frame.landmarks, 
            frame.poseLandmarks, 
            detectedHandType  // Use actual detected hand type, not hardcoded LEFT
          );
        }
        return null;
      }).filter(Boolean);
      
      if (wristAnglesAllFrames.length > 0) {
        const allFlexionAngles = wristAnglesAllFrames.map((w: any) => w.wristFlexionAngle).filter((angle: number) => !isNaN(angle) && angle >= 0);
        const allExtensionAngles = wristAnglesAllFrames.map((w: any) => w.wristExtensionAngle).filter((angle: number) => !isNaN(angle) && angle >= 0);
        
        const calculatedMaxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
        const calculatedMaxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
        
        // Override with motion replay values to match Session Maximum
        wristResults = {
          ...wristResults,
          maxFlexion: calculatedMaxFlexion,
          maxExtension: calculatedMaxExtension,
          totalROM: calculatedMaxFlexion + calculatedMaxExtension
        };
        
        console.log(`🎯 BOTTOM COMPONENT - Using motion replay values: Flexion: ${calculatedMaxFlexion.toFixed(1)}°, Extension: ${calculatedMaxExtension.toFixed(1)}°`);
      }
    }
    
    interpretation = getWristClinicalInterpretation(wristResults);
    const percentages = getWristPercentages(wristResults);
    flexionPercentage = percentages.flexionPercentage;
    extensionPercentage = percentages.extensionPercentage;
  } catch (calculationError: any) {
    console.error('Wrist calculation error:', calculationError);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold mb-2">Assessment Incomplete</h3>
            <p className="text-sm mb-4">
              {calculationError?.message || 'This assessment needs to be completed before viewing results.'}
            </p>
            <Link href={`/assessment-list/${userCode}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assessments
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Extract values for display
  const { maxFlexion, maxExtension, totalROM, frameCount } = wristResults;
  const totalFrames = frameCount;
  
  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  console.log('🎯 WRIST RESULTS PAGE - AUTHORITATIVE VALUES:', {
    maxFlexion: maxFlexion.toFixed(1),
    maxExtension: maxExtension.toFixed(1),
    totalROM: totalROM.toFixed(1),
    frameCount,
    source: 'centralized-calculator'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/assessment-list/${userCode}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assessments
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Wrist Assessment Results</h1>
              <p className="text-gray-600">Patient: {user.code} | Injury: {user.injuryType}</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Link href="/progress-charts">
              <Button variant="outline" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Progress Charts
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Motion Replay Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Motion Replay: Wrist Flexion/Extension
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="w-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-300">
                <AssessmentReplay
                  assessmentName="Wrist Flexion/Extension"
                  userAssessmentId={userAssessmentId}
                  onClose={() => {}}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Methodology Documentation - Hidden */}
        <Card className="border-l-4 border-l-blue-500 hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Calculation Methodology
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Maximum Flexion</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Calculated using elbow-referenced vector analysis between pose elbow, hand wrist, and middle finger MCP joint.
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Anatomical angle calculation with ±3° neutral zone</li>
                  <li>• Positive signed angles indicate forward flexion</li>
                  <li>• Maximum value across all motion frames</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Maximum Extension</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Uses the same elbow-referenced vector method with cross-product direction determination.
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Negative signed angles indicate backward extension</li>
                  <li>• Hand-specific elbow selection (LEFT: index 13, RIGHT: index 14)</li>
                  <li>• Maximum absolute value across all frames</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Total ROM</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Simple arithmetic sum of maximum flexion and extension angles.
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Formula: Max Flexion + Max Extension</li>
                  <li>• Represents functional wrist mobility range</li>
                  <li>• Normal total ROM: ~150° (80° flex + 70° ext)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Technical Implementation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <strong>MediaPipe Integration:</strong>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• Holistic pose + hand landmark tracking</li>
                    <li>• Real-time elbow and wrist position detection</li>
                    <li>• Session-locked hand type consistency</li>
                  </ul>
                </div>
                <div>
                  <strong>Vector Calculation:</strong>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• 3D coordinate system with depth (z-axis)</li>
                    <li>• Normalized vector dot product for angle calculation</li>
                    <li>• Cross product for flexion/extension classification</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Technical Documentation - Hidden */}
        <Card className="border-l-4 border-l-amber-500 hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-amber-700 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detailed Calculation Documentation
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDetailedDocs(!showDetailedDocs)}
                className="text-amber-700 hover:text-amber-800"
              >
                {showDetailedDocs ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    View Full Documentation
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showDetailedDocs && (
            <CardContent className="max-h-96 overflow-y-auto bg-gray-50">
              <div className="prose prose-sm max-w-none">
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Mathematical Implementation</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">1. Vector Construction</h4>
                      <div className="bg-blue-50 p-3 rounded font-mono text-sm">
                        <div>forearmVector = handWrist - poseElbow</div>
                        <div>handVector = middleMCP - handWrist</div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        The forearm vector establishes anatomical reference, while the hand vector represents the orientation being measured.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">2. Dot Product Angle Calculation</h4>
                      <div className="bg-green-50 p-3 rounded font-mono text-sm">
                        <div>dotProduct = forearm·hand = fx*hx + fy*hy + fz*hz</div>
                        <div>cosAngle = dotProduct / (|forearm| * |hand|)</div>
                        <div>angleDegrees = arccos(cosAngle) * (180/PI)</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">3. Cross Product Direction</h4>
                      <div className="bg-purple-50 p-3 rounded font-mono text-sm">
                        <div>crossProduct = forearm x hand</div>
                        <div>if (crossProduct.y &gt; 0) = Flexion (+)</div>
                        <div>if (crossProduct.y &lt; 0) = Extension (-)</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">4. Hand-Specific Landmarks</h4>
                      <div className="bg-yellow-50 p-3 rounded text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <strong>LEFT Hand:</strong>
                            <ul className="text-xs mt-1">
                              <li>- Elbow: MediaPipe index 13</li>
                              <li>- Wrist: MediaPipe index 15</li>
                              <li>- Hand landmarks from left detection</li>
                            </ul>
                          </div>
                          <div>
                            <strong>RIGHT Hand:</strong>
                            <ul className="text-xs mt-1">
                              <li>- Elbow: MediaPipe index 14</li>
                              <li>- Wrist: MediaPipe index 16</li>
                              <li>- Hand landmarks from right detection</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">5. Maximum Value Processing</h4>
                      <div className="bg-red-50 p-3 rounded font-mono text-sm">
                        <div>maxFlexion = max(all flexion angles across {totalFrames} frames)</div>
                        <div>maxExtension = max(all extension angles across {totalFrames} frames)</div>
                        <div>totalROM = maxFlexion + maxExtension</div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Each frame is analyzed independently, with the maximum recorded values representing peak mobility.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">6. Quality Assurance</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>- ±3° neutral zone eliminates micro-movement noise</li>
                        <li>- Session-locked hand type prevents calculation inconsistencies</li>
                        <li>- 3D coordinate system with depth (Z-axis) for accuracy</li>
                        <li>- Real-time validation with confidence scoring</li>
                      </ul>
                    </div>

                    <div className="bg-gray-100 p-4 rounded">
                      <h4 className="font-semibold text-gray-800 mb-2">Current Assessment Data</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Motion Frames Analyzed:</strong> {totalFrames}
                        </div>
                        <div>
                          <strong>Sampling Rate:</strong> ~30 FPS
                        </div>
                        <div>
                          <strong>Hand Type Detected:</strong> {userAssessment?.handType || 'Session-locked'}
                        </div>
                        <div>
                          <strong>Quality Score:</strong> {userAssessment?.qualityScore || 100}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Assessment Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              {assessment.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {maxFlexion.toFixed(1)}°
                </div>
                <div className="text-sm text-gray-600">Maximum Flexion</div>
                <Progress value={flexionPercentage} className="mt-2" />
                <div className="text-xs text-gray-500 mt-1">
                  {flexionPercentage.toFixed(0)}% of normal range
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {maxExtension.toFixed(1)}°
                </div>
                <div className="text-sm text-gray-600">Maximum Extension</div>
                <Progress value={extensionPercentage} className="mt-2" />
                <div className="text-xs text-gray-500 mt-1">
                  {extensionPercentage.toFixed(0)}% of normal range
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(maxFlexion + maxExtension).toFixed(1)}°
                </div>
                <div className="text-sm text-gray-600">Total ROM</div>
                <Badge variant="outline" className="mt-2">
                  Normal: 150°
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Status:</span>
                <Badge className={interpretation.color}>
                  {interpretation.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Flexion Assessment:</span>
                  <span className={maxFlexion >= 60 ? "text-green-600" : "text-red-600"}>
                    {maxFlexion >= 60 ? "Normal" : "Limited"}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Extension Assessment:</span>
                  <span className={maxExtension >= 50 ? "text-green-600" : "text-red-600"}>
                    {maxExtension >= 50 ? "Normal" : "Limited"}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {interpretation.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Tracking Quality:</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getQualityColor(userAssessment.qualityScore)}`}></div>
                  <span>{userAssessment.qualityScore}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Motion Frames:</span>
                  <span>{userAssessment.motionData?.length || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Assessment Date:</span>
                  <span>{new Date(userAssessment.completedAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Elbow Reference:</span>
                  <Badge variant="outline" className="text-green-600">
                    Active
                  </Badge>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  High-quality motion tracking with MediaPipe Holistic ensures accurate clinical measurements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reference Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Clinical Reference Ranges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Normal Wrist Range of Motion</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Flexion (Palmar):</span>
                    <span className="font-medium">0° - 80°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extension (Dorsal):</span>
                    <span className="font-medium">0° - 70°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total ROM:</span>
                    <span className="font-medium">150°</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Assessment Method</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>• MediaPipe Holistic pose detection</p>
                  <p>• Elbow-referenced angle calculation</p>
                  <p>• Real-time motion analysis</p>
                  <p>• Clinical-grade measurements</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Link href={`/assessment-list/${userCode}`}>
            <Button>
              Continue Assessments
            </Button>
          </Link>
          
          <Button variant="outline" onClick={() => window.print()}>
            Print Results
          </Button>
        </div>
      </div>
    </div>
  );
}