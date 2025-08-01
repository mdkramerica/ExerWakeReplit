import { Shield, Lock, ShieldX } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <div className="text-sm text-gray-800">
              © 2025 ROM Research Platform. HIPAA Compliant.
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-800">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
              <a href="/clinical/login" className="hover:text-blue-600 transition-colors font-medium">Clinical Portal</a>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-800">
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-green-600 mr-1" />
              <span>Secure</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-4 h-4 text-green-600 mr-1" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center">
              <ShieldX className="w-4 h-4 text-green-600 mr-1" />
              <span>HIPAA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
