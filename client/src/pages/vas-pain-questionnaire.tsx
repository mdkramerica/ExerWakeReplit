import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertTriangle } from 'lucide-react';

const vasSchema = z.object({
  vasScore: z.number().min(0).max(10),
});

type VASData = z.infer<typeof vasSchema>;

interface VASPainQuestionnaireProps {
  onSubmit: (score: number) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export default function VASPainQuestionnaire({ onSubmit, onSkip, isLoading }: VASPainQuestionnaireProps) {
  const form = useForm<VASData>({
    resolver: zodResolver(vasSchema),
    defaultValues: {
      vasScore: 0,
    },
  });

  const watchedScore = form.watch('vasScore');

  const handleSubmit = (data: VASData) => {
    onSubmit(data.vasScore);
  };

  const getPainDescription = (score: number) => {
    if (score === 0) return "No pain";
    if (score <= 2) return "Mild pain";
    if (score <= 4) return "Moderate pain";
    if (score <= 6) return "Severe pain";
    if (score <= 8) return "Very severe pain";
    return "Worst possible pain";
  };

  const getPainColor = (score: number) => {
    if (score <= 2) return "text-green-600";
    if (score <= 4) return "text-yellow-600";
    if (score <= 6) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Pain Assessment</span>
        </CardTitle>
        <CardDescription>
          Please rate your current pain level on a scale from 0 to 10
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="vasScore"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel>Pain Level</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0 - No pain</span>
                        <span>10 - Worst pain</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Current Selection Display */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold mb-2">{watchedScore}</div>
              <div className={`text-lg font-medium ${getPainColor(watchedScore)}`}>
                {getPainDescription(watchedScore)}
              </div>
            </div>

            {/* VAS Scale Visual */}
            <div className="space-y-2">
              <Label>Visual Pain Scale</Label>
              <div className="flex items-center space-x-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <div
                    key={num}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                      watchedScore === num
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => form.setValue('vasScore', num)}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Saving...' : 'Save Pain Score'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}