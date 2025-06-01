import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, BarChart3, Play, Download, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AssessmentReplay from "@/components/assessment-replay";

export default function AssessmentResults() {
  const { userAssessmentId } = useParams();
  const [, setLocation] = useLocation();
  const [showReplay, setShowReplay] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: resultData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/details`],
    enabled: !!userAssessmentId,
  });

  const userAssessment = resultData?.userAssessment;

  const shareAssessmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/user-assessments/${userAssessmentId}/share`, {});
      return response.json();
    },
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Shareable link created",
        description: "The link has been copied to your clipboard",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create shareable link",
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Shareable link copied successfully",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent>
            <div className="text-center py-8">Loading assessment results...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userAssessment) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="medical-card">
          <CardContent>
            <div className="text-center py-8">Assessment results not found.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showReplay) {
    return (
      <AssessmentReplay
        assessmentName="Assessment Replay"
        userAssessmentId={userAssessmentId}
        onClose={() => setShowReplay(false)}
      />
    );
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

  const hasRomData = userAssessment.maxMcpAngle || userAssessment.maxPipAngle || userAssessment.maxDipAngle;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/assessments")}
            className="flex items-center space-x-2 bg-white hover:bg-gray-100 border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assessments</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
            <p className="text-gray-800">Detailed analysis and motion data</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Session Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">Date & Time</label>
                  <div className="text-lg font-medium">
                    {userAssessment.completedAt ? formatDate(userAssessment.completedAt) : 'Not completed'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Session Number</label>
                  <div className="text-lg font-medium">Session #{userAssessment.sessionNumber || 1}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Quality Score</label>
                  <div className="text-lg font-medium">{userAssessment.qualityScore || 0}%</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Hand Assessed</label>
                  <div className="text-lg font-medium">
                    {userAssessment.handType || 'Not Detected'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Injury Type</label>
                  <div className="text-lg font-medium">
                    {resultData?.user?.injuryType || 'Not Specified'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Status</label>
                  <div className={`text-lg font-medium ${userAssessment.isCompleted ? 'text-green-600' : 'text-orange-600'}`}>
                    {userAssessment.isCompleted ? 'Completed' : 'In Progress'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Range of Motion Results */}
          {hasRomData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <span>Range of Motion Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">


                  {/* Comprehensive ROM Analysis - All Digits */}
                  {(userAssessment.indexFingerRom || userAssessment.middleFingerRom || userAssessment.ringFingerRom || userAssessment.pinkyFingerRom) && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Comprehensive ROM Analysis - All Digits</h4>
                      <div className="space-y-4">
                        {/* Index Finger */}
                        <div className="border border-blue-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-medium text-gray-900">Index Finger</h5>
                            <span className="text-lg font-bold text-gray-700">
                              {userAssessment.indexFingerRom ? parseFloat(userAssessment.indexFingerRom).toFixed(0) : '0'}° TAM
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className={`p-4 rounded-lg border-2 ${
                              userAssessment.maxMcpAngle && parseFloat(userAssessment.maxMcpAngle) < 70
                                ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-blue-50 border-blue-200'
                            }`}>
                              <div className={`text-sm font-bold ${
                                userAssessment.maxMcpAngle && parseFloat(userAssessment.maxMcpAngle) < 70
                                  ? 'text-white' : 'text-gray-800'
                              }`}>MCP Joint</div>
                              <div className={`text-2xl font-black ${
                                userAssessment.maxMcpAngle && parseFloat(userAssessment.maxMcpAngle) < 70
                                  ? 'text-white' : 'text-blue-700'
                              }`}>
                                {userAssessment.maxMcpAngle ? parseFloat(userAssessment.maxMcpAngle).toFixed(0) : '0'}°
                              </div>
                              <div className="text-xs text-gray-700">Normal: 70-90°</div>
                            </div>
                            <div className={`p-4 rounded-lg border-2 ${
                              userAssessment.maxPipAngle && parseFloat(userAssessment.maxPipAngle) < 90
                                ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-green-50 border-green-200'
                            }`}>
                              <div className={`text-sm font-bold ${
                                userAssessment.maxPipAngle && parseFloat(userAssessment.maxPipAngle) < 90
                                  ? 'text-white' : 'text-gray-800'
                              }`}>PIP Joint</div>
                              <div className={`text-2xl font-black ${
                                userAssessment.maxPipAngle && parseFloat(userAssessment.maxPipAngle) < 90
                                  ? 'text-white' : 'text-green-700'
                              }`}>
                                {userAssessment.maxPipAngle ? parseFloat(userAssessment.maxPipAngle).toFixed(0) : '0'}°
                              </div>
                              <div className="text-xs text-gray-700">Normal: 90-110°</div>
                            </div>
                            <div className={`p-4 rounded-lg border-2 ${
                              userAssessment.maxDipAngle && parseFloat(userAssessment.maxDipAngle) < 70
                                ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-purple-50 border-purple-200'
                            }`}>
                              <div className={`text-sm font-bold ${
                                userAssessment.maxDipAngle && parseFloat(userAssessment.maxDipAngle) < 70
                                  ? 'text-white' : 'text-gray-800'
                              }`}>DIP Joint</div>
                              <div className={`text-2xl font-black ${
                                userAssessment.maxDipAngle && parseFloat(userAssessment.maxDipAngle) < 70
                                  ? 'text-white' : 'text-purple-700'
                              }`}>
                                {userAssessment.maxDipAngle ? parseFloat(userAssessment.maxDipAngle).toFixed(0) : '0'}°
                              </div>
                              <div className="text-xs text-gray-700">Normal: 70-90°</div>
                            </div>
                          </div>
                        </div>

                        {/* Middle Finger */}
                        {userAssessment.middleFingerRom && (
                          <div className="border border-green-200 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-medium text-gray-900">Middle Finger</h5>
                              <span className="text-lg font-bold text-gray-700">
                                {parseFloat(userAssessment.middleFingerRom).toFixed(0)}° TAM
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.middleFingerMcp && parseFloat(userAssessment.middleFingerMcp) < 70
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-blue-50 border-blue-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.middleFingerMcp && parseFloat(userAssessment.middleFingerMcp) < 70
                                    ? 'text-white' : 'text-gray-800'
                                }`}>MCP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.middleFingerMcp && parseFloat(userAssessment.middleFingerMcp) < 70
                                    ? 'text-white' : 'text-blue-700'
                                }`}>
                                  {userAssessment.middleFingerMcp ? parseFloat(userAssessment.middleFingerMcp).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 70-90°</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.middleFingerPip && parseFloat(userAssessment.middleFingerPip) < 90
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-green-50 border-green-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.middleFingerPip && parseFloat(userAssessment.middleFingerPip) < 90
                                    ? 'text-white' : 'text-gray-800'
                                }`}>PIP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.middleFingerPip && parseFloat(userAssessment.middleFingerPip) < 90
                                    ? 'text-white' : 'text-green-700'
                                }`}>
                                  {userAssessment.middleFingerPip ? parseFloat(userAssessment.middleFingerPip).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 90-110°</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.middleFingerDip && parseFloat(userAssessment.middleFingerDip) < 70
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-purple-50 border-purple-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.middleFingerDip && parseFloat(userAssessment.middleFingerDip) < 70
                                    ? 'text-white' : 'text-gray-800'
                                }`}>DIP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.middleFingerDip && parseFloat(userAssessment.middleFingerDip) < 70
                                    ? 'text-white' : 'text-purple-700'
                                }`}>
                                  {userAssessment.middleFingerDip ? parseFloat(userAssessment.middleFingerDip).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 70-90°</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Ring Finger */}
                        {userAssessment.ringFingerRom && (
                          <div className="border border-purple-200 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-medium text-gray-900">Ring Finger</h5>
                              <span className="text-lg font-bold text-gray-700">
                                {parseFloat(userAssessment.ringFingerRom).toFixed(0)}° TAM
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.ringFingerMcp && parseFloat(userAssessment.ringFingerMcp) < 70
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-blue-50 border-blue-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.ringFingerMcp && parseFloat(userAssessment.ringFingerMcp) < 70
                                    ? 'text-white' : 'text-gray-800'
                                }`}>MCP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.ringFingerMcp && parseFloat(userAssessment.ringFingerMcp) < 70
                                    ? 'text-white' : 'text-blue-700'
                                }`}>
                                  {userAssessment.ringFingerMcp ? parseFloat(userAssessment.ringFingerMcp).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 70-90°</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.ringFingerPip && parseFloat(userAssessment.ringFingerPip) < 90
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-green-50 border-green-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.ringFingerPip && parseFloat(userAssessment.ringFingerPip) < 90
                                    ? 'text-white' : 'text-gray-800'
                                }`}>PIP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.ringFingerPip && parseFloat(userAssessment.ringFingerPip) < 90
                                    ? 'text-white' : 'text-green-700'
                                }`}>
                                  {userAssessment.ringFingerPip ? parseFloat(userAssessment.ringFingerPip).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 90-110°</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.ringFingerDip && parseFloat(userAssessment.ringFingerDip) < 70
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-purple-50 border-purple-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.ringFingerDip && parseFloat(userAssessment.ringFingerDip) < 70
                                    ? 'text-white' : 'text-gray-800'
                                }`}>DIP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.ringFingerDip && parseFloat(userAssessment.ringFingerDip) < 70
                                    ? 'text-white' : 'text-purple-700'
                                }`}>
                                  {userAssessment.ringFingerDip ? parseFloat(userAssessment.ringFingerDip).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 70-90°</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pinky Finger */}
                        {userAssessment.pinkyFingerRom && (
                          <div className="border border-orange-200 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-medium text-gray-900">Pinky Finger</h5>
                              <span className="text-lg font-bold text-gray-700">
                                {parseFloat(userAssessment.pinkyFingerRom).toFixed(0)}° TAM
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.pinkyFingerMcp && parseFloat(userAssessment.pinkyFingerMcp) < 70
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-blue-50 border-blue-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.pinkyFingerMcp && parseFloat(userAssessment.pinkyFingerMcp) < 70
                                    ? 'text-white' : 'text-gray-800'
                                }`}>MCP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.pinkyFingerMcp && parseFloat(userAssessment.pinkyFingerMcp) < 70
                                    ? 'text-white' : 'text-blue-700'
                                }`}>
                                  {userAssessment.pinkyFingerMcp ? parseFloat(userAssessment.pinkyFingerMcp).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 70-90°</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.pinkyFingerPip && parseFloat(userAssessment.pinkyFingerPip) < 90
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-green-50 border-green-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.pinkyFingerPip && parseFloat(userAssessment.pinkyFingerPip) < 90
                                    ? 'text-white' : 'text-gray-800'
                                }`}>PIP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.pinkyFingerPip && parseFloat(userAssessment.pinkyFingerPip) < 90
                                    ? 'text-white' : 'text-green-700'
                                }`}>
                                  {userAssessment.pinkyFingerPip ? parseFloat(userAssessment.pinkyFingerPip).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 90-110°</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${
                                userAssessment.pinkyFingerDip && parseFloat(userAssessment.pinkyFingerDip) < 70
                                  ? 'bg-red-500 border-red-600 shadow-lg' : 'bg-purple-50 border-purple-200'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  userAssessment.pinkyFingerDip && parseFloat(userAssessment.pinkyFingerDip) < 70
                                    ? 'text-white' : 'text-gray-800'
                                }`}>DIP Joint</div>
                                <div className={`text-2xl font-black ${
                                  userAssessment.pinkyFingerDip && parseFloat(userAssessment.pinkyFingerDip) < 70
                                    ? 'text-white' : 'text-purple-700'
                                }`}>
                                  {userAssessment.pinkyFingerDip ? parseFloat(userAssessment.pinkyFingerDip).toFixed(0) : '0'}°
                                </div>
                                <div className="text-xs text-gray-700">Normal: 70-90°</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Clinical Interpretation</h4>
                    <div className="text-sm text-gray-700">
                      <p>
                        Total Active Range of Motion (TAM) = MCP + PIP + DIP joint angles. 
                        Normal values for index finger: MCP (0-90°), PIP (0-100°), DIP (0-90°).
                      </p>
                      {userAssessment.totalActiveRom && (
                        <p className="mt-2">
                          <strong>Assessment:</strong> {parseFloat(userAssessment.totalActiveRom) >= 220 ? 
                            'Excellent range of motion' : 
                            parseFloat(userAssessment.totalActiveRom) >= 180 ? 
                              'Good range of motion' : 
                              'Limited range of motion - consider follow-up'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Motion Data Summary */}
          {userAssessment.repetitionData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>Motion Data Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(userAssessment.repetitionData) ? (
                  <div className="space-y-3">
                    {userAssessment.repetitionData.map((rep: any, index: number) => (
                      <div key={index} className="bg-gray-100 p-3 rounded-lg">
                        <div className="grid md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Repetition:</span> {rep.repetition || index + 1}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {rep.duration || 0}s
                          </div>
                          <div>
                            <span className="font-medium">Landmarks:</span> {rep.landmarksDetected || 0}
                          </div>
                          <div>
                            <span className="font-medium">Motion Frames:</span> {rep.motionData?.length || 0}
                          </div>
                        </div>
                        {rep.romData && (
                          <div className="mt-2 text-xs text-gray-800">
                            ROM: MCP {rep.romData.mcpAngle?.toFixed(1)}°, 
                            PIP {rep.romData.pipAngle?.toFixed(1)}°, 
                            DIP {rep.romData.dipAngle?.toFixed(1)}°
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-700">No repetition data available</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setShowReplay(true)}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4" />
                <span>View Motion Replay</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => shareAssessmentMutation.mutate()}
                disabled={shareAssessmentMutation.isPending}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {shareAssessmentMutation.isPending ? "Creating Link..." : "Share Motion Replay"}
                </span>
              </Button>

              {shareUrl && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-800 mb-2">Shareable Link Created</div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 text-xs p-2 bg-white border rounded"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  const data = {
                    assessment: userAssessment,
                    exportedAt: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `assessment_results_${userAssessment.id}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </Button>
            </CardContent>
          </Card>

          {/* Clinical Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>TAM Assessment:</strong> Total Active Motion measurement for trigger finger evaluation.</p>
                <p><strong>Session Tracking:</strong> Multiple sessions allow progress monitoring over time.</p>
                <p><strong>Quality Score:</strong> Based on hand detection accuracy and landmark stability.</p>
                <p><strong>Motion Replay:</strong> Privacy-focused visualization showing hand skeleton movements only.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}