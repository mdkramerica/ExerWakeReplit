import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterPlot, Scatter, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Calendar, Activity, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Patient {
  id: number;
  patientId: string;
  alias: string;
  cohortId: number;
  enrolledInStudy: boolean;
  ageGroup: string;
  sex: string;
  handDominance: string;
  surgeryDate: string;
  injuryType: string;
  postOpDay?: number;
  studyWeek?: number;
}

interface Assessment {
  id: number;
  patientId: number;
  assessmentDate: string;
  postOpDay: number;
  studyWeek: number;
  vasScore: number;
  quickDashScore: number;
  tamScore: number;
  kapandjiScore: number;
  wristFlexionAngle: number;
  percentOfNormalRom: number;
  changeFromBaseline: number;
}

interface Cohort {
  id: number;
  name: string;
  description: string;
  targetRomImprovement: number;
}

export default function LongitudinalAnalytics() {
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('12-weeks');
  const [activeTab, setActiveTab] = useState<string>('recovery-trajectories');

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ['/api/patients']
  });

  const { data: assessments } = useQuery<Assessment[]>({
    queryKey: ['/api/patient-assessments/all']
  });

  const { data: cohorts } = useQuery<Cohort[]>({
    queryKey: ['/api/cohorts']
  });

  const studyPatients = patients?.filter(p => p.enrolledInStudy) || [];
  const studyAssessments = assessments?.filter(a => 
    studyPatients.some(p => p.id === a.patientId)
  ) || [];

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = studyAssessments;
    
    if (selectedCohort !== 'all') {
      const cohortPatients = studyPatients.filter(p => p.cohortId === parseInt(selectedCohort));
      filtered = filtered.filter(a => cohortPatients.some(p => p.id === a.patientId));
    }
    
    const maxWeek = timeframe === '6-weeks' ? 6 : timeframe === '12-weeks' ? 12 : 24;
    filtered = filtered.filter(a => a.studyWeek <= maxWeek);
    
    return filtered;
  }, [studyAssessments, selectedCohort, timeframe, studyPatients]);

  // Recovery trajectory analysis
  const recoveryTrajectories = useMemo(() => {
    const trajectories: { [key: string]: any[] } = {};
    
    filteredData.forEach(assessment => {
      const patient = studyPatients.find(p => p.id === assessment.patientId);
      if (!patient) return;
      
      const key = `${patient.injuryType}-${patient.ageGroup}-${patient.sex}`;
      if (!trajectories[key]) {
        trajectories[key] = [];
      }
      
      trajectories[key].push({
        week: assessment.studyWeek,
        romImprovement: assessment.percentOfNormalRom,
        painScore: assessment.vasScore,
        functionalScore: assessment.quickDashScore,
        tamScore: assessment.tamScore,
        patientCount: 1
      });
    });
    
    // Average by week for each trajectory
    Object.keys(trajectories).forEach(key => {
      const weekGroups: { [week: number]: any[] } = {};
      trajectories[key].forEach(point => {
        if (!weekGroups[point.week]) weekGroups[point.week] = [];
        weekGroups[point.week].push(point);
      });
      
      trajectories[key] = Object.keys(weekGroups).map(week => {
        const weekData = weekGroups[parseInt(week)];
        return {
          week: parseInt(week),
          romImprovement: weekData.reduce((sum, d) => sum + d.romImprovement, 0) / weekData.length,
          painScore: weekData.reduce((sum, d) => sum + d.painScore, 0) / weekData.length,
          functionalScore: weekData.reduce((sum, d) => sum + d.functionalScore, 0) / weekData.length,
          tamScore: weekData.reduce((sum, d) => sum + d.tamScore, 0) / weekData.length,
          patientCount: weekData.length
        };
      }).sort((a, b) => a.week - b.week);
    });
    
    return trajectories;
  }, [filteredData, studyPatients]);

  // Outcome predictors analysis
  const outcomePredictors = useMemo(() => {
    const baselineData = filteredData.filter(a => a.studyWeek === 0);
    const finalData = filteredData.filter(a => a.studyWeek >= 12);
    
    return baselineData.map(baseline => {
      const patient = studyPatients.find(p => p.id === baseline.patientId);
      const final = finalData.find(f => f.patientId === baseline.patientId);
      
      if (!patient || !final) return null;
      
      return {
        patientId: patient.patientId,
        ageGroup: patient.ageGroup,
        sex: patient.sex,
        handDominance: patient.handDominance,
        injuryType: patient.injuryType,
        baselineRom: baseline.percentOfNormalRom,
        baselinePain: baseline.vasScore,
        baselineFunction: baseline.quickDashScore,
        finalRom: final.percentOfNormalRom,
        finalPain: final.vasScore,
        finalFunction: final.quickDashScore,
        romImprovement: final.percentOfNormalRom - baseline.percentOfNormalRom,
        painReduction: baseline.vasScore - final.vasScore,
        functionImprovement: baseline.quickDashScore - final.quickDashScore,
      };
    }).filter(Boolean);
  }, [filteredData, studyPatients]);

  // Adherence metrics
  const adherenceMetrics = useMemo(() => {
    const expectedAssessments = studyPatients.length * 13; // 13 weeks (0-12)
    const completedAssessments = filteredData.length;
    const adherenceRate = (completedAssessments / expectedAssessments) * 100;
    
    const missedVisits = studyPatients.map(patient => {
      const patientAssessments = filteredData.filter(a => a.patientId === patient.id);
      const expectedWeeks = Array.from({length: 13}, (_, i) => i);
      const completedWeeks = patientAssessments.map(a => a.studyWeek);
      const missedWeeks = expectedWeeks.filter(week => !completedWeeks.includes(week));
      
      return {
        patientId: patient.patientId,
        injuryType: patient.injuryType,
        totalMissed: missedWeeks.length,
        missedWeeks,
        adherencePercent: ((13 - missedWeeks.length) / 13) * 100
      };
    });
    
    return {
      overallAdherence: adherenceRate,
      missedVisits,
      averageAdherence: missedVisits.reduce((sum, p) => sum + p.adherencePercent, 0) / missedVisits.length
    };
  }, [filteredData, studyPatients]);

  // Demographic subgroup analysis
  const demographicAnalysis = useMemo(() => {
    const subgroups: { [key: string]: any } = {};
    
    ['ageGroup', 'sex', 'handDominance', 'injuryType'].forEach(demographic => {
      subgroups[demographic] = {};
      
      studyPatients.forEach(patient => {
        const key = patient[demographic as keyof Patient] as string;
        if (!subgroups[demographic][key]) {
          subgroups[demographic][key] = {
            count: 0,
            outcomes: []
          };
        }
        subgroups[demographic][key].count++;
        
        const patientOutcome = outcomePredictors.find(o => o?.patientId === patient.patientId);
        if (patientOutcome) {
          subgroups[demographic][key].outcomes.push(patientOutcome);
        }
      });
      
      // Calculate averages for each subgroup
      Object.keys(subgroups[demographic]).forEach(key => {
        const outcomes = subgroups[demographic][key].outcomes;
        if (outcomes.length > 0) {
          subgroups[demographic][key].averageRomImprovement = 
            outcomes.reduce((sum: number, o: any) => sum + o.romImprovement, 0) / outcomes.length;
          subgroups[demographic][key].averagePainReduction = 
            outcomes.reduce((sum: number, o: any) => sum + o.painReduction, 0) / outcomes.length;
          subgroups[demographic][key].averageFunctionImprovement = 
            outcomes.reduce((sum: number, o: any) => sum + o.functionImprovement, 0) / outcomes.length;
        }
      });
    });
    
    return subgroups;
  }, [studyPatients, outcomePredictors]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Longitudinal Analytics</h2>
          <p className="text-muted-foreground">
            Phase 2: Advanced recovery trajectory and outcome prediction analysis
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select cohort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cohorts</SelectItem>
            {cohorts?.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id.toString()}>
                {cohort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6-weeks">6 Weeks</SelectItem>
            <SelectItem value="12-weeks">12 Weeks</SelectItem>
            <SelectItem value="24-weeks">24 Weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyPatients.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredData.length} total assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adherence Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adherenceMetrics.averageAdherence.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Study protocol compliance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg ROM Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outcomePredictors.length > 0 
                ? (outcomePredictors.reduce((sum, p) => sum + (p?.romImprovement || 0), 0) / outcomePredictors.length).toFixed(1)
                : '0'}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Baseline to 12-week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Pain Reduction</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outcomePredictors.length > 0 
                ? (outcomePredictors.reduce((sum, p) => sum + (p?.painReduction || 0), 0) / outcomePredictors.length).toFixed(1)
                : '0'}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              VAS points
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recovery-trajectories">Recovery Trajectories</TabsTrigger>
          <TabsTrigger value="outcome-predictors">Outcome Predictors</TabsTrigger>
          <TabsTrigger value="adherence-analysis">Adherence Analysis</TabsTrigger>
          <TabsTrigger value="demographic-subgroups">Demographic Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="recovery-trajectories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Trajectory Patterns</CardTitle>
              <CardDescription>
                ROM improvement over time by patient subgroups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: 'Study Week', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'ROM % of Normal', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {Object.keys(recoveryTrajectories).slice(0, 5).map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey="romImprovement"
                        data={recoveryTrajectories[key]}
                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                        name={key.split('-').join(' ')}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcome-predictors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Baseline Predictors of Outcome</CardTitle>
              <CardDescription>
                Relationship between baseline characteristics and 12-week outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterPlot>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="baselineRom" 
                      name="Baseline ROM"
                      label={{ value: 'Baseline ROM (%)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      dataKey="romImprovement" 
                      name="ROM Improvement"
                      label={{ value: 'ROM Improvement (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Patients" data={outcomePredictors} fill="#8884d8" />
                  </ScatterPlot>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adherence-analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Adherence Distribution</CardTitle>
                <CardDescription>Patient compliance with study protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adherenceMetrics.missedVisits.slice(0, 10).map((patient, index) => (
                    <div key={patient.patientId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{patient.patientId}</Badge>
                        <span className="text-sm">{patient.injuryType}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{patient.adherencePercent.toFixed(0)}%</span>
                        <Badge variant={patient.adherencePercent >= 80 ? "default" : "destructive"}>
                          {patient.totalMissed} missed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Assessment Completion</CardTitle>
                <CardDescription>Protocol adherence by study week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {/* Placeholder for weekly completion chart */}
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Weekly completion chart placeholder
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographic-subgroups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(demographicAnalysis).map((demographic) => (
              <Card key={demographic}>
                <CardHeader>
                  <CardTitle className="capitalize">{demographic.replace(/([A-Z])/g, ' $1')}</CardTitle>
                  <CardDescription>Outcome differences by {demographic}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(demographicAnalysis[demographic]).map((subgroup) => {
                      const data = demographicAnalysis[demographic][subgroup];
                      return (
                        <div key={subgroup} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{subgroup}</div>
                            <div className="text-sm text-muted-foreground">n = {data.count}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {data.averageRomImprovement ? `+${data.averageRomImprovement.toFixed(1)}%` : 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground">ROM improvement</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}