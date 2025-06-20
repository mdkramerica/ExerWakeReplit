import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

interface PostOpCalculatorProps {
  surgeryDate: string;
  currentDate?: Date;
}

export default function PostOpCalculator({ surgeryDate, currentDate = new Date() }: PostOpCalculatorProps) {
  const [postOpInfo, setPostOpInfo] = useState({
    days: 0,
    weeks: 0,
    phase: '',
    milestone: '',
  });

  useEffect(() => {
    const surgery = new Date(surgeryDate);
    const current = currentDate;
    const diffTime = current.getTime() - surgery.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    let phase = '';
    let milestone = '';

    if (diffDays < 0) {
      phase = 'Pre-surgery';
      milestone = 'Surgery scheduled';
    } else if (diffDays <= 7) {
      phase = 'Acute phase';
      milestone = 'Initial healing';
    } else if (diffDays <= 21) {
      phase = 'Early recovery';
      milestone = 'Wound healing';
    } else if (diffDays <= 42) {
      phase = 'Intermediate recovery';
      milestone = 'Active rehabilitation';
    } else if (diffDays <= 84) {
      phase = 'Late recovery';
      milestone = 'Return to activity';
    } else {
      phase = 'Long-term follow-up';
      milestone = 'Maintenance phase';
    }

    setPostOpInfo({
      days: diffDays,
      weeks: diffWeeks,
      phase,
      milestone,
    });
  }, [surgeryDate, currentDate]);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Pre-surgery':
        return 'bg-gray-100 text-gray-800';
      case 'Acute phase':
        return 'bg-red-100 text-red-800';
      case 'Early recovery':
        return 'bg-orange-100 text-orange-800';
      case 'Intermediate recovery':
        return 'bg-yellow-100 text-yellow-800';
      case 'Late recovery':
        return 'bg-blue-100 text-blue-800';
      case 'Long-term follow-up':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Post-Op Timeline</span>
        </CardTitle>
        <CardDescription>
          Recovery progress since surgery
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Days Post-Op */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{postOpInfo.days}</div>
              <div className="text-sm text-muted-foreground">days post-op</div>
            </div>
          </div>

          {/* Study Week */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">Week {postOpInfo.weeks}</div>
              <div className="text-sm text-muted-foreground">study timeline</div>
            </div>
          </div>

          {/* Recovery Phase */}
          <div className="space-y-2">
            <Badge className={getPhaseColor(postOpInfo.phase)} variant="secondary">
              {postOpInfo.phase}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {postOpInfo.milestone}
            </div>
          </div>
        </div>
        
        {/* Study Week Progress */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Study Progress</span>
            <span>Week {postOpInfo.weeks} of 12</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((postOpInfo.weeks / 12) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}