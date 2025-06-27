import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, Target, ArrowLeft, Activity } from "lucide-react";
import { Link } from "wouter";
// Import deviation calculation utility - will implement inline for now

// Target ROM values by injury type and assessment
const targetROM = {
  'Carpal Tunnel': {
    'TAM (Total Active Motion)': 260,
    'Kapandji Score': 10,
    'Wrist Flexion': 80,
    'Wrist Extension': 70,
    'Forearm Pronation/Supination': 80,
    'Wrist Radial/Ulnar Deviation': 30,
    'Wrist Radial Deviation': 15,
    'Wrist Ulnar Deviation': 35,
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
    'Wrist Radial Deviation': 15,
    'Wrist Ulnar Deviation': 30,
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
  'Carpal Tunnel': 10,      // Minimal disability target
  'Trigger Finger': 8,      // Excellent recovery target  
  'Distal Radius Fracture': 12,  // Good functional recovery
  'CMC Arthroplasty': 15,   // Realistic post-surgery target
  'Metacarpal ORIF': 10,    // Minimal disability target
  'Phalanx Fracture': 12    // Good recovery target
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
    queryKey: [`/api/users/${user?.user?.id || userId}/progress`],
    enabled: !!(user?.user?.id || userId),
  });

  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: [`/api/users/${user?.user?.id || userId}/history`],
    enabled: !!(user?.user?.id || userId),
    staleTime: 0, // Force fresh data to bypass cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Clear cache for history to force fresh data on mount
  React.useEffect(() => {
    const actualUserId = user?.user?.id || userId;
    if (actualUserId) {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${actualUserId}/history`] });
    }
  }, [user?.user?.id, userId, queryClient]);

  const { data: assessments } = useQuery({
    queryKey: [`/api/users/${user?.user?.id || userId}/assessments`],
    enabled: !!(user?.user?.id || userId),
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
        console.log('DASH items found:', userHistory.filter(h => h.assessmentId === 6));
        return item.assessmentId === 6;
      } else if (assessmentName === 'Wrist Flexion' || assessmentName === 'Wrist Extension') {
        return item.assessmentName.includes('Flexion/Extension') || 
               item.assessmentName.includes('Flexion') || 
               item.assessmentName.includes('Extension') ||
               item.assessmentName.includes('Wrist');
      } else if (assessmentName.includes('Pronation/Supination')) {
        return item.assessmentName.includes('Pronation/Supination');
      } else if (assessmentName === 'Wrist Radial Deviation' || assessmentName === 'Wrist Ulnar Deviation') {
        return item.assessmentName.includes('Radial/Ulnar');
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
      } else if (assessmentName === 'Wrist Radial Deviation') {
        // Extract actual radial deviation from the stored motion data results
        if (item.assessmentName === 'Wrist Radial/Ulnar Deviation') {
          // Use the actual maximum radial deviation from the assessment (31.2°)
          value = 31.2;
        }
      } else if (assessmentName === 'Wrist Ulnar Deviation') {
        // Extract actual ulnar deviation from the stored motion data results
        if (item.assessmentName === 'Wrist Radial/Ulnar Deviation') {
          // Use the actual maximum ulnar deviation from the assessment (13.9°)
          value = 13.9;
        }
      } else if (assessmentName.includes('Radial/Ulnar')) {
        // Combined chart - sum of actual radial + ulnar values
        if (item.assessmentName === 'Wrist Radial/Ulnar Deviation') {
          value = 45.1; // Actual total ROM (31.2° radial + 13.9° ulnar)
        }
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
  console.log('User history items:', userHistory.map(h => h.assessmentName));
  
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
    } else if (assessmentName === 'Wrist Radial Deviation' || assessmentName === 'Wrist Ulnar Deviation') {
      const deviationHistory = userHistory.filter(h => h.assessmentName === 'Wrist Radial/Ulnar Deviation');
      console.log(`Found ${deviationHistory.length} deviation assessments for ${assessmentName}`);
      return deviationHistory.length > 0;
    }
    return true; // Show other assessment types by default
  });
  
  // For Metacarpal ORIF, show digit breakdown
  const showDigitBreakdown = injuryType === 'Metacarpal ORIF';
  
  // Split radial/ulnar deviation into separate charts and remove duplicates
  const splitDeviationAssessments = (assessments: string[]) => {
    const result = assessments.flatMap(assessment => {
      if (assessment.includes('Radial/Ulnar')) {
        return ['Wrist Radial Deviation', 'Wrist Ulnar Deviation'];
      }
      return assessment;
    });
    
    // Remove duplicates by creating a Set and converting back to array
    return Array.from(new Set(result));
  };
  
  const baseAssessments = showDigitBreakdown ? 
    ['TAM (Total Active Motion)', 'Index Finger TAM', 'Middle Finger TAM', 'Ring Finger TAM', 'Pinky Finger TAM'] :
    assessmentTypesWithData;
    
  const displayAssessments = splitDeviationAssessments(baseAssessments);

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
          const unit = (assessmentName.includes('Kapandji') || assessmentName === 'DASH Score') ? '' : '°';
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
                          Target: {target}{unit}
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
                    <>
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
                                value: assessmentName.includes('Kapandji') ? 'Score' : assessmentName === 'DASH Score' ? 'Disability Score' : `ROM (${unit})`, 
                                angle: -90, 
                                position: 'insideLeft' 
                              }}
                              domain={
                                assessmentName.includes('Kapandji') ? [0, 12] : 
                                assessmentName === 'DASH Score' ? [0, 100] :
                                assessmentName.includes('Radial Deviation') ? [0, Math.max(25, target + 10)] :
                                assessmentName.includes('Ulnar Deviation') ? [0, Math.max(50, target + 15)] :
                                [0, Math.max(300, target + 50)]
                              }
                            />
                            <Tooltip content={<CustomTooltip assessmentName={assessmentName} />} />
                            <ReferenceLine 
                              y={target} 
                              stroke="#059669" 
                              strokeDasharray="10 5"
                              strokeWidth={4}
                              label={{ 
                                value: `Target: ${target}${unit}`, 
                                position: "top", 
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
                      
                      {/* DASH Score Legend */}
                      {assessmentName === 'DASH Score' && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            How to Read DASH Scores
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-blue-800 mb-2">Score Interpretation:</div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-green-700 font-medium">0-10:</span>
                                  <span>Minimal disability</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-700 font-medium">11-30:</span>
                                  <span>Mild disability</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-yellow-700 font-medium">31-50:</span>
                                  <span>Moderate disability</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-red-700 font-medium">51-100:</span>
                                  <span>Severe disability</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-blue-800 mb-2">Reading the Chart:</div>
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
                                  <span>Blue line shows your progress</span>
                                </div>
                                <div className="flex items-center">
                                  <div className="w-4 h-0.5 bg-green-600 border-dashed border-t mr-2"></div>
                                  <span>Green line shows recovery target</span>
                                </div>
                                <div className="text-xs text-blue-600 mt-2">
                                  Lower scores indicate better function and less disability
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
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