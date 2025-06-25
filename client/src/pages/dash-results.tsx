import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Target
} from 'lucide-react';
import { PatientHeader } from '@/components/patient-header';

const DASH_QUESTIONS = [
  { id: 1, question: "Open a tight or new jar", category: "Physical Function" },
  { id: 2, question: "Write", category: "Physical Function" },
  { id: 3, question: "Turn a key", category: "Physical Function" },
  { id: 4, question: "Prepare a meal", category: "Physical Function" },
  { id: 5, question: "Push open a heavy door", category: "Physical Function" },
  { id: 6, question: "Place an object on a shelf above your head", category: "Physical Function" },
  { id: 7, question: "Do heavy household chores (e.g., wash walls, wash floors)", category: "Physical Function" },
  { id: 8, question: "Garden or do yard work", category: "Physical Function" },
  { id: 9, question: "Make a bed", category: "Physical Function" },
  { id: 10, question: "Carry a shopping bag or briefcase", category: "Physical Function" },
  { id: 11, question: "Carry a heavy object (over 10 lbs)", category: "Physical Function" },
  { id: 12, question: "Change a lightbulb overhead", category: "Physical Function" },
  { id: 13, question: "Wash or blow dry your hair", category: "Physical Function" },
  { id: 14, question: "Wash your back", category: "Physical Function" },
  { id: 15, question: "Put on a pullover sweater", category: "Physical Function" },
  { id: 16, question: "Use a knife to cut food", category: "Physical Function" },
  { id: 17, question: "Recreational activities which require little effort (e.g., cardplaying, knitting, etc.)", category: "Physical Function" },
  { id: 18, question: "Recreational activities in which you take some force or impact through your arm, shoulder or hand (e.g., golf, hammering, tennis, etc.)", category: "Physical Function" },
  { id: 19, question: "Recreational activities in which you move your arm freely (e.g., playing frisbee, badminton, etc.)", category: "Physical Function" },
  { id: 20, question: "Manage transportation needs (getting from one place to another)", category: "Physical Function" },
  { id: 21, question: "Sexual activities", category: "Physical Function" },
  { id: 22, question: "During the past week, to what extent has your arm, shoulder or hand problem interfered with your normal social activities with family, friends, neighbors or groups?", category: "Social Function" },
  { id: 23, question: "During the past week, were you limited in your work or other regular daily activities as a result of your arm, shoulder or hand problem?", category: "Role Function" },
  { id: 24, question: "Arm, shoulder or hand pain", category: "Symptoms" },
  { id: 25, question: "Arm, shoulder or hand pain when you performed any specific activity", category: "Symptoms" },
  { id: 26, question: "Tingling (pins and needles) in your arm, shoulder or hand", category: "Symptoms" },
  { id: 27, question: "Weakness in your arm, shoulder or hand", category: "Symptoms" },
  { id: 28, question: "Stiffness in your arm, shoulder or hand", category: "Symptoms" },
  { id: 29, question: "During the past week, how much difficulty have you had sleeping as a result of the pain in your arm, shoulder or hand?", category: "Symptoms" },
  { id: 30, question: "I feel less capable, less confident or less useful because of my arm, shoulder or hand problem", category: "Social Function" }
];

const RESPONSE_OPTIONS = [
  { value: 1, label: "No difficulty", description: "Not limited at all", color: "bg-green-100 text-green-800" },
  { value: 2, label: "Mild difficulty", description: "Slightly limited", color: "bg-yellow-100 text-yellow-800" },
  { value: 3, label: "Moderate difficulty", description: "Moderately limited", color: "bg-orange-100 text-orange-800" },
  { value: 4, label: "Severe difficulty", description: "Very limited", color: "bg-red-100 text-red-800" },
  { value: 5, label: "Unable", description: "Cannot perform", color: "bg-red-200 text-red-900" }
];

const getDashScoreInterpretation = (score: number) => {
  if (score <= 15) return { level: "Minimal", color: "text-green-600", description: "Little to no disability", bgColor: "bg-green-50" };
  if (score <= 30) return { level: "Mild", color: "text-yellow-600", description: "Mild disability", bgColor: "bg-yellow-50" };
  if (score <= 50) return { level: "Moderate", color: "text-orange-600", description: "Moderate disability", bgColor: "bg-orange-50" };
  if (score <= 70) return { level: "Severe", color: "text-red-600", description: "Severe disability", bgColor: "bg-red-50" };
  return { level: "Extreme", color: "text-red-800", description: "Extreme disability", bgColor: "bg-red-100" };
};

const getCategoryStats = (responses: Record<number, number>, category: string) => {
  const categoryQuestions = DASH_QUESTIONS.filter(q => q.category === category);
  const categoryResponses = categoryQuestions
    .filter(q => responses[q.id])
    .map(q => responses[q.id]);
  
  if (categoryResponses.length === 0) return null;
  
  const average = categoryResponses.reduce((sum, val) => sum + val, 0) / categoryResponses.length;
  const categoryScore = ((average - 1) / 4) * 100;
  
  return {
    score: Math.round(categoryScore * 10) / 10,
    answered: categoryResponses.length,
    total: categoryQuestions.length,
    responses: categoryResponses
  };
};

