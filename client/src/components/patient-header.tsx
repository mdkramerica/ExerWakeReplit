import React from 'react';
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useLocation } from "wouter";

interface PatientHeaderProps {
  patientCode: string;
  patientAlias?: string;
}

export function PatientHeader({ patientCode, patientAlias }: PatientHeaderProps) {
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    // Clear any stored patient session data
    localStorage.removeItem('patientCode');
    localStorage.removeItem('patientSession');
    
    // Redirect to login/verification page
    setLocation('/');
    
    // Optional: Show confirmation
    console.log('Patient logged out successfully');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Patient Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {patientAlias || `Patient ${patientCode}`}
            </span>
          </div>
          <span className="text-xs text-gray-500">Code: {patientCode}</span>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </div>
  );
}