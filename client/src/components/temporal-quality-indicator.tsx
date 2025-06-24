import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface TemporalQualityIndicatorProps {
  temporalQuality: {[key: string]: number};
  threshold?: number;
}

export function TemporalQualityIndicator({ temporalQuality, threshold = 0.7 }: TemporalQualityIndicatorProps) {
  if (!temporalQuality || Object.keys(temporalQuality).length === 0) {
    return null;
  }

  const getQualityStatus = (quality: number) => {
    if (quality >= threshold) return 'excellent';
    if (quality >= 0.5) return 'good';
    return 'poor';
  };

  const getQualityColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getQualityIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <AlertTriangle className="w-4 h-4" />;
      case 'poor': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2 text-sm">Temporal Validation Quality</h4>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(temporalQuality).map(([finger, quality]) => {
          const status = getQualityStatus(quality);
          const percentage = Math.round(quality * 100);
          
          return (
            <div
              key={finger}
              className={`flex items-center justify-between p-2 rounded border ${getQualityColor(status)}`}
            >
              <div className="flex items-center gap-1">
                {getQualityIcon(status)}
                <span className="text-xs font-medium capitalize">{finger}</span>
              </div>
              <span className="text-xs font-bold">{percentage}%</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span>≥{threshold * 100}% - Excellent</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-600" />
            <span>≥50% - Good</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>&lt;50% - Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}