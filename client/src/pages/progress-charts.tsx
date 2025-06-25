import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, Target, ArrowLeft, Activity } from "lucide-react";
import { Link } from "wouter";

// Target ROM values by injury type and assessment
const targetROM = {
  'Carpal Tunnel': {
    'TAM (Total Active Motion)': 260,
    'Kapandji Score': 10,
    'Wrist Flexion': 80,
    'Wrist Extension': 70,
    'Forearm Pronation/Supination': 80,
    'Wrist Radial/Ulnar Deviation': 30,
    'DASH Score': 15
  },
  'Trigger Finger': {
    'TAM (Total Active Motion)': 260,
    'DASH Score': 10
  },
  'Distal Radius Fracture': {
    'TAM (Total Active Motion)': 240,
    'Kapandji Score': 10,
    'Wrist Flexion': 70,
    'Wrist Extension': 60,
    'Forearm Pronation/Supination': 70,
    'Wrist Radial/Ulnar Deviation': 25,
    'DASH Score': 20
  },
  'CMC Arthroplasty': {
    'TAM (Total Active Motion)': 220,
    'Kapandji Score': 8,
    'Wrist Flexion': 75,
    'Wrist Extension': 65,
    'Forearm Pronation/Supination': 75,
    'Wrist Radial/Ulnar Deviation': 28,
    'DASH Score': 25
  },
  'Metacarpal ORIF': {
    'TAM (Total Active Motion)': 270,
    'Index Finger TAM': 270,
    'Middle Finger TAM': 270,
    'Ring Finger TAM': 270,
    'Pinky Finger TAM': 270,
    'DASH Score': 15
  },
  'Phalanx Fracture': {
    'TAM (Total Active Motion)': 260,
    'DASH Score': 18
  }
};

// DASH target scores by injury type (lower is better for DASH)
const dashTargets = {
  'Carpal Tunnel': 15,
  'Trigger Finger': 10,
  'Distal Radius Fracture': 20,
  'CMC Arthroplasty': 25,
  'Metacarpal ORIF': 15,
  'Phalanx Fracture': 18
};

interface ChartDataPoint {
  day: number;
  value: number;
  date: string;
  percentage: number;
}

