import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProgressBar from "@/components/progress-bar";
import { getInjuryIcon } from "@/components/medical-icons";
import distalRadiusFractureImg from "@assets/distal-radius-fracture-18.jpg";
import triggerFingerImg from "@assets/trigger-finger-5.jpg";
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
            <h2 className="text-2xl font-semibold text-exer-navy mb-2">Select Your Injury Type</h2>
            <p className="text-exer-gray">
              Please select the type of hand or wrist injury you're recovering from. 
              This helps us customize your assessment.
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <Button
              onClick={handleContinue}
              disabled={!selectedInjury || updateUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
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

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {injuryTypes.map((injury) => (
              <button
                key={injury.id}
                onClick={() => handleInjurySelect(injury.name)}
                className={`p-6 border-2 rounded-xl transition-all duration-200 text-left group ${
                  selectedInjury === injury.name
                    ? "border-exer-purple bg-purple-50"
                    : "border-gray-200 hover:border-exer-purple hover:bg-purple-50"
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center transition-all duration-200 ${
                    selectedInjury === injury.name
                      ? "bg-medical-blue ring-2 ring-blue-300"
                      : "bg-gray-100 group-hover:bg-medical-blue"
                  }`}>
                    {injury.name === "Distal Radius Fracture" ? (
                      <img 
                        src={distalRadiusFractureImg} 
                        alt="Distal Radius Fracture X-ray"
                        className="w-full h-full object-cover"
                      />
                    ) : injury.name === "Trigger Finger" ? (
                      <img 
                        src={triggerFingerImg} 
                        alt="Trigger Finger MRI"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (() => {
                        const IconComponent = getInjuryIcon(injury.name);
                        return <IconComponent className={`w-10 h-10 transition-colors duration-200 ${
                          selectedInjury === injury.name
                            ? "text-white"
                            : "text-gray-800 group-hover:text-white"
                        }`} />;
                      })()
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-exer-navy mb-1">{injury.name}</h3>
                    <p className="text-sm text-exer-gray">{injury.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center px-4 py-2 text-exer-gray hover:text-exer-navy"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedInjury || updateUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
