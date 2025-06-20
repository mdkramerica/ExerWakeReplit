import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { getInjuryIcon } from "@/components/medical-icons";

export default function Overview() {
  // Fetch all injury types
  const { data: injuryTypesData } = useQuery({
    queryKey: ['/api/injury-types']
  });

  // Fetch all assessments
  const { data: assessmentsData } = useQuery({
    queryKey: ['/api/assessments']
  });

  const injuryTypes = injuryTypesData?.injuryTypes || [];
  const assessments = assessmentsData?.assessments || [];

  // Group assessments by injury type based on the assessment mapping
  const getAssessmentsForInjury = (injuryName: string) => {
    const injuryAssessmentMap: Record<string, string[]> = {
      "Trigger Finger": ["TAM (Total Active Motion)"],
      "Carpal Tunnel": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Distal Radius Fracture": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "CMC Arthroplasty": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Metacarpal ORIF": ["TAM (Total Active Motion)"],
      "Phalanx Fracture": ["TAM (Total Active Motion)"],
      "Radial Head Replacement": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Terrible Triad Injury": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Dupuytren's Contracture": ["TAM (Total Active Motion)"],
      "Flexor Tendon Injury": ["TAM (Total Active Motion)"],
      "Extensor Tendon Injury": ["TAM (Total Active Motion)"]
    };

    const requiredAssessments = injuryAssessmentMap[injuryName] || ["TAM (Total Active Motion)"];
    return assessments.filter((assessment: any) => 
      assessment.isActive && requiredAssessments.includes(assessment.name)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Demo Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Demo Mode Available</h3>
                <p className="text-blue-700">Use access code <strong>DEMO123</strong> to test all assessments</p>
              </div>
              <Link href="/demo">
                <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700">
                  Start Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* All Assessments Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Available Assessments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((assessment: any) => (
                <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{assessment.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{assessment.description}</p>
                    <div className="flex gap-2">
                      <Link href="/demo">
                        <Button className="flex-1">
                          Demo Assessment
                        </Button>
                      </Link>
                      {assessment.videoUrl && (
                        <Button variant="outline" size="sm">
                          View Instructions
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2">
                  ← Back to Home
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Assessment Overview
              </h1>
              <p className="text-gray-600">
                Complete assessment coverage by injury type
              </p>
            </div>
          </div>

          {/* Injury Types and Assessments */}
          <div className="space-y-8">
            {injuryTypes.map((injuryType: any) => {
              const assessmentsForInjury = getAssessmentsForInjury(injuryType.name);
              const InjuryIcon = getInjuryIcon(injuryType.name);

              return (
                <Card key={injuryType.id} className="border border-gray-200">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <InjuryIcon className="w-8 h-8 text-blue-600" />
                      {injuryType.name}
                      <Badge variant="outline" className="ml-auto">
                        {assessmentsForInjury.length} assessments
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {assessmentsForInjury.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assessmentsForInjury.map((assessment: any) => (
                          <div
                            key={assessment.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-medium text-gray-900 text-sm">
                                {assessment.name}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {assessment.duration}s
                              </Badge>
                            </div>
                            
                            <p className="text-gray-600 text-xs mb-4 line-clamp-2">
                              {assessment.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                Order: {assessment.orderIndex}
                              </span>
                              
                              <Link href={`/assessment/${assessment.id}/video`}>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                                >
                                  Start Assessment
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No assessments available for this injury type</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              All assessments are available for each injury type. Complete assessments in any order.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}