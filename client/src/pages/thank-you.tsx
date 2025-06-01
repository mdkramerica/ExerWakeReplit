import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChartBar, Plus, ArrowRight, TrendingUp } from "lucide-react";

export default function ThankYou() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const { data: progressData } = useQuery({
    queryKey: [`/api/users/${currentUser?.id}/progress`],
    enabled: !!currentUser,
  });

  const { data: assessmentsData } = useQuery({
    queryKey: [`/api/users/${currentUser?.id}/assessments`],
    enabled: !!currentUser,
  });

  const handleViewResults = () => {
    // In a real app, this would show detailed results
    setLocation("/assessments");
  };

  const handleStartNewSession = () => {
    // Clear current session and start fresh
    sessionStorage.removeItem('currentUser');
    setLocation("/");
  };

  const handleContactProvider = () => {
    // In a real app, this would open contact information or support
    alert("Contact functionality would open your healthcare provider's contact information.");
  };

  const progress = progressData || { completed: 0, total: 0, percentage: 0 };
  const assessments = assessmentsData?.assessments || [];
  
  // Calculate session stats
  const completedAssessments = assessments.filter((a: any) => a.isCompleted);
  const averageQuality = completedAssessments.length > 0 
    ? Math.round(completedAssessments.reduce((sum: number, a: any) => sum + (a.qualityScore || 85), 0) / completedAssessments.length)
    : 85;
  
  const sessionDuration = completedAssessments.length * 2.5; // Rough estimate

  return (
    <div className="max-w-md mx-auto">
      <Card className="medical-card">
        <CardContent className="pt-6 text-center">
          <img 
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
            alt="Medical success checkmark with hands" 
            className="rounded-lg mx-auto mb-6 w-full h-48 object-cover"
          />
          
          <div className="w-16 h-16 bg-medical-success rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Assessment Complete!</h2>
          <p className="text-medical-gray mb-8">
            Thank you for completing your hand and wrist range of motion assessment. 
            Your data has been securely recorded for your healthcare provider.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center mb-3">
              <TrendingUp className="w-5 h-5 text-medical-success mr-2" />
              <h3 className="font-semibold text-gray-900">Assessment Summary</h3>
            </div>
            <div className="space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-medical-gray">Total Assessments:</span>
                <span className="font-medium">{progress.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medical-gray">Completed:</span>
                <span className="font-medium text-medical-success">{progress.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medical-gray">Duration:</span>
                <span className="font-medium">{Math.round(sessionDuration)} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medical-gray">Data Quality:</span>
                <span className={`font-medium ${
                  averageQuality >= 90 ? 'text-medical-success' :
                  averageQuality >= 70 ? 'text-yellow-600' : 'text-orange-600'
                }`}>
                  {averageQuality >= 90 ? 'Excellent' :
                   averageQuality >= 70 ? 'Good' : 'Fair'} ({averageQuality}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <Button
              onClick={handleViewResults}
              className="w-full medical-button"
            >
              <ChartBar className="w-4 h-4 mr-2" />
              View Detailed Results
            </Button>
            <Button
              onClick={handleStartNewSession}
              variant="outline"
              className="w-full border-medical-blue text-medical-blue hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Assessment
            </Button>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-medical-gray mb-2">Questions about your results?</div>
            <button
              onClick={handleContactProvider}
              className="text-medical-blue hover:text-medical-deep font-medium text-sm transition-colors"
            >
              Contact Your Healthcare Provider
              <ArrowRight className="w-3 h-3 ml-1 inline" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
