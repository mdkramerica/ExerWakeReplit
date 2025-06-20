import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function DemoAccess() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  // Fetch all assessments for demo display
  const { data: assessmentsData } = useQuery({
    queryKey: ['/api/assessments']
  });

  const assessments = assessmentsData?.assessments || [];

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      // Verify demo user exists and log them in
      const response = await apiRequest('POST', '/api/users/verify-code', { code: 'DEMO01' });

      if (response.user) {
        // Set injury type if needed
        if (!response.user.injuryType) {
          await apiRequest('PATCH', `/api/users/${response.user.id}`, { 
            injuryType: 'Carpal Tunnel',
            isFirstTime: false
          });
        }
        
        // Navigate to assessment list
        setLocation(`/assessment-list/DEMO01`);
      }
    } catch (error) {
      console.error('Demo login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectAssessment = async (assessmentId: number) => {
    setIsLoading(true);
    try {
      // Verify demo user exists
      const response = await apiRequest('POST', '/api/users/verify-code', { code: 'DEMO01' });

      if (response.user && !response.user.injuryType) {
        await apiRequest('PATCH', `/api/users/${response.user.id}`, { 
          injuryType: 'Carpal Tunnel',
          isFirstTime: false
        });
      }
      
      // Navigate directly to assessment
      setLocation(`/assessment/${assessmentId}/video`);
    } catch (error) {
      console.error('Direct assessment access failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const response = await apiRequest('POST', '/api/demo/reset');
      toast({
        title: "Demo Reset Complete",
        description: "All demo data has been cleared. You can now start fresh demonstrations.",
      });
    } catch (error) {
      console.error('Demo reset failed:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset demo data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Demo Access</h1>
            <p className="text-lg text-gray-600">
              Experience all assessments using demo user: <strong>DEMO01</strong>
            </p>
            
            {/* Reset Demo Button */}
            <div className="mt-4">
              <Button
                onClick={handleResetDemo}
                disabled={isResetting}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isResetting ? "Resetting..." : "Reset Demo Data"}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Clear all demo progress to start fresh demonstrations
              </p>
            </div>
          </div>

          {/* Quick Access Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Full Assessment Experience</CardTitle>
                <CardDescription>
                  Go through the complete patient flow with all assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Start Complete Demo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Individual Assessments</CardTitle>
                <CardDescription>
                  Test specific assessments directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Click any assessment below to start immediately
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Individual Assessments */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment: any) => (
              <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{assessment.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {assessment.duration}s
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {assessment.description}
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleDirectAssessment(assessment.id)}
                      disabled={isLoading}
                      className="w-full"
                      size="sm"
                    >
                      Demo This Assessment
                    </Button>
                    {assessment.videoUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(assessment.videoUrl, '_blank')}
                      >
                        View Instructions
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Demo Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Demo Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">For Complete Demo:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Uses demo user account (DEMO123)</li>
                    <li>• Shows full patient assessment flow</li>
                    <li>• Includes injury type selection</li>
                    <li>• Displays progress tracking</li>
                    <li>• Shows results and analytics</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">For Individual Assessment:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Direct access to specific assessment</li>
                    <li>• Skip patient setup flow</li>
                    <li>• Test specific functionality</li>
                    <li>• View assessment instructions</li>
                    <li>• Record and analyze results</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}