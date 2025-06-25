import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Clock, 
  Flame, 
  Trophy, 
  Target,
  Star,
  Zap,
  TrendingUp,
  PlayCircle
} from 'lucide-react';
import { format, startOfDay, isSameDay, differenceInDays } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface DailyAssessment {
  id: number;
  name: string;
  description: string;
  estimatedMinutes: number;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  assessmentUrl: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletionDate?: string;
}

interface CalendarDay {
  date: string;
  status: 'completed' | 'missed' | 'pending' | 'future';
  completedAssessments: number;
  totalAssessments: number;
}

interface PatientProfile {
  id: number;
  alias: string;
  injuryType: string;
  daysSinceStart: number;
  accessCode: string;
}

export default function PatientDailyDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get patient profile from URL - handle both /patient/:code and /assessment-list/:code routes
  const pathParts = window.location.pathname.split('/');
  const userCode = pathParts[1] === 'patient' ? pathParts[2] : 
                   pathParts[1] === 'assessment-list' ? pathParts[2] : 
                   sessionStorage.getItem('userCode');

  const { data: patient, isLoading: patientLoading } = useQuery<PatientProfile>({
    queryKey: [`/api/patients/by-code/${userCode}`],
    enabled: !!userCode,
  });

  const { data: dailyAssessments, isLoading: assessmentsLoading } = useQuery<DailyAssessment[]>({
    queryKey: [`/api/patients/${userCode}/daily-assessments`],
    enabled: !!userCode,
  });

  const { data: streakData } = useQuery<StreakData>({
    queryKey: [`/api/patients/${userCode}/streak`],
    enabled: !!userCode,
  });

  const { data: calendarData } = useQuery<CalendarDay[]>({
    queryKey: [`/api/patients/${userCode}/calendar`],
    enabled: !!userCode,
  });



  const completeAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: number) => {
      return fetch(`/api/patients/${userCode}/complete-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, completedAt: new Date().toISOString() }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${userCode}/daily-assessments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${userCode}/streak`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${userCode}/calendar`] });
      toast({
        title: "Assessment Completed!",
        description: "Great job! Keep up your streak!",
      });
    },
  });

  const today = startOfDay(new Date());
  const todayAssessments = dailyAssessments?.filter(a => !a.isCompleted) || [];
  const completedToday = dailyAssessments?.filter(a => a.isCompleted) || [];
  const totalToday = dailyAssessments?.length || 0;
  const completionPercentage = totalToday > 0 ? (completedToday.length / totalToday) * 100 : 0;

  const getStreakIcon = (streak: number) => {
    if (streak >= 30) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (streak >= 14) return <Star className="h-5 w-5 text-purple-500" />;
    if (streak >= 7) return <Flame className="h-5 w-5 text-orange-500" />;
    return <Zap className="h-5 w-5 text-blue-500" />;
  };

  const getStreakMessage = (streak: number) => {
    if (streak >= 30) return "Legendary! You're unstoppable!";
    if (streak >= 14) return "Amazing! Two weeks strong!";
    if (streak >= 7) return "Great! One week streak!";
    if (streak >= 3) return "Nice! Keep it going!";
    if (streak >= 1) return "Good start! Build your streak!";
    return "Start your streak today!";
  };

  if (patientLoading || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {patient.alias}!
            </h1>
            <div className="space-y-1">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Day {patient.daysSinceStart} of your recovery journey
              </p>
              <p className="text-base font-medium text-blue-600 dark:text-blue-400">
                {patient.injuryType}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full inline-block">
                Surgery: June 20, 2025
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={`/assessment-history/${userCode}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                View Assessment History
              </Button>
            </Link>
            <Link href={`/progress-charts`}>
              <Button variant="outline" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress Charts
              </Button>
            </Link>
          </div>
        </div>

        {/* Streak Card */}
        <div 
          className="w-full rounded-lg shadow-lg border-0 p-6 streak-card-override" 
          style={{ 
            background: 'linear-gradient(to right, #f97316, #dc2626)',
            color: '#ffffff',
            minHeight: '140px'
          }}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getStreakIcon(streakData?.currentStreak || 0)}
              </div>
              <div>
                <div 
                  className="text-3xl font-bold mb-1" 
                  style={{ 
                    color: '#000000',
                    textShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.6)'
                  }}
                >
                  {streakData?.currentStreak || 0} Day Streak
                </div>
                <div 
                  className="text-sm font-medium" 
                  style={{ 
                    color: '#000000',
                    textShadow: '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(255,255,255,0.6)'
                  }}
                >
                  Since surgery (June 20)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div 
                className="text-4xl font-bold" 
                style={{ 
                  color: '#000000',
                  textShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.6)'
                }}
              >
                {streakData?.totalCompletions || 0}
              </div>
              <div 
                className="text-sm font-medium" 
                style={{ 
                  color: '#000000',
                  textShadow: '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(255,255,255,0.6)'
                }}
              >
                Total Completions
              </div>
              <div 
                className="text-xs" 
                style={{ 
                  color: '#000000',
                  textShadow: '0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.6)'
                }}
              >
                Best Streak: {streakData?.longestStreak || 0} days
              </div>
            </div>
          </div>
          <div 
            className="mt-4 px-4 py-3 rounded-lg border"
            style={{ 
              background: 'rgba(0,0,0,0.3)',
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <p 
              className="font-bold text-center text-sm" 
              style={{ 
                color: '#ffffff',
                textShadow: '0 0 4px rgba(0,0,0,0.8)'
              }}
            >
              {getStreakMessage(streakData?.currentStreak || 0)}
            </p>
          </div>
        </div>

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today's Goals</TabsTrigger>
            <TabsTrigger value="calendar">Progress Calendar</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          {/* Today's Assessments */}
          <TabsContent value="today" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Today's Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span>{completedToday.length} of {totalToday}</span>
                    </div>
                    <Progress value={completionPercentage} className="h-3" />
                  </div>
                  
                  {completionPercentage === 100 ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Outstanding! You've completed all {totalToday} assessments today! Keep building that streak - you're doing amazing work on your recovery journey!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        {todayAssessments.length} assessments remaining today. You've got this! Complete them all to keep your streak going.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Your Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{streakData?.currentStreak || 0}</div>
                      <div className="text-sm text-muted-foreground">Current Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{streakData?.longestStreak || 0}</div>
                      <div className="text-sm text-muted-foreground">Best Streak</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assessment List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Today's Assessments</h3>
              
              {assessmentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {completedToday.map((assessment) => (
                    <Card key={assessment.id} className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <h4 className="font-medium text-green-800">{assessment.name}</h4>
                            </div>
                            <p className="text-sm text-green-600">{assessment.description}</p>
                            <p className="text-xs text-green-500">
                              Completed at {assessment.completedAt ? format(new Date(assessment.completedAt), 'h:mm a') : ''}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Complete
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {todayAssessments.map((assessment) => (
                    <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <PlayCircle className="h-5 w-5 text-blue-600" />
                              <h4 className="font-medium">{assessment.name}</h4>
                              {assessment.isRequired && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{assessment.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Estimated time: {assessment.estimatedMinutes} minutes
                            </p>
                          </div>
                          <Link href={assessment.assessmentUrl}>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              Start Assessment
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {totalToday === 0 && (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="font-medium mb-2">Perfect rest day! 🌟</h3>
                        <p className="text-sm text-muted-foreground">
                          Take this well-deserved break. Your consistent effort is paying off - recovery includes proper rest too!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  

                </div>
              )}
            </div>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Progress Calendar</CardTitle>
                <CardDescription>
                  Track your daily completion streaks and see your recovery journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-8 lg:grid-cols-3">
                  {/* Calendar */}
                  <div className="lg:col-span-2">
                    <Calendar
                      key={`calendar-${calendarData?.length || 0}`}
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-lg border shadow-sm bg-white mx-auto w-fit p-4 calendar-progress-override"
                      modifiers={{
                        completed: calendarData?.filter(day => day.status === 'completed').map(day => new Date(day.date + 'T12:00:00')) || [],
                        missed: calendarData?.filter(day => day.status === 'missed').map(day => new Date(day.date + 'T12:00:00')) || [],
                        pending: calendarData?.filter(day => day.status === 'pending').map(day => new Date(day.date + 'T12:00:00')) || [],
                        surgeryDate: [new Date(2025, 5, 20)], // June 20, 2025 (month is 0-indexed)
                      }}
                      modifiersClassNames={{
                        completed: 'calendar-completed-day',
                        missed: 'calendar-missed-day', 
                        pending: 'calendar-pending-day',
                        surgeryDate: 'calendar-surgery-day'
                      }}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Legend</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completed (5/5)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Partial (1-4/5)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✕</span>
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Missed (0/5)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-blue-700 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">🏥</span>
                          </div>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Surgery Date (June 20)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-200 rounded-full border border-gray-300 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">○</span>
                          </div>
                          <span className="text-sm font-medium text-gray-500">Future/Pre-Surgery</span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedDate && (
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </h4>
                        {calendarData?.find(day => isSameDay(new Date(day.date), selectedDate)) ? (
                          <div className="space-y-3">
                            {(() => {
                              const dayData = calendarData.find(day => isSameDay(new Date(day.date), selectedDate));
                              const isRecoveryStart = format(selectedDate, 'yyyy-MM-dd') === '2025-06-20';
                              const statusColors = {
                                completed: 'bg-green-100 text-green-800 border-green-200',
                                pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
                                missed: 'bg-red-100 text-red-800 border-red-200',
                                future: 'bg-gray-100 text-gray-600 border-gray-200'
                              };
                              
                              return (
                                <>
                                  {isRecoveryStart && (
                                    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                      <span className="text-sm font-semibold text-blue-800">Surgery & Recovery Start Date</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    <Badge className={`${statusColors[dayData?.status as keyof typeof statusColors]} border font-medium px-2 py-1`}>
                                      {dayData?.status?.charAt(0).toUpperCase() + dayData?.status?.slice(1)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium text-gray-700">Assessments:</span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {dayData?.completedAssessments || 0} of {dayData?.totalAssessments || 0}
                                    </span>
                                  </div>
                                  
                                  {dayData?.completedAssessments > 0 && dayData?.status === 'pending' && (
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                                      <span className="text-xs font-medium text-blue-700">
                                        Partial completion - {dayData.completedAssessments} assessments done
                                      </span>
                                    </div>
                                  )}
                                  
                                  {dayData?.status === 'completed' && (
                                    <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-sm font-medium text-green-800">Perfect Day!</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="text-gray-400 text-lg">○</span>
                            </div>
                            <p className="text-sm font-medium text-gray-600">Future date</p>
                            <p className="text-xs text-gray-500 mt-1">Assessments will be available on this day</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              
              {/* Streak Achievements */}
              <Card className={`${(streakData?.currentStreak || 0) >= 7 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : ''}`}>
                <CardContent className="pt-6 text-center">
                  <Trophy className={`h-12 w-12 mx-auto mb-4 ${(streakData?.currentStreak || 0) >= 7 ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <h3 className="font-medium">Week Warrior</h3>
                  <p className="text-sm text-muted-foreground mb-2">Complete 7 days in a row</p>
                  <Badge variant={(streakData?.currentStreak || 0) >= 7 ? 'default' : 'secondary'}>
                    {(streakData?.currentStreak || 0) >= 7 ? 'Unlocked!' : `${streakData?.currentStreak || 0}/7`}
                  </Badge>
                </CardContent>
              </Card>

              <Card className={`${(streakData?.currentStreak || 0) >= 14 ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' : ''}`}>
                <CardContent className="pt-6 text-center">
                  <Star className={`h-12 w-12 mx-auto mb-4 ${(streakData?.currentStreak || 0) >= 14 ? 'text-purple-500' : 'text-gray-400'}`} />
                  <h3 className="font-medium">Two Week Champion</h3>
                  <p className="text-sm text-muted-foreground mb-2">Complete 14 days in a row</p>
                  <Badge variant={(streakData?.currentStreak || 0) >= 14 ? 'default' : 'secondary'}>
                    {(streakData?.currentStreak || 0) >= 14 ? 'Unlocked!' : `${streakData?.currentStreak || 0}/14`}
                  </Badge>
                </CardContent>
              </Card>

              <Card className={`${(streakData?.currentStreak || 0) >= 30 ? 'bg-gradient-to-br from-gold-50 to-yellow-50 border-yellow-200' : ''}`}>
                <CardContent className="pt-6 text-center">
                  <Flame className={`h-12 w-12 mx-auto mb-4 ${(streakData?.currentStreak || 0) >= 30 ? 'text-orange-500' : 'text-gray-400'}`} />
                  <h3 className="font-medium">Monthly Master</h3>
                  <p className="text-sm text-muted-foreground mb-2">Complete 30 days in a row</p>
                  <Badge variant={(streakData?.currentStreak || 0) >= 30 ? 'default' : 'secondary'}>
                    {(streakData?.currentStreak || 0) >= 30 ? 'Unlocked!' : `${streakData?.currentStreak || 0}/30`}
                  </Badge>
                </CardContent>
              </Card>

              {/* Completion Achievements */}
              <Card className={`${(streakData?.totalCompletions || 0) >= 50 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : ''}`}>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className={`h-12 w-12 mx-auto mb-4 ${(streakData?.totalCompletions || 0) >= 50 ? 'text-green-500' : 'text-gray-400'}`} />
                  <h3 className="font-medium">Half Century</h3>
                  <p className="text-sm text-muted-foreground mb-2">Complete 50 total assessments</p>
                  <Badge variant={(streakData?.totalCompletions || 0) >= 50 ? 'default' : 'secondary'}>
                    {(streakData?.totalCompletions || 0) >= 50 ? 'Unlocked!' : `${streakData?.totalCompletions || 0}/50`}
                  </Badge>
                </CardContent>
              </Card>

              <Card className={`${(streakData?.totalCompletions || 0) >= 100 ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200' : ''}`}>
                <CardContent className="pt-6 text-center">
                  <Target className={`h-12 w-12 mx-auto mb-4 ${(streakData?.totalCompletions || 0) >= 100 ? 'text-blue-500' : 'text-gray-400'}`} />
                  <h3 className="font-medium">Centurion</h3>
                  <p className="text-sm text-muted-foreground mb-2">Complete 100 total assessments</p>
                  <Badge variant={(streakData?.totalCompletions || 0) >= 100 ? 'default' : 'secondary'}>
                    {(streakData?.totalCompletions || 0) >= 100 ? 'Unlocked!' : `${streakData?.totalCompletions || 0}/100`}
                  </Badge>
                </CardContent>
              </Card>

              <Card className={`${(streakData?.longestStreak || 0) >= (streakData?.currentStreak || 0) && (streakData?.longestStreak || 0) > 0 ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200' : ''}`}>
                <CardContent className="pt-6 text-center">
                  <Zap className={`h-12 w-12 mx-auto mb-4 ${(streakData?.longestStreak || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  <h3 className="font-medium">Personal Best</h3>
                  <p className="text-sm text-muted-foreground mb-2">Your longest streak ever</p>
                  <Badge variant={(streakData?.longestStreak || 0) > 0 ? 'default' : 'secondary'}>
                    {(streakData?.longestStreak || 0)} days
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}