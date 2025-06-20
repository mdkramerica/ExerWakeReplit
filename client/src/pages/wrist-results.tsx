import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Share2, TrendingUp, Activity } from "lucide-react";

interface WristResultsData {
  userAssessment: {
    id: number;
    wristFlexionAngle: number;
    wristExtensionAngle: number;
    maxWristFlexion: number;
    maxWristExtension: number;
    completedAt: string;
    qualityScore: number;
    motionData: any[];
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

  const { userAssessment, assessment, user } = results;
  
  // Handle cases where assessment might not be loaded yet
  if (!assessment || !userAssessment || !user) {
    console.log('Missing data:', { assessment: !!assessment, userAssessment: !!userAssessment, user: !!user });
    console.log('Full results object:', results);
    
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
  
  // Clinical reference ranges for wrist ROM
  const normalFlexionRange = [0, 80];
  const normalExtensionRange = [0, 70];
  
  // Ensure numeric conversion for database values - handle different field names
  const maxFlexion = Number(userAssessment.maxWristFlexion || userAssessment.wristFlexionAngle) || 0;
  const maxExtension = Number(userAssessment.maxWristExtension || userAssessment.wristExtensionAngle) || 0;
  
  console.log('Wrist angle values:', {
    maxWristFlexion: userAssessment.maxWristFlexion,
    maxWristExtension: userAssessment.maxWristExtension,
    wristFlexionAngle: userAssessment.wristFlexionAngle,
    wristExtensionAngle: userAssessment.wristExtensionAngle,
    finalMaxFlexion: maxFlexion,
    finalMaxExtension: maxExtension
  });
  
  const flexionPercentage = Math.min((maxFlexion / normalFlexionRange[1]) * 100, 100);
  const extensionPercentage = Math.min((maxExtension / normalExtensionRange[1]) * 100, 100);
  
  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const getResultsInterpretation = () => {
    const flexion = maxFlexion;
    const extension = maxExtension;
    
    if (flexion >= 60 && extension >= 50) {
      return { status: "Normal", color: "text-green-600", description: "Excellent wrist mobility" };
    } else if (flexion >= 40 || extension >= 30) {
      return { status: "Moderate", color: "text-yellow-600", description: "Some limitation present" };
    } else {
      return { status: "Limited", color: "text-red-600", description: "Significant mobility restriction" };
    }
  };
  
  const interpretation = getResultsInterpretation();

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