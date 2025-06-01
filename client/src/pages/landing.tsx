import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, ShieldX, Lock, Info, ArrowRight } from "lucide-react";

export default function Landing() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/users/verify-code", { code });
      return response.json();
    },
    onSuccess: (data) => {
      // Store user data in sessionStorage
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      
      if (data.isFirstTime && !data.hasInjuryType) {
        setLocation("/injury-selection");
      } else {
        setLocation("/assessments");
      }
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "Please check your 6-digit access code and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({
        title: "Invalid Code Format",
        description: "Access code must be exactly 6 digits.",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(code);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="medical-card">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <img 
              src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
              alt="Medical professional with tablet" 
              className="rounded-lg mx-auto mb-6 w-full h-48 object-cover"
            />
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Your Assessment</h2>
            <p className="text-medical-gray mb-8">
              Enter your unique 6-digit code to begin your hand and wrist range of motion assessment.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="access-code" className="block text-sm font-medium text-gray-700 mb-2">
                Access Code
              </label>
              <Input
                id="access-code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest medical-input"
                placeholder="000000"
                disabled={verifyCodeMutation.isPending}
              />
              <p className="text-xs text-medical-gray mt-2 flex items-center">
                <Info className="w-3 h-3 mr-1" />
                Code provided by your healthcare provider
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              disabled={verifyCodeMutation.isPending || code.length !== 6}
            >
              {verifyCodeMutation.isPending ? (
                "Verifying..."
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-sm text-medical-gray">
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-1 text-medical-success" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center">
                <ShieldX className="w-4 h-4 mr-1 text-medical-success" />
                <span>Privacy Protected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
