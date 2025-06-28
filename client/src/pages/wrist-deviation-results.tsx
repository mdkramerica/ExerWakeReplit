import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Activity, TrendingUp, Share2, Download, Hand, Calculator, Info, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import AssessmentReplay from "@/components/assessment-replay";
import { calculateWristDeviationResults, getDeviationClinicalInterpretation, getDeviationPercentages } from "@shared/wrist-deviation-calculator";

interface WristDeviationResultsData {
  maxRadialDeviation: number;
  maxUlnarDeviation: number;
  totalDeviationROM: number;
  frameCount: number;
  handType: string;
  averageConfidence: number;
}

interface DeviationResultsData {
  userAssessment: any;
  assessment: any;
  user: any;
}

export default function WristDeviationResults() {
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

  console.log('Deviation Results query state:', { isLoading, error, userAssessmentId, hasData: !!resultsData });

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

  console.log('Wrist Deviation Results data received:', resultsData);
  
  if (!resultsData) {
    console.log('No deviation results data available');
    return <div className="p-4">No results data available</div>;
  }

  const { userAssessment, assessment, user } = resultsData as any;
  
  if (!assessment || !userAssessment) {
    console.log('Missing deviation data:', { assessment: !!assessment, userAssessment: !!userAssessment, user: !!user });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Loading Assessment Results...</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Assessment: {assessment ? '✓' : '✗'}</p>
              <p>User Assessment: {userAssessment ? '✓' : '✗'}</p>
              <p>User: {user ? '✓' : '✗'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Use the centralized calculation for deviation results
  const deviationResults = calculateWristDeviationResults(userAssessment);
  const interpretation = getDeviationClinicalInterpretation(deviationResults);
  const { radialPercentage, ulnarPercentage } = getDeviationPercentages(deviationResults);
  
  // Extract values for display
  const { maxRadialDeviation, maxUlnarDeviation, totalDeviationROM, frameCount } = deviationResults;
  const totalFrames = frameCount;
  
  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  console.log('🎯 WRIST DEVIATION RESULTS PAGE - AUTHORITATIVE VALUES:', {
    maxRadialDeviation: maxRadialDeviation.toFixed(1),
    maxUlnarDeviation: maxUlnarDeviation.toFixed(1),
    totalDeviationROM: totalDeviationROM.toFixed(1),
    frameCount,
    source: 'centralized-deviation-calculator'
  });

  console.log('📊 RAW USER ASSESSMENT DATA:', {
    id: userAssessment?.id,
    assessmentId: userAssessment?.assessmentId,
    handType: userAssessment?.handType,
    motionDataLength: userAssessment?.repetitionData?.[0]?.motionData?.length,
    storedRadial: userAssessment?.maxRadialDeviation,
    storedUlnar: userAssessment?.maxUlnarDeviation
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
              <h1 className="text-3xl font-bold text-gray-900">Wrist Deviation Assessment Results</h1>
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

        {/* Results Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-orange-700">Radial Deviation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {maxRadialDeviation.toFixed(1)}°
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Normal: 20°
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(radialPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {radialPercentage.toFixed(0)}% of normal
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-purple-700">Ulnar Deviation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {maxUlnarDeviation.toFixed(1)}°
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Normal: 30°
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(ulnarPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {ulnarPercentage.toFixed(0)}% of normal
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-700">Total Deviation ROM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {totalDeviationROM.toFixed(1)}°
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Normal: 50°
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${interpretation.color === 'text-green-600' ? 'bg-green-100 text-green-800' : interpretation.color === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {interpretation.status}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {interpretation.description}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Motion Replay Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Motion Replay: Wrist Radial/Ulnar Deviation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="w-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-300">
                <AssessmentReplay
                  assessmentName="Wrist Radial/Ulnar Deviation"
                  userAssessmentId={userAssessmentId}
                  onClose={() => {}}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Hand className="w-5 h-5" />
              Assessment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Assessment Date</label>
                  <div className="text-lg text-gray-900">
                    {new Date(userAssessment.completedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Hand Type</label>
                  <div className="text-lg text-gray-900">
                    {deviationResults.handType || 'Unknown'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Motion Frames</label>
                  <div className="text-lg text-gray-900">
                    {totalFrames} frames analyzed
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Quality Score</label>
                  <div className="flex items-center space-x-3">
                    <div className="text-lg text-gray-900">
                      {(userAssessment.qualityScore || 0).toFixed(0)}%
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getQualityColor(userAssessment.qualityScore || 0)}`}></div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tracking Confidence</label>
                  <div className="text-lg text-gray-900">
                    {(deviationResults.averageConfidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Duration</label>
                  <div className="text-lg text-gray-900">
                    {assessment.duration || 10} seconds
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Interpretation */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg text-green-700">Clinical Interpretation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Range Assessment</h4>
                <p className="text-gray-700">
                  {totalDeviationROM >= 45 ? (
                    `Excellent wrist deviation mobility with ${maxRadialDeviation.toFixed(1)}° radial and ${maxUlnarDeviation.toFixed(1)}° ulnar deviation (Total: ${totalDeviationROM.toFixed(1)}°). This indicates good functional wrist mobility in the frontal plane.`
                  ) : totalDeviationROM >= 30 ? (
                    `Moderate wrist deviation with ${maxRadialDeviation.toFixed(1)}° radial and ${maxUlnarDeviation.toFixed(1)}° ulnar deviation (Total: ${totalDeviationROM.toFixed(1)}°). Some limitation may be present but functional movement is maintained.`
                  ) : (
                    `Limited wrist deviation detected. Significant restriction with ${maxRadialDeviation.toFixed(1)}° radial and ${maxUlnarDeviation.toFixed(1)}° ulnar deviation (Total: ${totalDeviationROM.toFixed(1)}°). Consider targeted rehabilitation exercises.`
                  )}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h5 className="font-medium text-orange-800 mb-2">Radial Deviation Analysis</h5>
                  <p className="text-sm text-gray-700">
                    {maxRadialDeviation >= 18 ? 'Normal radial deviation range achieved.' : 
                     maxRadialDeviation >= 12 ? 'Mild limitation in radial deviation.' : 
                     'Significant radial deviation restriction.'}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-medium text-purple-800 mb-2">Ulnar Deviation Analysis</h5>
                  <p className="text-sm text-gray-700">
                    {maxUlnarDeviation >= 25 ? 'Normal ulnar deviation range achieved.' : 
                     maxUlnarDeviation >= 18 ? 'Mild limitation in ulnar deviation.' : 
                     'Significant ulnar deviation restriction.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Methodology Documentation */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Calculation Methodology
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">Radial Deviation</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Calculated using forearm-to-hand vector analysis with cross-product direction determination.
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Positive deviation angles indicate radial (thumb-side) movement</li>
                  <li>• Uses elbow, wrist, and hand landmark triangulation</li>
                  <li>• Maximum value across all motion frames</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Ulnar Deviation</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Uses the same vector-based method with directional classification.
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Negative deviation angles indicate ulnar (pinky-side) movement</li>
                  <li>• Hand-specific landmark selection for accuracy</li>
                  <li>• Maximum absolute value across all frames</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Technical Implementation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <strong>MediaPipe Integration:</strong>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• Combined pose + hand landmark tracking</li>
                    <li>• Real-time deviation angle calculation</li>
                    <li>• Session-locked hand type consistency</li>
                  </ul>
                </div>
                <div>
                  <strong>Vector Mathematics:</strong>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• 3D coordinate system with spatial analysis</li>
                    <li>• Cross-product for directional classification</li>
                    <li>• AMA-compliant anatomical positioning standards</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}