export default function ProgressCharts() {
  // Get user code from sessionStorage
  const storedUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const userCode = storedUser.code || localStorage.getItem('currentUserCode') || 'DEMO01';
  const userId = storedUser.id || 1;

  const { data: user } = useQuery({
    queryKey: [`/api/users/by-code/${userCode}`],
  });

  const { data: progress } = useQuery({
    queryKey: [`/api/users/${userId}/progress`],
    enabled: !!userId,
  });

  const { data: history } = useQuery({
    queryKey: [`/api/users/${userId}/history`],
    enabled: !!userId,
  });

  const { data: assessments } = useQuery({
    queryKey: [`/api/users/${userId}/assessments`],
    enabled: !!userId,
  });

  const actualUserId = user?.user?.id || userId;
  const injuryType = user?.user?.injuryType || 'Carpal Tunnel';
  const studyStartDate = user?.user?.studyStartDate || user?.user?.createdAt;
  const userHistory = history?.history || [];
  const userAssessments = assessments?.assessments || [];
  
  // Process data for charts
  const getChartData = (assessmentName: string): ChartDataPoint[] => {
    console.log(`Looking for assessment: ${assessmentName}`);
    console.log('Available assessments in history:', userHistory.map(h => h.assessmentName));
    
    const relevantHistory = userHistory.filter(item => {
      if (assessmentName === 'TAM (Total Active Motion)') {
        return item.assessmentName === 'TAM (Total Active Motion)';
      } else if (assessmentName.includes('Finger TAM')) {
        return item.assessmentName === 'TAM (Total Active Motion)';
      } else if (assessmentName.includes('Kapandji')) {
        return item.assessmentName === 'Kapandji Score';
      } else if (assessmentName === 'DASH Score') {
        console.log('Filtering for DASH Score');
        console.log('Unknown Assessment items:', userHistory.filter(h => h.assessmentName === 'Unknown Assessment'));
        return item.assessmentName === 'DASH Survey' || item.assessmentName === 'Unknown Assessment';
      } else if (assessmentName === 'Wrist Flexion' || assessmentName === 'Wrist Extension') {
        return item.assessmentName.includes('Flexion/Extension') || 
               item.assessmentName.includes('Flexion') || 
               item.assessmentName.includes('Extension') ||
               item.assessmentName.includes('Wrist');
      } else if (assessmentName.includes('Pronation/Supination')) {
        return item.assessmentName.includes('Pronation/Supination');
      } else if (assessmentName.includes('Radial/Ulnar')) {
        return item.assessmentName.includes('Radial/Ulnar');
      }
      return false;
    });

    const target = assessmentName.includes('Kapandji') ? 10 : (targetROM[injuryType]?.[assessmentName] || 100);
    const startDate = new Date(userCode === 'DEMO01' ? '2025-06-01' : user?.user?.createdAt || Date.now());

    console.log(`Processing ${relevantHistory.length} items for ${assessmentName}`);
    if (relevantHistory.length > 0) {
      console.log('Sample item keys:', Object.keys(relevantHistory[0]));
      console.log('Sample item:', relevantHistory[0]);
    }

    return relevantHistory.map(item => {
      const itemDate = new Date(item.completedAt!);
      const day = Math.floor((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Get the appropriate value based on assessment type
      let value = 0;
      if (assessmentName === 'TAM (Total Active Motion)') {
        value = parseFloat(item.totalActiveRom) || 0;
      } else if (assessmentName === 'Index Finger TAM') {
        value = parseFloat(item.indexFingerRom) || 0;
      } else if (assessmentName === 'Middle Finger TAM') {
        value = parseFloat(item.middleFingerRom) || 0;
      } else if (assessmentName === 'Ring Finger TAM') {
        value = parseFloat(item.ringFingerRom) || 0;
      } else if (assessmentName === 'Pinky Finger TAM') {
        value = parseFloat(item.pinkyFingerRom) || 0;
      } else if (assessmentName.includes('Kapandji')) {
        value = parseFloat(item.kapandjiScore || item.totalActiveRom) || 0;
      } else if (assessmentName === 'DASH Score') {
        // DASH scores come from DASH Survey assessments with dashScore field
        value = parseFloat(item.dashScore) || 0;
        console.log('DASH Score data for', item.assessmentName, ':', { dashScore: item.dashScore, finalValue: value, hasData: !!item.dashScore });
      } else if (assessmentName === 'Wrist Flexion') {
        // Use stored wrist flexion values - calculator ensures accuracy during save
        value = parseFloat(item.maxWristFlexion || item.wristFlexionAngle) || 0;
        console.log(`Wrist Flexion data for ${item.assessmentName}:`, {
          maxWristFlexion: item.maxWristFlexion,
          wristFlexionAngle: item.wristFlexionAngle,
          finalValue: value
        });
      } else if (assessmentName === 'Wrist Extension') {
        // Use stored wrist extension values - calculator ensures accuracy during save
        value = parseFloat(item.maxWristExtension || item.wristExtensionAngle) || 0;
        console.log(`Wrist Extension data for ${item.assessmentName}:`, {
          maxWristExtension: item.maxWristExtension,
          wristExtensionAngle: item.wristExtensionAngle,
          finalValue: value
        });
      } else if (assessmentName.includes('Pronation/Supination')) {
        value = (item.forearmPronationAngle || 0) + (item.forearmSupinationAngle || 0);
      } else if (assessmentName.includes('Radial/Ulnar')) {
        value = (item.wristRadialDeviationAngle || 0) + (item.wristUlnarDeviationAngle || 0);
      }
      
      // Calculate percentage based on assessment type
      let percentage;
      if (assessmentName === 'DASH Score') {
        // DASH Score: lower is better, so invert the percentage
        // 0 = 100% (perfect), target = 0% (poor)
        percentage = Math.max(0, Math.round(((target - value) / target) * 100));
      } else {
        // Other assessments: higher is better
        percentage = Math.round((value / target) * 100);
      }
      
      return {
        day: Math.max(1, day),
        value,
        date: itemDate.toLocaleDateString(),
        percentage
      };
    }).sort((a, b) => a.day - b.day);
  };

  const CustomTooltip = ({ active, payload, label, assessmentName }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const target = assessmentName.includes('Kapandji') ? 10 : (targetROM[injuryType]?.[assessmentName] || 100);
      
      // Determine unit and scoring description based on assessment type
      let unit = '°';
      let scoringDescription = 'Higher is better';
      let deltaLabel = 'Δ from target';
      
      if (assessmentName.includes('Kapandji')) {
        unit = '';
        scoringDescription = 'Higher is better (0-10 scale)';
      } else if (assessmentName === 'DASH Score') {
        unit = ' pts';
        scoringDescription = 'Lower is better (0-100 scale)';
        deltaLabel = 'Δ from target (lower is better)';
      }
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">Day {label}</p>
          <p className="text-sm text-muted-foreground">{data.date}</p>
          <p className="text-blue-600">
            Value: {data.value}{unit}
          </p>
          <p className="text-green-600">
            {data.percentage}% progress (target: {target}{unit})
          </p>
          <p className="text-xs text-muted-foreground">{scoringDescription}</p>
          <p className="text-sm text-muted-foreground">
            {deltaLabel}: {data.value - target > 0 ? '+' : ''}{data.value - target}{unit}
          </p>
        </div>
      );
    }
    return null;
  };

  // Get assessment types based on injury
  const assessmentTypes = Object.keys(targetROM[injuryType] || {});
  console.log('All assessment types for injury:', assessmentTypes);
  console.log('Checking assessment data availability...');
  
  // Filter out assessments with no data
  const assessmentTypesWithData = assessmentTypes.filter(assessmentName => {
    console.log(`Checking data for assessment: ${assessmentName}`);
    if (assessmentName.includes('Kapandji')) {
      const kapandjiHistory = userHistory.filter(h => h.assessmentName === 'Kapandji Score');
      return kapandjiHistory.length > 0;
    } else if (assessmentName === 'Wrist Flexion' || assessmentName === 'Wrist Extension') {
      const wristHistory = userHistory.filter(h => 
        h.assessmentName.includes('Flexion/Extension') || 
        h.assessmentName.includes('Flexion') || 
        h.assessmentName.includes('Extension') ||
        h.assessmentName.includes('Wrist')
      );
      return wristHistory.length > 0;
    } else if (assessmentName === 'DASH Score') {
      const dashHistory = userHistory.filter(h => h.assessmentName === 'DASH Survey' || h.assessmentName === 'Unknown Assessment');
      return dashHistory.length > 0;
    }
    return true; // Show other assessment types by default
  });
  
  // For Metacarpal ORIF, show digit breakdown
  const showDigitBreakdown = injuryType === 'Metacarpal ORIF';
  const displayAssessments = showDigitBreakdown ? 
    ['TAM (Total Active Motion)', 'Index Finger TAM', 'Middle Finger TAM', 'Ring Finger TAM', 'Pinky Finger TAM'] :
    assessmentTypesWithData;

  // Calculate days remaining based on study duration
  const studyDuration = injuryType === 'Trigger Finger' || injuryType === 'Metacarpal ORIF' || injuryType === 'Phalanx Fracture' ? 28 : 84;
  const createdDate = new Date(userCode === 'DEMO01' ? '2025-06-01' : user?.user?.createdAt || Date.now());
  const currentDate = new Date();
  const daysSinceStart = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, studyDuration - daysSinceStart);
  const currentDay = daysSinceStart + 1;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/assessments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assessments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Progress Charts</h1>
            <p className="text-muted-foreground">
              Track your recovery progress over time
            </p>
          </div>
        </div>
        
        {/* Study Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Study Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{injuryType}</div>
                <div className="text-sm text-muted-foreground">Injury Type</div>
              </div>
              <div>
                <div className="text-2xl font-bold">Day {currentDay}</div>
                <div className="text-sm text-muted-foreground">Current Day</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{daysRemaining}</div>
                <div className="text-sm text-muted-foreground">Days Remaining</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{userHistory.length}</div>
                <div className="text-sm text-muted-foreground">Total Assessments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <Tabs defaultValue={displayAssessments[0]} className="space-y-6">
        <TabsList className={`grid w-full grid-cols-${Math.min(displayAssessments.length, 5)}`}>
          {displayAssessments.map((assessmentName) => (
            <TabsTrigger key={assessmentName} value={assessmentName} className="text-xs">
              {assessmentName
                .replace(' (Total Active Motion)', '')
                .replace('Wrist ', '')
                .replace('Forearm ', '')
                .replace(' Finger TAM', '')
                .replace('TAM', 'Total')
                .replace('Flexion', 'Flex')
                .replace('Extension', 'Ext')}
            </TabsTrigger>
          ))}
        </TabsList>

        {displayAssessments.map((assessmentName) => {
          const chartData = getChartData(assessmentName);
          const target = assessmentName.includes('Kapandji') ? 10 : (targetROM[injuryType]?.[assessmentName] || 100);
          const unit = assessmentName.includes('Kapandji') ? '' : '°';
          const latestValue = chartData[chartData.length - 1]?.value || 0;
          const percentageOfTarget = Math.round((latestValue / target) * 100);
          


          return (
            <TabsContent key={assessmentName} value={assessmentName} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{assessmentName}</CardTitle>
                      <CardDescription>
                        Progress over time with target ROM line
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <Target className="h-3 w-3 mr-1" />
                          Target: {target}{assessmentName.includes('Kapandji') ? '' : unit}
                        </Badge>
                        <Badge variant={percentageOfTarget >= 80 ? "default" : "secondary"}>
                          Current: {latestValue}{unit} ({percentageOfTarget}%)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="day" 
                            label={{ value: 'Post-op Day', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            label={{ 
                              value: assessmentName.includes('Kapandji') ? 'Score' : `ROM (${unit})`, 
                              angle: -90, 
                              position: 'insideLeft' 
                            }}
                            domain={assessmentName.includes('Kapandji') ? [0, 12] : [0, Math.max(300, target + 50)]}
                          />
                          <Tooltip content={<CustomTooltip assessmentName={assessmentName} />} />
                          <ReferenceLine 
                            y={target} 
                            stroke="#059669" 
                            strokeDasharray="10 5"
                            strokeWidth={4}
                            label={{ 
                              value: `Target: ${target}${unit}`, 
                              position: "topRight", 
                              offset: 10,
                              style: { 
                                fill: '#059669', 
                                fontWeight: 'bold', 
                                fontSize: '14px',
                                backgroundColor: '#ffffff',
                                padding: '2px 4px',
                                border: '1px solid #059669',
                                borderRadius: '4px'
                              }
                            }}
                          />

                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <div className="text-center">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                        <p className="text-muted-foreground">
                          Complete some assessments to see your progress chart
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}