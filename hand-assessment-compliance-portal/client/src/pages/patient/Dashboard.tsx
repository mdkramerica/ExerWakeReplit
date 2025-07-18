import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ChevronRight, LogOut } from "lucide-react";

export default function PatientDashboard() {
  const [, setLocation] = useLocation();
  
  // Get user data from localStorage (set during login)
  const userData = JSON.parse(localStorage.getItem("patientData") || "{}");
  
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["/api/assessments"],
  });

  const { data: userAssessments } = useQuery({
    queryKey: [`/api/patient/${userData.id}/assessments`],
    enabled: !!userData.id,
  });

  const handleLogout = () => {
    localStorage.removeItem("patientData");
    setLocation("/");
  };

  const startAssessment = (assessmentId: number) => {
    setLocation(`/patient/assessment/${assessmentId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Count completed assessments by type
  const completedByType = userAssessments?.reduce((acc: Record<number, number>, assessment: any) => {
    acc[assessment.assessmentId] = (acc[assessment.assessmentId] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome back!</h1>
              <p className="text-gray-600">Patient ID: {userData.patientId}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Your Injury Type</h2>
          <p className="text-gray-600">{userData.injuryType}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Assessments</h2>
          {assessments?.map((assessment: any) => (
            <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{assessment.name}</CardTitle>
                    <CardDescription>{assessment.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Estimated time</p>
                    <p className="font-semibold">{assessment.estimatedMinutes} min</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">
                      Completed: {completedByType[assessment.id] || 0} times
                    </p>
                  </div>
                  <Button onClick={() => startAssessment(assessment.id)} className="flex items-center gap-2">
                    Start Assessment
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {userAssessments && userAssessments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Assessments</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {userAssessments.slice(0, 5).map((assessment: any) => (
                    <div key={assessment.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {assessments?.find((a: any) => a.id === assessment.assessmentId)?.name || "Unknown Assessment"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(assessment.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {assessment.qualityScore && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Quality Score</p>
                            <p className="font-semibold">{assessment.qualityScore}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}