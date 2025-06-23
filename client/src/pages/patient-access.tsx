import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Target,
  Trophy,
  Flame,
  Star,
  PlayCircle,
  ArrowRight
} from 'lucide-react';

export default function PatientAccess() {
  const [accessCode, setAccessCode] = useState('');
  
  const demoPatients = [
    { code: 'DEMO01', alias: 'Demo Patient', injuryType: 'Carpal Tunnel', streak: 5 },
    { code: '421475', alias: 'Patient 421475', injuryType: 'Distal Radius Fracture', streak: 3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Your Recovery Journey
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your daily assessments, build streaks, and monitor your progress
          </p>
        </div>

        {/* Access Code Entry */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Enter Your Access Code</CardTitle>
            <CardDescription className="text-center">
              Use the code provided by your healthcare team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter access code..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono"
              />
            </div>
            <Link href={`/patient/${accessCode}`}>
              <Button 
                className="w-full" 
                disabled={!accessCode}
                size="lg"
              >
                Access My Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Demo Section */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Try a Demo
            </h3>
            <p className="text-sm text-muted-foreground">
              Explore the patient experience with these demo accounts
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {demoPatients.map((patient) => (
              <Card key={patient.code} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{patient.alias}</h4>
                        <p className="text-sm text-muted-foreground">{patient.injuryType}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">{patient.streak} day streak</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {patient.code}
                      </Badge>
                    </div>
                    
                    <Link href={`/patient/${patient.code}`}>
                      <Button className="w-full">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Try Demo
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="font-medium mb-2">Daily Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Visual calendar showing your daily assessment completions and progress
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-medium mb-2">Goal Achievement</h3>
              <p className="text-sm text-muted-foreground">
                Track your recovery goals and celebrate milestones along the way
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="font-medium mb-2">Streak Rewards</h3>
              <p className="text-sm text-muted-foreground">
                Build daily streaks and unlock achievements for consistent progress
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}