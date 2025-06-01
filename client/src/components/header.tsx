import { Shield, ShieldX, HandMetal } from "lucide-react";
import exerLogoPath from "@assets/exer-logo.png";

export default function Header() {
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
          </div>
        </div>
      </div>
    </header>
  );
}
