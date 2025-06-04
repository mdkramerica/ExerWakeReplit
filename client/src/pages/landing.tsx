import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, ShieldX, Lock, Info, ArrowRight } from "lucide-react";
import RealLiveTracker from "@/components/real-live-tracker";

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
      // Store user code in localStorage for redirect logic
      localStorage.setItem('currentUserCode', data.user.code);
      
      if (data.isFirstTime && !data.hasInjuryType) {
        setLocation("/injury-selection");
      } else {
        setLocation(`/assessment-list/${data.user.code}`);
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
            <RealLiveTracker className="rounded-lg mx-auto mb-6 w-full h-48" />
            
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Advanced Motion Analysis Platform</h2>
            <p className="text-gray-800 mb-8">
              Experience precision hand tracking with 21-joint detection. Enter your 6-digit code to begin your clinical assessment.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="access-code" className="block text-sm font-medium text-gray-800 mb-2">
                Access Code
              </label>
              <Input
                id="access-code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest bg-white border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="000000"
                disabled={verifyCodeMutation.isPending}
              />
              <p className="text-xs text-gray-800 mt-2 flex items-center">
                <Info className="w-3 h-3 mr-1" />
                Code provided by your healthcare provider
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
          
          <div className="mt-6 text-center">
            <Link href="/overview">
              <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                Browse All Assessments
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-800">
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-1 text-green-600" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center">
                <ShieldX className="w-4 h-4 mr-1 text-green-600" />
                <span>Privacy Protected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
