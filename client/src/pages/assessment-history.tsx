import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, TrendingUp, History, CheckCircle } from 'lucide-react';
import { calculateWristResults } from '@shared/wrist-results-calculator';

interface UserAssessment {
  id: number;
  assessmentName: string;
  completedAt: string;
  qualityScore: number;
  totalActiveRom?: string;
  indexFingerRom?: string;
  middleFingerRom?: string;
  ringFingerRom?: string;
  pinkyFingerRom?: string;
  kapandjiScore?: number;
  maxWristFlexion?: number;
  maxWristExtension?: number;
  handType?: string;
  sessionNumber?: number;
  repetitionData?: any[];
}

interface HistoryResponse {
  history: UserAssessment[];
}

export default function AssessmentHistory() {
  const { userCode } = useParams<{ userCode: string }>();

  const { data: historyData, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: [`/api/users/by-code/${userCode}/history`],
    enabled: !!userCode,
    staleTime: 0, // Always refetch to get latest data
    cacheTime: 0, // Don't cache results
  });



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading assessment history...</p>
        </div>
      </div>
    );
  }

  if (!historyData?.history || historyData.history.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href={`/patient/${userCode}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assessment History</h3>
              <p className="text-muted-foreground">
                Complete some assessments to see your history here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assessment History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete record of all your assessments
            </p>
          </div>
          <Link href={`/patient/${userCode}`}>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* History Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{historyData.history.length}</div>
                <div className="text-sm text-muted-foreground">Total Assessments</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(historyData.history.reduce((sum, h) => sum + (h.qualityScore || 0), 0) / historyData.history.length)}%
                </div>
                <div className="text-sm text-muted-foreground">Average Quality</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Date(historyData.history[0]?.completedAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-muted-foreground">Last Assessment</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment History List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <History className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Complete History</CardTitle>
                <p className="text-sm text-gray-600">All assessments in chronological order</p>
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
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
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
                              <div className="px-3 py-2 rounded-lg border-2 bg-white border-gray-300">
                                <div className="font-bold text-xs text-gray-700">Index</div>
                                <div className="font-bold text-lg text-gray-900">
                                  {record.indexFingerRom ? parseFloat(record.indexFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                              <div className="px-3 py-2 rounded-lg border-2 bg-white border-gray-300">
                                <div className="font-bold text-xs text-gray-700">Middle</div>
                                <div className="font-bold text-lg text-gray-900">
                                  {record.middleFingerRom ? parseFloat(record.middleFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                              <div className="px-3 py-2 rounded-lg border-2 bg-white border-gray-300">
                                <div className="font-bold text-xs text-gray-700">Ring</div>
                                <div className="font-bold text-lg text-gray-900">
                                  {record.ringFingerRom ? parseFloat(record.ringFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                              <div className="px-3 py-2 rounded-lg border-2 bg-white border-gray-300">
                                <div className="font-bold text-xs text-gray-700">Pinky</div>
                                <div className="font-bold text-lg text-gray-900">
                                  {record.pinkyFingerRom ? parseFloat(record.pinkyFingerRom).toFixed(1) : '0.0'}°
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kapandji Score Details */}
                        {record.assessmentName?.includes('Kapandji') && (record.kapandjiScore || record.totalActiveRom) && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Kapandji Score</div>
                            <div className="flex gap-3">
                              <div className={`px-4 py-3 rounded-lg border-2 ${
                                (record.kapandjiScore ? parseFloat(record.kapandjiScore.toString()) : parseFloat(record.totalActiveRom || '0')) < 8 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
                              }`}>
                                <div className={`font-bold text-xs ${
                                  (record.kapandjiScore ? parseFloat(record.kapandjiScore.toString()) : parseFloat(record.totalActiveRom || '0')) < 8 ? 'text-red-700' : 'text-green-700'
                                }`}>Score</div>
                                <div className={`font-bold text-2xl ${
                                  (record.kapandjiScore ? parseFloat(record.kapandjiScore.toString()) : parseFloat(record.totalActiveRom || '0')) < 8 ? 'text-red-900' : 'text-green-900'
                                }`}>
                                  {Math.round(record.kapandjiScore ? parseFloat(record.kapandjiScore.toString()) : parseFloat(record.totalActiveRom || '0'))}/10
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Wrist Assessment Details - Use Centralized Calculator */}
                        {record.assessmentName?.includes('Wrist') && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Wrist Range of Motion</div>
                            <div className="flex gap-3">
                              {(() => {
                                // Use the centralized calculator for consistent values
                                const wristResults = calculateWristResults(record);
                                return (
                                  <>
                                    <div className="px-3 py-2 rounded-lg border-2 bg-orange-50 border-orange-300">
                                      <div className="font-bold text-xs text-orange-700">Flexion</div>
                                      <div className="font-bold text-lg text-orange-900">{wristResults.maxFlexion.toFixed(0)}°</div>
                                    </div>
                                    <div className="px-3 py-2 rounded-lg border-2 bg-blue-50 border-blue-300">
                                      <div className="font-bold text-xs text-blue-700">Extension</div>
                                      <div className="font-bold text-lg text-blue-900">{wristResults.maxExtension.toFixed(0)}°</div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                      
                      {record.qualityScore && (
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          record.qualityScore >= 90 ? 'bg-green-100 text-green-800' :
                          record.qualityScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Quality: {record.qualityScore}%
                        </div>
                      )}

                      {/* View Results Button */}
                      {record.assessmentName?.toLowerCase().includes('wrist') ? (
                        <Link href={`/wrist-results/${userCode}/${record.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            View Results
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/assessment-results/${userCode}/${record.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            View Results
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}