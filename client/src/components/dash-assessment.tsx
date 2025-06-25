import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DASH_QUESTIONS = [
  {
    id: 1,
    question: "Open a tight or new jar",
    category: "Physical Function"
  },
  {
    id: 2,
    question: "Write",
    category: "Physical Function"
  },
  {
    id: 3,
    question: "Turn a key",
    category: "Physical Function"
  },
  {
    id: 4,
    question: "Prepare a meal",
    category: "Physical Function"
  },
  {
    id: 5,
    question: "Push open a heavy door",
    category: "Physical Function"
  },
  {
    id: 6,
    question: "Place an object on a shelf above your head",
    category: "Physical Function"
  },
  {
    id: 7,
    question: "Do heavy household chores (e.g., wash walls, wash floors)",
    category: "Physical Function"
  },
  {
    id: 8,
    question: "Garden or do yard work",
    category: "Physical Function"
  },
  {
    id: 9,
    question: "Make a bed",
    category: "Physical Function"
  },
  {
    id: 10,
    question: "Carry a shopping bag or briefcase",
    category: "Physical Function"
  },
  {
    id: 11,
    question: "Carry a heavy object (over 10 lbs)",
    category: "Physical Function"
  },
  {
    id: 12,
    question: "Change a lightbulb overhead",
    category: "Physical Function"
  },
  {
    id: 13,
    question: "Wash or blow dry your hair",
    category: "Physical Function"
  },
  {
    id: 14,
    question: "Wash your back",
    category: "Physical Function"
  },
  {
    id: 15,
    question: "Put on a pullover sweater",
    category: "Physical Function"
  },
  {
    id: 16,
    question: "Use a knife to cut food",
    category: "Physical Function"
  },
  {
    id: 17,
    question: "Recreational activities which require little effort (e.g., cardplaying, knitting, etc.)",
    category: "Physical Function"
  },
  {
    id: 18,
    question: "Recreational activities in which you take some force or impact through your arm, shoulder or hand (e.g., golf, hammering, tennis, etc.)",
    category: "Physical Function"
  },
  {
    id: 19,
    question: "Recreational activities in which you move your arm freely (e.g., playing frisbee, badminton, etc.)",
    category: "Physical Function"
  },
  {
    id: 20,
    question: "Manage transportation needs (getting from one place to another)",
    category: "Physical Function"
  },
  {
    id: 21,
    question: "Sexual activities",
    category: "Physical Function"
  },
  {
    id: 22,
    question: "During the past week, to what extent has your arm, shoulder or hand problem interfered with your normal social activities with family, friends, neighbors or groups?",
    category: "Social Function"
  },
  {
    id: 23,
    question: "During the past week, were you limited in your work or other regular daily activities as a result of your arm, shoulder or hand problem?",
    category: "Role Function"
  },
  {
    id: 24,
    question: "Arm, shoulder or hand pain",
    category: "Symptoms"
  },
  {
    id: 25,
    question: "Arm, shoulder or hand pain when you performed any specific activity",
    category: "Symptoms"
  },
  {
    id: 26,
    question: "Tingling (pins and needles) in your arm, shoulder or hand",
    category: "Symptoms"
  },
  {
    id: 27,
    question: "Weakness in your arm, shoulder or hand",
    category: "Symptoms"
  },
  {
    id: 28,
    question: "Stiffness in your arm, shoulder or hand",
    category: "Symptoms"
  },
  {
    id: 29,
    question: "During the past week, how much difficulty have you had sleeping as a result of the pain in your arm, shoulder or hand?",
    category: "Symptoms"
  },
  {
    id: 30,
    question: "I feel less capable, less confident or less useful because of my arm, shoulder or hand problem",
    category: "Social Function"
  }
];

const RESPONSE_OPTIONS = [
  { value: 1, label: "No difficulty", description: "Not limited at all" },
  { value: 2, label: "Mild difficulty", description: "Slightly limited" },
  { value: 3, label: "Moderate difficulty", description: "Moderately limited" },
  { value: 4, label: "Severe difficulty", description: "Very limited" },
  { value: 5, label: "Unable", description: "Cannot perform" }
];

interface DashAssessmentProps {
  onComplete: (responses: Record<number, number>, dashScore: number) => void;
  onCancel: () => void;
}

export default function DashAssessment({ onComplete, onCancel }: DashAssessmentProps) {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const { toast } = useToast();

  const handleResponseChange = (questionId: number, value: number) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateDashScore = (responses: Record<number, number>) => {
    const validResponses = Object.values(responses).filter(value => value > 0);
    if (validResponses.length < 27) { // Need at least 27 of 30 questions answered
      return null;
    }
    
    const sum = validResponses.reduce((acc, value) => acc + value, 0);
    const average = sum / validResponses.length;
    const dashScore = ((average - 1) / 4) * 100;
    return Math.round(dashScore * 10) / 10; // Round to 1 decimal place
  };

  const handleNext = () => {
    if (!responses[currentQuestion]) {
      toast({
        title: "Response Required",
        description: "Please select a response before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestion < 30) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleComplete = () => {
    const answeredQuestions = Object.keys(responses).length;
    if (answeredQuestions < 27) {
      toast({
        title: "Incomplete Assessment",
        description: `Please answer at least 27 questions. You have answered ${answeredQuestions}/30.`,
        variant: "destructive"
      });
      return;
    }

    const dashScore = calculateDashScore(responses);
    if (dashScore !== null) {
      onComplete(responses, dashScore);
    }
  };

  const progress = (Object.keys(responses).length / 30) * 100;
  const currentQ = DASH_QUESTIONS[currentQuestion - 1];
  const answeredQuestions = Object.keys(responses).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            DASH Assessment - Question {currentQuestion} of 30
          </CardTitle>
          <CardDescription>
            Disabilities of the Arm, Shoulder and Hand questionnaire
          </CardDescription>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress: {answeredQuestions}/30 questions completed</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">
              {currentQ.category}
            </div>
            <div className="text-lg font-medium text-gray-900">
              {currentQ.id <= 21 ? (
                <>Please rate your ability to do the following activity in the past week:<br />
                <span className="font-semibold">{currentQ.question}</span></>
              ) : (
                <span className="font-semibold">{currentQ.question}</span>
              )}
            </div>
          </div>

          <RadioGroup
            value={responses[currentQuestion]?.toString() || ""}
            onValueChange={(value) => handleResponseChange(currentQuestion, parseInt(value))}
            className="space-y-3"
          >
            {RESPONSE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                <RadioGroupItem value={option.value.toString()} id={`option-${option.value}`} />
                <Label htmlFor={`option-${option.value}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
              >
                Cancel Assessment
              </Button>
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 1}
              >
                Previous
              </Button>
            </div>

            <div className="flex gap-2">
              {currentQuestion < 30 && (
                <Button onClick={handleNext}>
                  Next Question
                </Button>
              )}
              {currentQuestion === 30 && (
                <Button 
                  onClick={handleComplete}
                  disabled={answeredQuestions < 27}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Assessment
                </Button>
              )}
            </div>
          </div>

          {answeredQuestions >= 27 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-green-800 text-sm">
                <CheckCircle2 className="h-4 w-4 inline mr-2" />
                You have answered enough questions to complete the assessment.
                {answeredQuestions < 30 && " You can continue answering or complete now."}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}