export default function DashResults() {
  const { userCode, assessmentId } = useParams();
  
  const { data: assessmentData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${assessmentId}/details`],
    enabled: !!assessmentId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading DASH results...</p>
        </div>
      </div>
    );
  }

  if (!assessmentData?.userAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PatientHeader patientCode={userCode} />
        <div className="max-w-4xl mx-auto p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Assessment Not Found</h3>
              <p className="text-red-600 mb-4">The requested DASH assessment could not be found.</p>
              <Link href={`/patient/${userCode}/dashboard`}>
                <Button>Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { userAssessment } = assessmentData;
  const responses = userAssessment.responses || {};
  const dashScore = userAssessment.dashScore || 0;
  const interpretation = getDashScoreInterpretation(dashScore);
  
  // Parse responses if they're stored as JSON string
  const parsedResponses = typeof responses === 'string' ? JSON.parse(responses) : responses;

  const categories = ['Physical Function', 'Social Function', 'Role Function', 'Symptoms'];
  const categoryStats = categories.map(cat => ({
    name: cat,
    stats: getCategoryStats(parsedResponses, cat)
  })).filter(cat => cat.stats);

  const completedAt = new Date(userAssessment.completedAt);
  const sessionNumber = userAssessment.sessionNumber || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientHeader patientCode={userCode} />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/patient/${userCode}/dashboard`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DASH Assessment Results</h1>
            <p className="text-gray-600">Session {sessionNumber} • Completed {completedAt.toLocaleDateString()}</p>
          </div>
        </div>

        {/* Score Overview */}
        <Card className={`mb-6 ${interpretation.bgColor} border-gray-200`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-blue-600" />
                  Overall DASH Score
                </CardTitle>
                <CardDescription>
                  Disabilities of the Arm, Shoulder and Hand questionnaire results
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900">{dashScore.toFixed(1)}</div>
                <div className="text-sm text-gray-600">out of 100</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Badge className={`${interpretation.color} bg-white border-current mb-2`}>
                  {interpretation.level} Disability
                </Badge>
                <p className="text-sm text-gray-600">{interpretation.description}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {dashScore <= 30 ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">Lower is Better</span>
                </div>
                <p className="text-sm text-gray-600">0 = No disability, 100 = Maximum disability</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">{Object.keys(parsedResponses).length}/30</span>
                </div>
                <p className="text-sm text-gray-600">Questions answered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Category Summary</TabsTrigger>
            <TabsTrigger value="responses">Detailed Responses</TabsTrigger>
            <TabsTrigger value="interpretation">Clinical Interpretation</TabsTrigger>
          </TabsList>

          {/* Category Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryStats.map((category) => (
                <Card key={category.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>
                      {category.stats.answered} of {category.stats.total} questions answered
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{category.stats.score.toFixed(1)}</span>
                        <Badge variant={category.stats.score <= 30 ? "secondary" : category.stats.score <= 50 ? "outline" : "destructive"}>
                          {category.stats.score <= 30 ? "Good" : category.stats.score <= 50 ? "Moderate" : "High Impact"}
                        </Badge>
                      </div>
                      <Progress value={category.stats.score} className="h-2" />
                      <p className="text-sm text-gray-600">
                        Average difficulty level in {category.name.toLowerCase()} activities
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Detailed Responses Tab */}
          <TabsContent value="responses" className="space-y-6">
            {categories.map((categoryName) => {
              const categoryQuestions = DASH_QUESTIONS.filter(q => q.category === categoryName);
              const hasResponses = categoryQuestions.some(q => parsedResponses[q.id]);
              
              if (!hasResponses) return null;

              return (
                <Card key={categoryName}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {categoryName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryQuestions.map((question) => {
                        const response = parsedResponses[question.id];
                        if (!response) return null;
                        
                        const responseOption = RESPONSE_OPTIONS.find(opt => opt.value === response);
                        
                        return (
                          <div key={question.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-2">
                                  {question.id}. {question.question}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge className={responseOption?.color}>
                                    {responseOption?.label}
                                  </Badge>
                                  <span className="text-sm text-gray-600">
                                    {responseOption?.description}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">{response}</div>
                                <div className="text-xs text-gray-500">Score</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Clinical Interpretation Tab */}
          <TabsContent value="interpretation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Clinical Interpretation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Score Ranges</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded bg-green-50">
                        <span>0-15: Minimal Disability</span>
                        <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-yellow-50">
                        <span>16-30: Mild Disability</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-orange-50">
                        <span>31-50: Moderate Disability</span>
                        <Badge className="bg-orange-100 text-orange-800">Fair</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-red-50">
                        <span>51-70: Severe Disability</span>
                        <Badge className="bg-red-100 text-red-800">Poor</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-red-100">
                        <span>71-100: Extreme Disability</span>
                        <Badge className="bg-red-200 text-red-900">Very Poor</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Your Results</h3>
                    <div className={`p-4 rounded-lg ${interpretation.bgColor} border`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl font-bold">{dashScore.toFixed(1)}</div>
                        <div>
                          <div className={`font-semibold ${interpretation.color}`}>
                            {interpretation.level} Disability
                          </div>
                          <div className="text-sm text-gray-600">
                            {interpretation.description}
                          </div>
                        </div>
                      </div>
                      <Progress value={dashScore} className="h-2 mb-2" />
                      <p className="text-sm text-gray-700">
                        This score indicates your current level of disability related to arm, shoulder, and hand function.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">About the DASH Assessment</h3>
                  <div className="prose text-sm text-gray-600 max-w-none">
                    <p>
                      The Disabilities of the Arm, Shoulder and Hand (DASH) questionnaire is a standardized assessment 
                      that measures physical function and symptoms in people with upper limb conditions. Lower scores 
                      indicate better function and fewer symptoms.
                    </p>
                    <p className="mt-3">
                      The DASH score is calculated from your responses to 30 questions about daily activities and symptoms. 
                      Each question is scored from 1 (no difficulty) to 5 (unable to perform), and the final score is 
                      converted to a 0-100 scale.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}