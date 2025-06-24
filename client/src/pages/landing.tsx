import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, ShieldX, Lock, Info, ArrowRight } from "lucide-react";
import VideoDemo from "@/components/video-demo";

export default function Landing() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      console.log('Attempting to verify code:', code);
      console.log('Making API request:', { method: 'POST', url: '/api/users/verify-code', data: { code } });
      const response = await fetch('/api/users/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('Verification successful:', data);
      // Store user data in sessionStorage
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      // Store user code in localStorage for redirect logic
      localStorage.setItem('currentUserCode', data.user.code);
      
      if (data.isFirstTime && !data.hasInjuryType) {
        setLocation("/injury-selection");
      } else {
        setLocation(`/patient/${data.user.code}`);
      }
    },
    onError: (error) => {
      console.error('Verification error:', error);
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
        description: "Access code must be exactly 6 characters.",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(code);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 6).toUpperCase();
    setCode(value);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="medical-card">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <VideoDemo className="rounded-lg mx-auto mb-6 w-full h-48" />
            
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
              disabled={verifyCodeMutation.isPending || (code.length !== 6 && code !== 'DEMO01')}
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
          
          <div className="mt-6 text-center space-y-3">
            <Link href="/overview">
              <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
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
