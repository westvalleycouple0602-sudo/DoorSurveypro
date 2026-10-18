/**
 * NPS (Net Promoter Score) Widget
 * 
 * Collects user satisfaction ratings on a 0-10 scale
 * with follow-up feedback collection
 */

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface NPSWidgetProps {
  onSubmit: (score: number, feedback?: string, category?: string) => void | Promise<void>;
  onClose?: () => void;
  question?: string;
  className?: string;
}

export function NPSWidget({ 
  onSubmit, 
  onClose, 
  question = "How likely are you to recommend DoorSurvey Pro to a colleague?",
  className 
}: NPSWidgetProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
    setShowFeedback(true);
    
    // Automatically categorize based on NPS methodology
    if (score <= 6) {
      setCategory("detractor");
    } else if (score <= 8) {
      setCategory("passive");
    } else {
      setCategory("promoter");
    }
  };

  const handleSubmit = async () => {
    if (selectedScore === null) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(selectedScore, feedback || undefined, category || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 6) return "bg-destructive hover-elevate";
    if (score <= 8) return "bg-yellow-500 hover-elevate dark:bg-yellow-600";
    return "bg-emerald-500 hover-elevate dark:bg-emerald-600";
  };

  const getFeedbackPrompt = () => {
    if (selectedScore === null) return "";
    if (selectedScore <= 6) return "We're sorry to hear that. What can we improve?";
    if (selectedScore <= 8) return "Thanks for your feedback! What would make it a 10?";
    return "That's great! What do you love most about DoorSurvey Pro?";
  };

  return (
    <Card 
      className={cn("w-full max-w-md", className)} 
      data-testid="nps-widget"
      role="dialog"
      aria-label="Satisfaction survey"
    >
      <CardHeader className="relative">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
            data-testid="button-close-nps"
            aria-label="Close survey"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <CardTitle className="text-lg">We'd love your feedback</CardTitle>
        <CardDescription>{question}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Selection */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
          <div 
            className="grid grid-cols-11 gap-1"
            role="radiogroup"
            aria-label="Rating scale from 0 to 10"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <Button
                key={i}
                variant={selectedScore === i ? "default" : "outline"}
                size="sm"
                onClick={() => handleScoreSelect(i)}
                className={cn(
                  "aspect-square p-0 text-xs font-semibold",
                  selectedScore === i && getScoreColor(i)
                )}
                data-testid={`nps-score-${i}`}
                role="radio"
                aria-checked={selectedScore === i}
                aria-label={`Rate ${i} out of 10`}
              >
                {i}
              </Button>
            ))}
          </div>
        </div>

        {/* Feedback Textarea */}
        {showFeedback && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="nps-feedback">{getFeedbackPrompt()}</Label>
            <Textarea
              id="nps-feedback"
              data-testid="textarea-nps-feedback"
              placeholder="Your feedback helps us improve..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="button-cancel-nps"
          >
            Maybe Later
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={selectedScore === null || isSubmitting}
          className="ml-auto"
          data-testid="button-submit-nps"
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}
