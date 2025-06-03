import { Shield, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import exerLogoPath from "@assets/exer-logo.png";

export default function Header() {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.removeItem('currentUser');
    // Navigate back to landing page
    setLocation("/");
  };

  // Check if user is logged in and not on landing page
  const currentUser = sessionStorage.getItem('currentUser');
  const isLoggedIn = !!currentUser;
  const isOnLandingPage = location === "/";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img 
              src={exerLogoPath} 
              alt="Exer AI Logo" 
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-xl font-semibold text-exer-navy">ROM Research Platform</h1>
              <p className="text-sm text-exer-gray">Hand & Wrist Recovery Assessment</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-exer-gray">
              <Shield className="w-4 h-4 text-exer-purple" />
              <span>Secure & Private</span>
            </div>
            {isLoggedIn && !isOnLandingPage && (
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
