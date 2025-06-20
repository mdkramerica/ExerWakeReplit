import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileText, ArrowRight } from 'lucide-react';

const quickDashSchema = z.object({
  q1_difficulty_opening_jar: z.number().min(1).max(5),
  q2_difficulty_writing: z.number().min(1).max(5),
  q3_difficulty_turning_key: z.number().min(1).max(5),
  q4_difficulty_preparing_meal: z.number().min(1).max(5),
  q5_difficulty_pushing_door: z.number().min(1).max(5),
  q6_difficulty_placing_object: z.number().min(1).max(5),
  q7_arm_shoulder_hand_pain: z.number().min(1).max(5),
  q8_arm_shoulder_hand_pain_activity: z.number().min(1).max(5),
  q9_tingling_arm_shoulder_hand: z.number().min(1).max(5),
  q10_weakness_arm_shoulder_hand: z.number().min(1).max(5),
  q11_stiffness_arm_shoulder_hand: z.number().min(1).max(5),
});

type QuickDashData = z.infer<typeof quickDashSchema>;

interface QuickDashQuestionnaireProps {
  onSubmit: (responses: QuickDashData) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const questions = [
  {
    id: 'q1_difficulty_opening_jar',
    text: 'Open a tight or new jar',
    category: 'Physical Function'
  },
  {
    id: 'q2_difficulty_writing',
    text: 'Write',
    category: 'Physical Function'
  },
  {
    id: 'q3_difficulty_turning_key',
    text: 'Turn a key',
    category: 'Physical Function'
  },
  {
    id: 'q4_difficulty_preparing_meal',
    text: 'Prepare a meal',
    category: 'Physical Function'
  },
  {
    id: 'q5_difficulty_pushing_door',
    text: 'Push open a heavy door',
    category: 'Physical Function'
  },
  {
    id: 'q6_difficulty_placing_object',
    text: 'Place an object on a shelf above your head',
    category: 'Physical Function'
  },
  {
    id: 'q7_arm_shoulder_hand_pain',
    text: 'Arm, shoulder or hand pain',
    category: 'Symptoms'
  },
  {
    id: 'q8_arm_shoulder_hand_pain_activity',
    text: 'Arm, shoulder or hand pain when performing any specific activity',
    category: 'Symptoms'
  },
  {
    id: 'q9_tingling_arm_shoulder_hand',
    text: 'Tingling (pins and needles) in your arm, shoulder or hand',
    category: 'Symptoms'
  },
  {
    id: 'q10_weakness_arm_shoulder_hand',
    text: 'Weakness in your arm, shoulder or hand',
    category: 'Symptoms'
  },
  {
    id: 'q11_stiffness_arm_shoulder_hand',
    text: 'Stiffness in your arm, shoulder or hand',
    category: 'Symptoms'
  },
];

const responseOptions = [
  { value: 1, label: 'No difficulty / None' },
  { value: 2, label: 'Mild difficulty / Mild' },
  { value: 3, label: 'Moderate difficulty / Moderate' },
  { value: 4, label: 'Severe difficulty / Severe' },
  { value: 5, label: 'Unable / Extreme' },
];

export default function QuickDashQuestionnaire({ onSubmit, onSkip, isLoading }: QuickDashQuestionnaireProps) {
  const form = useForm<QuickDashData>({
    resolver: zodResolver(quickDashSchema),
  });

  const handleSubmit = (data: QuickDashData) => {
    onSubmit(data);
  };

  const calculateScore = () => {
    const values = form.getValues();
    const scores = Object.values(values).filter(v => typeof v === 'number');
    if (scores.length === 0) return 0;
    
    const sum = scores.reduce((acc, score) => acc + score, 0);
    const avgScore = sum / scores.length;
    return ((avgScore - 1) / 4) * 100; // Convert to 0-100 scale
  };

  const currentScore = calculateScore();

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>QuickDASH Questionnaire</span>
        </CardTitle>
        <CardDescription>
          Please rate your ability to do the following activities in the last week. (11 questions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            
            {/* Score Display */}
            {currentScore > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Current QuickDASH Score</div>
                <div className="text-2xl font-bold">{currentScore.toFixed(1)}/100</div>
                <div className="text-sm text-muted-foreground">
                  {currentScore <= 25 ? 'Minimal disability' : 
                   currentScore <= 50 ? 'Mild disability' :
                   currentScore <= 75 ? 'Moderate disability' : 'Severe disability'}
                </div>
              </div>
            )}

            {/* Questions */}
            <div className="space-y-6">
              {questions.map((question, index) => (
                <FormField
                  key={question.id}
                  control={form.control}
                  name={question.id as keyof QuickDashData}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <div>{question.text}</div>
                            <div className="text-sm text-muted-foreground font-normal mt-1">
                              {question.category}
                            </div>
                          </div>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                          className="grid grid-cols-1 md:grid-cols-5 gap-2 ml-11"
                        >
                          {responseOptions.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value.toString()} 
                                id={`${question.id}-${option.value}`}
                              />
                              <Label 
                                htmlFor={`${question.id}-${option.value}`}
                                className="text-sm leading-tight cursor-pointer"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6 border-t">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <span>{isLoading ? 'Saving...' : 'Save QuickDASH Responses'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip Questionnaire
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}