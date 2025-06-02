import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Play, Eye, Calendar, History, RotateCcw, Settings, Shield } from "lucide-react";
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

interface InjuryType {
  id: number;
  name: string;
  description: string;
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

export default function Admin() {
  const [, navigate] = useLocation();
  const [showReplay, setShowReplay] = useState<string | null>(null);
  const [selectedInjuryType, setSelectedInjuryType] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("admin");

  // Get all injury types
  const { data: injuryTypesData, isLoading: injuryTypesLoading } = useQuery({
    queryKey: ["/api/injury-types"],
  });

  // Get all assessments (not filtered by injury type in admin mode)
  const { data: allAssessmentsData, isLoading: allAssessmentsLoading } = useQuery({
    queryKey: ["/api/assessments"],
  });

  // Get assessments filtered by injury type if selected
  const { data: filteredAssessmentsData, isLoading: filteredAssessmentsLoading } = useQuery({
    queryKey: [`/api/assessments/injury/${selectedInjuryType}`],
    enabled: selectedInjuryType !== "all",
  });

  // Use filtered assessments if injury type is selected, otherwise use all
  const assessmentData = selectedInjuryType === "all" ? allAssessmentsData : filteredAssessmentsData;
  const assessmentsLoading = selectedInjuryType === "all" ? allAssessmentsLoading : filteredAssessmentsLoading;

  // Get all user assessment history (admin can see all)
  const { data: allHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/admin/all-user-assessments"],
  });

  const isLoading = injuryTypesLoading || assessmentsLoading || historyLoading;

  const injuryTypes = injuryTypesData?.injuryTypes || [];
  const assessments = assessmentData?.assessments || [];
  const allHistory = allHistoryData?.history || [];

  const handleStartAssessment = (assessmentId: number, assessmentName: string) => {
    // Store admin mode in sessionStorage
    sessionStorage.setItem('adminMode', 'true');
    sessionStorage.setItem('currentUser', JSON.stringify({ id: 'admin', code: 'ADMIN', injuryType: selectedInjuryType }));
    
    navigate(`/assessment/${assessmentId}/video`);
  };

  const handleViewReplay = (userAssessmentId: number, assessmentName: string) => {
    setShowReplay(`${userAssessmentId}-${assessmentName}`);
  };

  if (showReplay) {
    const [userAssessmentId, assessmentName] = showReplay.split('-');
    return (
      <AssessmentReplay 
        assessmentName={assessmentName}
        userAssessmentId={userAssessmentId}
        onClose={() => setShowReplay(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Admin Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <Badge variant="destructive" className="ml-2">ADMIN ACCESS</Badge>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem('currentUser');
              localStorage.removeItem('adminMode');
              navigate('/');
            }}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Exit Admin Mode
          </Button>
        </div>
        <p className="text-gray-600">Full access to all assessments and injury types across the platform</p>
      </div>

      {/* Injury Type Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Assessment Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Injury Type:</label>
            <Select value={selectedInjuryType} onValueChange={setSelectedInjuryType}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select injury type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Injury Types</SelectItem>
                {injuryTypes.map((injury: InjuryType) => (
                  <SelectItem key={injury.id} value={injury.name}>
                    {injury.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {assessments.length} assessments available
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Available Assessments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Available Assessments
            {selectedInjuryType !== "all" && (
              <Badge variant="secondary" className="ml-2">{selectedInjuryType}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment: Assessment) => {
              const InjuryIconComponent = getInjuryIcon(selectedInjuryType === "all" ? "General" : selectedInjuryType);
              
              return (
                <Card key={assessment.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <InjuryIconComponent className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 mb-1 truncate">{assessment.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{assessment.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{assessment.duration}s</span>
                      </div>
                      {assessment.repetitions && (
                        <div className="flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>{assessment.repetitions}x</span>
                        </div>
                      )}
                      <Badge variant={assessment.isActive ? "default" : "secondary"} className="text-xs">
                        {assessment.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <Button 
                      onClick={() => handleStartAssessment(assessment.id, assessment.name)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Assessment
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {assessments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No assessments available for the selected criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All User Assessment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            All User Assessment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allHistory.length > 0 ? (
            <div className="space-y-3">
              {allHistory.slice(0, 20).map((record: UserAssessment, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-800">{record.assessmentName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(record.completedAt).toLocaleDateString()}</span>
                    </div>
                    {record.totalActiveRom && (
                      <Badge variant="outline" className="text-xs">
                        Total ROM: {record.totalActiveRom}°
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReplay(record.id, record.assessmentName)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Replay
                  </Button>
                </div>
              ))}
              
              {allHistory.length > 20 && (
                <div className="text-center py-4">
                  <Badge variant="secondary">
                    Showing 20 of {allHistory.length} total assessments
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No assessment history available.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}