import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProgressBar from "@/components/progress-bar";
import type { InjuryType } from "@/types/assessment";

export default function InjurySelection() {
  const [selectedInjury, setSelectedInjury] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const { data: injuryTypesData, isLoading } = useQuery({
    queryKey: ["/api/injury-types"],
    enabled: !!currentUser,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ injuryType }: { injuryType: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${currentUser.id}`, { 
        injuryType,
        isFirstTime: false 
      });
      return response.json();
    },
    onSuccess: (data) => {
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setLocation("/assessments");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save injury type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInjurySelect = (injuryName: string) => {
    setSelectedInjury(injuryName);
  };

  const handleContinue = () => {
    if (!selectedInjury) return;
    updateUserMutation.mutate({ injuryType: selectedInjury });
  };

  const handleBack = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="medical-card">
          <CardContent>
            <div className="text-center py-8">Loading injury types...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const injuryTypes: InjuryType[] = injuryTypesData?.injuryTypes || [];

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="medical-card">
        <CardContent>
          <div className="mb-8">
            <ProgressBar currentStep={1} totalSteps={3} />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select Your Injury Type</h2>
            <p className="text-medical-gray">
              Please select the type of hand or wrist injury you're recovering from. 
              This helps us customize your assessment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {injuryTypes.map((injury) => (
              <button
                key={injury.id}
                onClick={() => handleInjurySelect(injury.name)}
                className={`p-6 border-2 rounded-xl transition-all duration-200 text-left group ${
                  selectedInjury === injury.name
                    ? "border-medical-blue bg-blue-50"
                    : "border-gray-200 hover:border-medical-blue hover:bg-blue-50"
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                    selectedInjury === injury.name
                      ? "bg-medical-blue text-white"
                      : "bg-gray-100 group-hover:bg-medical-blue group-hover:text-white"
                  }`}>
                    <i className={`${injury.icon} text-xl`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{injury.name}</h3>
                    <p className="text-sm text-medical-gray">{injury.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center px-4 py-2 text-medical-gray hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedInjury || updateUserMutation.isPending}
              className="medical-button"
            >
              {updateUserMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  Continue to Assessments
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
