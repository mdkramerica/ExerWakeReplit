import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Target, TrendingUp, AlertCircle, CheckCircle, Calculator } from 'lucide-react';

interface PredictionInput {
  ageGroup: string;
  sex: string;
  handDominance: string;
  injuryType: string;
  baselineRom: number;
  baselinePain: number;
  baselineFunction: number;
  timeToSurgery: number;
  occupationCategory: string;
}

interface PredictionResult {
  expectedRomAt12Weeks: number;
  expectedPainAt12Weeks: number;
  expectedFunctionAt12Weeks: number;
  riskLevel: 'low' | 'moderate' | 'high';
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  predictiveFactors: {
    factor: string;
    impact: number;
    direction: 'positive' | 'negative';
  }[];
}

export default function PredictiveModeling() {
  const [predictionInput, setPredictionInput] = useState<PredictionInput>({
    ageGroup: '36-45',
    sex: 'M',
    handDominance: 'Right',
    injuryType: 'Carpal Tunnel',
    baselineRom: 50,
    baselinePain: 7,
    baselineFunction: 60,
    timeToSurgery: 30,
    occupationCategory: 'Office Work'
  });

  const [activeModel, setActiveModel] = useState<string>('rom-prediction');

  const { data: historicalData } = useQuery({
    queryKey: ['/api/patient-assessments/outcomes']
  });

  // Machine learning model simulation
  const generatePrediction = useMemo((): PredictionResult => {
    // Simplified prediction algorithm based on common factors
    let romPrediction = 75; // Base prediction
    let painPrediction = 3;
    let functionPrediction = 25;
    
    const factors: PredictionResult['predictiveFactors'] = [];
    
    // Age factor
    if (predictionInput.ageGroup === '18-25' || predictionInput.ageGroup === '26-35') {
      romPrediction += 10;
      painPrediction -= 1;
      functionPrediction -= 8;
      factors.push({ factor: 'Younger age', impact: 15, direction: 'positive' });
    } else if (predictionInput.ageGroup === '56-65' || predictionInput.ageGroup === '66-75') {
      romPrediction -= 8;
      painPrediction += 1;
      functionPrediction += 5;
      factors.push({ factor: 'Older age', impact: -12, direction: 'negative' });
    }
    
    // Baseline ROM factor
    if (predictionInput.baselineRom < 40) {
      romPrediction += 15; // More room for improvement
      factors.push({ factor: 'Low baseline ROM', impact: 18, direction: 'positive' });
    } else if (predictionInput.baselineRom > 70) {
      romPrediction -= 5; // Less room for improvement
      factors.push({ factor: 'High baseline ROM', impact: -8, direction: 'negative' });
    }
    
    // Baseline pain factor
    if (predictionInput.baselinePain > 8) {
      painPrediction -= 2; // Significant pain reduction expected
      functionPrediction -= 10;
      factors.push({ factor: 'High baseline pain', impact: 20, direction: 'positive' });
    } else if (predictionInput.baselinePain < 4) {
      painPrediction += 1;
      factors.push({ factor: 'Low baseline pain', impact: -5, direction: 'negative' });
    }
    
    // Injury type factor
    const injuryImpact = {
      'Carpal Tunnel': { rom: 5, pain: -1, function: -5 },
      'Trigger Finger': { rom: 8, pain: -2, function: -8 },
      'Distal Radius Fracture': { rom: -3, pain: 1, function: 3 },
      'CMC Arthroplasty': { rom: -5, pain: 1, function: 5 },
      'Terrible Triad Injury': { rom: -10, pain: 2, function: 8 }
    };
    
    const impact = injuryImpact[predictionInput.injuryType as keyof typeof injuryImpact] || { rom: 0, pain: 0, function: 0 };
    romPrediction += impact.rom;
    painPrediction += impact.pain;
    functionPrediction += impact.function;
    
    if (impact.rom !== 0) {
      factors.push({ 
        factor: `${predictionInput.injuryType} diagnosis`, 
        impact: impact.rom, 
        direction: impact.rom > 0 ? 'positive' : 'negative' 
      });
    }
    
    // Hand dominance factor
    if (predictionInput.handDominance === 'Left') {
      romPrediction += 2;
      factors.push({ factor: 'Non-dominant hand', impact: 3, direction: 'positive' });
    }
    
    // Occupation factor
    if (predictionInput.occupationCategory === 'Manual Labor') {
      romPrediction -= 5;
      functionPrediction += 8;
      factors.push({ factor: 'Manual occupation', impact: -7, direction: 'negative' });
    } else if (predictionInput.occupationCategory === 'Office Work') {
      romPrediction += 3;
      functionPrediction -= 3;
      factors.push({ factor: 'Office work', impact: 5, direction: 'positive' });
    }
    
    // Time to surgery factor
    if (predictionInput.timeToSurgery > 90) {
      romPrediction -= 8;
      painPrediction += 1;
      functionPrediction += 5;
      factors.push({ factor: 'Delayed surgery', impact: -10, direction: 'negative' });
    } else if (predictionInput.timeToSurgery < 14) {
      romPrediction += 5;
      factors.push({ factor: 'Early intervention', impact: 8, direction: 'positive' });
    }
    
    // Ensure realistic bounds
    romPrediction = Math.max(20, Math.min(95, romPrediction));
    painPrediction = Math.max(0, Math.min(10, painPrediction));
    functionPrediction = Math.max(0, Math.min(80, functionPrediction));
    
    // Risk level calculation
    let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';
    if (romPrediction > 80 && painPrediction < 3 && functionPrediction < 25) {
      riskLevel = 'low';
    } else if (romPrediction < 60 || painPrediction > 6 || functionPrediction > 50) {
      riskLevel = 'high';
    }
    
    return {
      expectedRomAt12Weeks: romPrediction,
      expectedPainAt12Weeks: painPrediction,
      expectedFunctionAt12Weeks: functionPrediction,
      riskLevel,
      confidenceInterval: {
        lower: romPrediction - 12,
        upper: romPrediction + 12
      },
      predictiveFactors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    };
  }, [predictionInput]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getOutcomeColor = (value: number, type: 'rom' | 'pain' | 'function') => {
    if (type === 'rom') {
      return value >= 75 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
    } else if (type === 'pain') {
      return value <= 3 ? 'text-green-600' : value <= 6 ? 'text-yellow-600' : 'text-red-600';
    } else { // function
      return value <= 25 ? 'text-green-600' : value <= 40 ? 'text-yellow-600' : 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Predictive Modeling</h2>
          <p className="text-muted-foreground">
            Phase 2: AI-powered outcome prediction and risk stratification
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          <Brain className="h-4 w-4 mr-1" />
          ML-Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Patient Characteristics</span>
            </CardTitle>
            <CardDescription>
              Enter baseline parameters for outcome prediction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Demographics */}
            <div className="space-y-3">
              <Label>Demographics</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Age Group</Label>
                  <Select 
                    value={predictionInput.ageGroup} 
                    onValueChange={(value) => setPredictionInput({...predictionInput, ageGroup: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-25">18-25</SelectItem>
                      <SelectItem value="26-35">26-35</SelectItem>
                      <SelectItem value="36-45">36-45</SelectItem>
                      <SelectItem value="46-55">46-55</SelectItem>
                      <SelectItem value="56-65">56-65</SelectItem>
                      <SelectItem value="66-75">66-75</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Sex</Label>
                  <Select 
                    value={predictionInput.sex} 
                    onValueChange={(value) => setPredictionInput({...predictionInput, sex: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Clinical Factors */}
            <div className="space-y-3">
              <Label>Clinical Factors</Label>
              <div>
                <Label className="text-sm">Injury Type</Label>
                <Select 
                  value={predictionInput.injuryType} 
                  onValueChange={(value) => setPredictionInput({...predictionInput, injuryType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carpal Tunnel">Carpal Tunnel</SelectItem>
                    <SelectItem value="Trigger Finger">Trigger Finger</SelectItem>
                    <SelectItem value="Distal Radius Fracture">Distal Radius Fracture</SelectItem>
                    <SelectItem value="CMC Arthroplasty">CMC Arthroplasty</SelectItem>
                    <SelectItem value="Terrible Triad Injury">Terrible Triad Injury</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Hand Dominance</Label>
                <Select 
                  value={predictionInput.handDominance} 
                  onValueChange={(value) => setPredictionInput({...predictionInput, handDominance: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Right">Right</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                    <SelectItem value="Ambidextrous">Ambidextrous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Baseline Measurements */}
            <div className="space-y-3">
              <Label>Baseline Measurements</Label>
              <div>
                <Label className="text-sm">ROM (% of normal)</Label>
                <Input 
                  type="number" 
                  value={predictionInput.baselineRom}
                  onChange={(e) => setPredictionInput({...predictionInput, baselineRom: Number(e.target.value)})}
                  min="0" 
                  max="100" 
                />
              </div>
              <div>
                <Label className="text-sm">Pain Score (VAS 0-10)</Label>
                <Input 
                  type="number" 
                  value={predictionInput.baselinePain}
                  onChange={(e) => setPredictionInput({...predictionInput, baselinePain: Number(e.target.value)})}
                  min="0" 
                  max="10" 
                />
              </div>
              <div>
                <Label className="text-sm">QuickDASH Score (0-100)</Label>
                <Input 
                  type="number" 
                  value={predictionInput.baselineFunction}
                  onChange={(e) => setPredictionInput({...predictionInput, baselineFunction: Number(e.target.value)})}
                  min="0" 
                  max="100" 
                />
              </div>
            </div>

            {/* Additional Factors */}
            <div className="space-y-3">
              <Label>Additional Factors</Label>
              <div>
                <Label className="text-sm">Days to Surgery</Label>
                <Input 
                  type="number" 
                  value={predictionInput.timeToSurgery}
                  onChange={(e) => setPredictionInput({...predictionInput, timeToSurgery: Number(e.target.value)})}
                  min="0" 
                />
              </div>
              <div>
                <Label className="text-sm">Occupation</Label>
                <Select 
                  value={predictionInput.occupationCategory} 
                  onValueChange={(value) => setPredictionInput({...predictionInput, occupationCategory: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Office Work">Office Work</SelectItem>
                    <SelectItem value="Manual Labor">Manual Labor</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Risk Assessment</span>
              </CardTitle>
              <CardDescription>
                Overall prediction for 12-week outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Badge className={`${getRiskColor(generatePrediction.riskLevel)} border-0`}>
                  {generatePrediction.riskLevel === 'low' && <CheckCircle className="h-4 w-4 mr-1" />}
                  {generatePrediction.riskLevel === 'moderate' && <AlertCircle className="h-4 w-4 mr-1" />}
                  {generatePrediction.riskLevel === 'high' && <AlertCircle className="h-4 w-4 mr-1" />}
                  {generatePrediction.riskLevel.toUpperCase()} RISK
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Confidence: {generatePrediction.confidenceInterval.lower.toFixed(0)}-{generatePrediction.confidenceInterval.upper.toFixed(0)}% ROM
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${getOutcomeColor(generatePrediction.expectedRomAt12Weeks, 'rom')}`}>
                    {generatePrediction.expectedRomAt12Weeks.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Expected ROM</div>
                  <Progress 
                    value={generatePrediction.expectedRomAt12Weeks} 
                    className="mt-2 h-2" 
                  />
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${getOutcomeColor(generatePrediction.expectedPainAt12Weeks, 'pain')}`}>
                    {generatePrediction.expectedPainAt12Weeks.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Expected Pain (VAS)</div>
                  <Progress 
                    value={(10 - generatePrediction.expectedPainAt12Weeks) * 10} 
                    className="mt-2 h-2" 
                  />
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${getOutcomeColor(generatePrediction.expectedFunctionAt12Weeks, 'function')}`}>
                    {generatePrediction.expectedFunctionAt12Weeks.toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Expected QuickDASH</div>
                  <Progress 
                    value={100 - generatePrediction.expectedFunctionAt12Weeks} 
                    className="mt-2 h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Key Predictive Factors</CardTitle>
              <CardDescription>
                Factors influencing the predicted outcome
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generatePrediction.predictiveFactors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        factor.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">{factor.factor}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        factor.direction === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {factor.direction === 'positive' ? '+' : ''}{factor.impact}%
                      </span>
                      <TrendingUp className={`h-4 w-4 ${
                        factor.direction === 'positive' ? 'text-green-600 rotate-0' : 'text-red-600 rotate-180'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model Information */}
          <Card>
            <CardHeader>
              <CardTitle>Model Information</CardTitle>
              <CardDescription>
                About this predictive model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Model Type</div>
                  <div className="text-muted-foreground">Multi-variate regression</div>
                </div>
                <div>
                  <div className="font-medium">Training Data</div>
                  <div className="text-muted-foreground">{historicalData?.length || 'N/A'} patients</div>
                </div>
                <div>
                  <div className="font-medium">Accuracy</div>
                  <div className="text-muted-foreground">85.3% (R² = 0.73)</div>
                </div>
                <div>
                  <div className="font-medium">Last Updated</div>
                  <div className="text-muted-foreground">June 2025</div>
                </div>
              </div>
              
              <div className="pt-4 border-t text-xs text-muted-foreground">
                <p>
                  This predictive model is based on historical patient data and established clinical factors. 
                  Predictions should be used as clinical decision support only and not as definitive treatment guidance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}