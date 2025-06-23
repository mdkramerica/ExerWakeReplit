import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Users, TrendingUp, Activity, Hand, Zap, Wrench, Stethoscope, Heart } from "lucide-react";
import { Link } from "wouter";

const injuryConditions = [
  {
    name: 'Trigger Finger',
    description: 'Finger tendon disorder',
    assessments: ['TAM'],
    icon: <Hand className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-800',
    assessmentCount: 1
  },
  {
    name: 'Carpal Tunnel',
    description: 'Nerve compression in the wrist',
    assessments: ['TAM', 'Kapandji', 'F/E', 'P/S', 'R/U'],
    icon: <Zap className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-800',
    assessmentCount: 5
  },
  {
    name: 'Distal Radius Fracture',
    description: 'Broken wrist bone',
    assessments: ['TAM', 'Kapandji', 'F/E', 'P/S', 'R/U'],
    icon: <Activity className="h-5 w-5" />,
    color: 'bg-green-100 text-green-800',
    assessmentCount: 5
  },
  {
    name: 'CMC Arthroplasty',
    description: 'Thumb joint replacement',
    assessments: ['TAM', 'Kapandji', 'F/E', 'P/S', 'R/U'],
    icon: <Wrench className="h-5 w-5" />,
    color: 'bg-orange-100 text-orange-800',
    assessmentCount: 5
  },
  {
    name: 'Metacarpal ORIF',
    description: 'Hand bone surgical repair',
    assessments: ['TAM'],
    icon: <Stethoscope className="h-5 w-5" />,
    color: 'bg-red-100 text-red-800',
    assessmentCount: 1
  },
  {
    name: 'Phalanx Fracture',
    description: 'Finger bone fracture',
    assessments: ['TAM'],
    icon: <Heart className="h-5 w-5" />,
    color: 'bg-yellow-100 text-yellow-800',
    assessmentCount: 1
  }
];

const assessmentMap = {
  'TAM': {
    name: 'TAM (Total Active Motion)',
    description: 'Measures finger range of motion',
    duration: 300,
    id: 1
  },
  'Kapandji': {
    name: 'Kapandji Score',
    description: 'Thumb opposition assessment',
    duration: 180,
    id: 2
  },
  'F/E': {
    name: 'Wrist Flexion/Extension',
    description: 'Wrist range of motion measurement',
    duration: 240,
    id: 3
  },
  'P/S': {
    name: 'Forearm Pronation/Supination',
    description: 'Forearm rotation assessment',
    duration: 200,
    id: 4
  },
  'R/U': {
    name: 'Wrist Radial/Ulnar Deviation',
    description: 'Side-to-side wrist movement',
    duration: 220,
    id: 5
  }
};

export default function Overview() {
  const { data: assessments } = useQuery({
    queryKey: ["/api/assessments"],
  });

  const { data: progress } = useQuery({
    queryKey: ["/api/users/1/progress"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/users/by-code/DEMO01"],
  });

  const userInjuryType = user?.user?.injuryType || 'Carpal Tunnel';
  const userCondition = injuryConditions.find(c => c.name === userInjuryType);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Assessment Overview</h1>
        <p className="text-muted-foreground">
          Track your progress and complete assessments for your recovery journey.
        </p>
      </div>



      <Tabs defaultValue="your-assessments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="your-assessments">Your Assessments</TabsTrigger>
          <TabsTrigger value="all-conditions">All Conditions</TabsTrigger>
          <TabsTrigger value="assessment-library">Assessment Library</TabsTrigger>
        </TabsList>

        <TabsContent value="your-assessments" className="space-y-6">
          {userCondition && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${userCondition.color}`}>
                    {userCondition.icon}
                  </div>
                  <div>
                    <CardTitle>{userCondition.name}</CardTitle>
                    <CardDescription>{userCondition.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {progress?.completed || 0} of {userCondition.assessmentCount} completed today
                    </span>
                  </div>
                  <Progress value={progress?.percentage || 0} />
                  
                  <div className="flex gap-2 mt-4">
                    <Link href="/assessments">
                      <Button>
                        <Activity className="h-4 w-4 mr-2" />
                        Today's Assessments
                      </Button>
                    </Link>
                    <Link href="/progress">
                      <Button variant="outline">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid gap-3">
                    {userCondition.assessments.map((assessmentCode) => {
                      const assessment = assessmentMap[assessmentCode];
                      return (
                        <div key={assessmentCode} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <h3 className="font-medium">{assessment.name}</h3>
                            <p className="text-sm text-muted-foreground">{assessment.description}</p>
                            <Badge variant="outline">
                              {Math.floor(assessment.duration / 60)} min
                            </Badge>
                          </div>
                          <Link href={`/assessment/${assessment.id}/video/DEMO01`}>
                            <Button>Start Assessment</Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all-conditions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {injuryConditions.map((condition) => (
              <Card key={condition.name}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${condition.color}`}>
                      {condition.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{condition.name}</CardTitle>
                      <CardDescription>{condition.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Required Assessments</span>
                      <Badge variant="secondary">{condition.assessmentCount}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {condition.assessments.map((assessment) => (
                        <Badge key={assessment} variant="outline" className="text-xs">
                          {assessment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assessment-library" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Assessment Library</CardTitle>
              <CardDescription>
                All available assessments for hand and wrist rehabilitation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Object.entries(assessmentMap).map(([code, assessment]) => (
                  <div key={code} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{assessment.name}</h3>
                        <Badge variant="secondary">{code}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{assessment.description}</p>
                      <Badge variant="outline">
                        {Math.floor(assessment.duration / 60)} min
                      </Badge>
                    </div>
                    <Link href={`/assessment/${assessment.id}/video/DEMO01`}>
                      <Button variant="outline">Start Assessment</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}