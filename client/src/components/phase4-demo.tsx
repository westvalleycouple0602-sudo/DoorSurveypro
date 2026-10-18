/**
 * Phase 4 Demo: User Feedback & Analytics Integration
 * 
 * Interactive demonstration of feedback collection components,
 * analytics tracking, and contextual trigger systems
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  MessageSquare, 
  Star, 
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  Bug,
  ThumbsUp
} from "lucide-react";
import { NPSWidget } from "@/components/ui/nps-widget";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFeedbackTrigger } from "@/hooks/use-feedback-trigger";

export function Phase4Demo() {
  const { toast } = useToast();
  const [showNPS, setShowNPS] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"general" | "feature" | "bug" | "praise" | "concern">("general");
  
  const feedbackTrigger = useFeedbackTrigger({
    afterActions: ["project_created", "quote_generated"],
    minTimeBetweenTriggers: 0, // For demo purposes
  });

  const handleNPSSubmit = async (score: number, feedback?: string, category?: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Thank you for your feedback!",
      description: `You rated us ${score}/10${category ? ` (${category})` : ""}. We appreciate your input.`,
      variant: "success",
    });
    
    setShowNPS(false);
  };

  const handleFeedbackSubmit = async (data: any) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Feedback Submitted",
      description: "Your feedback has been recorded. We'll review it shortly.",
      variant: "success",
    });
  };

  const simulateTrigger = (action: string) => {
    feedbackTrigger.triggerAfterAction(action);
    toast({
      title: "Trigger Activated",
      description: `Simulated "${action}" action. Feedback prompt would appear for new users.`,
      variant: "info",
    });
  };

  return (
    <div className="space-y-6" data-testid="phase4-demo">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Phase 4: User Feedback & Analytics Integration</h2>
        </div>
        <p className="text-muted-foreground">
          Comprehensive feedback collection system with NPS surveys, contextual prompts, and analytics tracking
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="nps" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="phase4-tabs">
          <TabsTrigger value="nps" data-testid="tab-nps">
            <Star className="h-4 w-4 mr-2" />
            NPS Survey
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="triggers" data-testid="tab-triggers">
            <TrendingUp className="h-4 w-4 mr-2" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* NPS Survey Tab */}
        <TabsContent value="nps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Net Promoter Score (NPS) Widget
              </CardTitle>
              <CardDescription>
                Measure customer satisfaction and loyalty with industry-standard NPS methodology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Features:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>0-10 rating scale with color-coded scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Automatic categorization (Detractor/Passive/Promoter)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Contextual follow-up questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Optional detailed feedback collection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Accessible ARIA attributes and keyboard support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Animated transitions and visual feedback</span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Try it out:</h4>
                <Button 
                  onClick={() => setShowNPS(true)}
                  data-testid="button-show-nps"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Show NPS Widget
                </Button>
              </div>

              {showNPS && (
                <div className="flex justify-center">
                  <NPSWidget
                    onSubmit={handleNPSSubmit}
                    onClose={() => setShowNPS(false)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Dialog Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Structured Feedback Collection
              </CardTitle>
              <CardDescription>
                Multi-category feedback system with form validation and context capture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Feedback Categories:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setSelectedCategory("general");
                      setFeedbackDialogOpen(true);
                    }}
                    data-testid="button-feedback-general"
                  >
                    <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                    General Feedback
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setSelectedCategory("feature");
                      setFeedbackDialogOpen(true);
                    }}
                    data-testid="button-feedback-feature"
                  >
                    <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                    Feature Request
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setSelectedCategory("bug");
                      setFeedbackDialogOpen(true);
                    }}
                    data-testid="button-feedback-bug"
                  >
                    <Bug className="h-4 w-4 mr-2 text-destructive" />
                    Report a Bug
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setSelectedCategory("praise");
                      setFeedbackDialogOpen(true);
                    }}
                    data-testid="button-feedback-praise"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2 text-emerald-500" />
                    Share Praise
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Features:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>5 specialized feedback categories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Form validation with Zod schema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Automatic context capture (URL, user agent)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Optional email for follow-up</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <FeedbackDialog
            open={feedbackDialogOpen}
            onOpenChange={setFeedbackDialogOpen}
            onSubmit={handleFeedbackSubmit}
            defaultCategory={selectedCategory}
            captureContext={true}
          />
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Contextual Feedback Triggers
              </CardTitle>
              <CardDescription>
                Smart triggering system that prompts users at optimal moments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Trigger Types:</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Action-Based Triggers</span>
                      <Badge>Event-Driven</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Prompt users after completing key actions (e.g., creating a project, generating a quote)
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => simulateTrigger("project_created")}
                      data-testid="button-trigger-action"
                    >
                      Simulate Project Created
                    </Button>
                  </div>

                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Time-Based Triggers</span>
                      <Badge variant="secondary">Duration</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show feedback prompt after user spends significant time on a page (configurable threshold)
                    </p>
                  </div>

                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Page View Triggers</span>
                      <Badge variant="secondary">Count-Based</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Trigger after a specific number of page views to gauge overall experience
                    </p>
                  </div>

                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Route-Specific Triggers</span>
                      <Badge variant="secondary">Location</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show feedback prompts on specific routes or features for targeted insights
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Smart Throttling:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Minimum 7-day cooldown between feedback requests (configurable)</li>
                  <li>• Local storage tracking to prevent survey fatigue</li>
                  <li>• User-dismissible with automatic cooldown activation</li>
                  <li>• Context-aware prompts based on user journey</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Analytics Integration
              </CardTitle>
              <CardDescription>
                Comprehensive tracking of user feedback and satisfaction metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Tracked Metrics:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">NPS Score</div>
                    <p className="text-sm text-muted-foreground">
                      Net Promoter Score calculation with Detractor/Passive/Promoter breakdown
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">Feedback Categories</div>
                    <p className="text-sm text-muted-foreground">
                      Distribution of feedback types (feature requests, bugs, praise, etc.)
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">Response Rate</div>
                    <p className="text-sm text-muted-foreground">
                      Percentage of users who respond to feedback prompts
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium mb-1">Sentiment Analysis</div>
                    <p className="text-sm text-muted-foreground">
                      Positive/negative/neutral sentiment from feedback text
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Integration Points:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">PostHog Analytics:</span>
                      <span className="text-muted-foreground ml-1">
                        Event tracking for all feedback submissions with user properties
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Backend Analytics Service:</span>
                      <span className="text-muted-foreground ml-1">
                        Server-side event storage with funnel and journey tracking
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Sentry Integration:</span>
                      <span className="text-muted-foreground ml-1">
                        Automatic error correlation with user feedback
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Custom Dashboards:</span>
                      <span className="text-muted-foreground ml-1">
                        Admin-only analytics views for feedback trends and insights
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
