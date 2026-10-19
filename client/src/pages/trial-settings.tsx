import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTrialStatus } from "@/hooks/use-trial-status";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2, Clock, Lock, ArrowRight, Zap, Brain, BarChart3, Database, FileCheck, Network } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

const TIER_FEATURES = {
  professional: [
    { icon: BarChart3, label: "Advanced Reporting & Analytics" },
    { icon: FileCheck, label: "Quote Analytics Dashboard" },
    { icon: Database, label: "SQL Assistant (unlimited queries)" },
    { icon: Zap, label: "10 team members" },
    { icon: CheckCircle2, label: "100 active projects" },
  ],
  enterprise: [
    { icon: Brain, label: "AI-Powered Chat Assistant" },
    { icon: Sparkles, label: "Computer Vision Analysis" },
    { icon: FileCheck, label: "Document Intelligence" },
    { icon: Network, label: "CRM Integrations (HubSpot, Salesforce)" },
    { icon: Zap, label: "Unlimited team members" },
    { icon: CheckCircle2, label: "Unlimited projects" },
  ],
};

const TIER_INFO = {
  professional: {
    name: "Professional",
    duration: "14 days",
    color: "primary",
    description: "Perfect for growing teams that need advanced reporting and analytics",
  },
  enterprise: {
    name: "Enterprise",
    duration: "7 days",
    color: "primary",
    description: "Full-featured plan with AI capabilities and CRM integrations",
  },
};

export default function TrialSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: trialStatus, isLoading, isError, refetch } = useTrialStatus();

  const activateTrialMutation = useMutation({
    mutationFn: async (tier: "professional" | "enterprise") => {
      const res = await apiRequest("POST", "/api/trial/activate", { tier });
      return await res.json();
    },
    onSuccess: (data, tier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trial/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/usage"] });
      toast({
        title: "Trial activated!",
        description: `Your ${TIER_INFO[tier].name} trial has started. Explore all premium features now.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to activate trial",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  const canActivateTrial = user?.role === "owner" || user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading trial information...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6 max-w-3xl" role="alert" data-testid="trial-settings-error">
        <Card>
          <CardHeader>
            <CardTitle>Trial information unavailable</CardTitle>
            <CardDescription>We couldn’t load your trial status or eligibility. Please retry before making changes.</CardDescription>
          </CardHeader>
          <CardContent><Button onClick={() => refetch()}>Retry</Button></CardContent>
        </Card>
      </div>
    );
  }

  const isTrialActive = trialStatus?.isActive;
  const isInGracePeriod = trialStatus?.isInGracePeriod;
  const currentTier = trialStatus?.tier;
  const canActivateProfessional = trialStatus?.availableTiers?.includes("professional");
  const canActivateEnterprise = trialStatus?.availableTiers?.includes("enterprise");

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-trial-settings-title">Trial Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Test premium features before upgrading your subscription
          </p>
        </div>
      </div>

      {/* Current Trial Status */}
      {(isTrialActive || isInGracePeriod) && (
        <Card className="mb-4 sm:mb-6 border-primary/50 bg-primary/5">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2 min-w-0">
              {isTrialActive && <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />}
              {isInGracePeriod && <Lock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-destructive" />}
              <CardTitle className="text-base sm:text-lg" data-testid="text-trial-status-title">
                {isTrialActive && "Active Trial"}
                {isInGracePeriod && "Grace Period"}
              </CardTitle>
            </div>
            <CardDescription data-testid="text-trial-status-description">
              {isTrialActive && `${TIER_INFO[currentTier as keyof typeof TIER_INFO]?.name || currentTier} plan trial`}
              {isInGracePeriod && "Your trial has expired"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {isTrialActive && trialStatus.endsAt && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-medium">Time remaining</span>
                  <Badge variant="default" className="shrink-0" data-testid="badge-trial-days-remaining">
                    {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"} left
                  </Badge>
                </div>
                <Progress 
                  value={
                    trialStatus.totalDays 
                      ? ((trialStatus.daysRemaining || 0) / trialStatus.totalDays) * 100 
                      : 0
                  } 
                  className="h-2"
                  data-testid="progress-trial-time"
                />
                <p className="text-xs text-muted-foreground" data-testid="text-trial-expires">
                  Expires {trialStatus.endsAt && formatDistanceToNow(new Date(trialStatus.endsAt), { addSuffix: true })}
                </p>
              </div>
            )}
            {isInGracePeriod && trialStatus.gracePeriodEndsAt && (
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  You have limited access to premium features. Upgrade now to continue using all features.
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-destructive" />
                  <span className="text-xs sm:text-sm font-medium" data-testid="text-grace-period-ends">
                    Grace period ends {trialStatus.gracePeriodEndsAt && formatDistanceToNow(new Date(trialStatus.gracePeriodEndsAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Warning */}
      {!canActivateTrial && (
        <Card className="mb-4 sm:mb-6 border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-yellow-600 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-xs sm:text-sm" data-testid="text-permission-required">Permission Required</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1" data-testid="text-permission-message">
                  Only organization owners and admins can activate trials. Contact your administrator to start a trial.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Trials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Professional Trial */}
        <Card 
          className={`relative overflow-hidden ${
            currentTier === "professional" && isTrialActive ? "border-primary" : ""
          }`}
          data-testid="card-professional-trial"
        >
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
                <CardTitle className="text-base sm:text-lg">Professional</CardTitle>
              </div>
              {currentTier === "professional" && isTrialActive && (
                <Badge variant="default" className="shrink-0" data-testid="badge-active-trial">Active</Badge>
              )}
              {!canActivateProfessional && !isTrialActive && (
                <Badge variant="outline" className="shrink-0" data-testid="badge-trial-used">Already Used</Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {TIER_INFO.professional.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{TIER_INFO.professional.duration} free trial</span>
            </div>

            <Separator />

            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-medium">What's included:</p>
              <div className="space-y-1.5 sm:space-y-2">
                {TIER_FEATURES.professional.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm">
                    <feature.icon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full text-xs sm:text-sm"
              size="sm"
              disabled={
                !canActivateTrial || 
                !canActivateProfessional || 
                activateTrialMutation.isPending ||
                (currentTier === "professional" && isTrialActive)
              }
              onClick={() => activateTrialMutation.mutate("professional")}
              data-testid="button-activate-professional-trial"
            >
              {activateTrialMutation.isPending ? (
                <>
                  <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Activating...
                </>
              ) : currentTier === "professional" && isTrialActive ? (
                "Trial Active"
              ) : !canActivateProfessional ? (
                "Trial Already Used"
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise Trial */}
        <Card 
          className={`relative overflow-hidden ${
            currentTier === "enterprise" && isTrialActive ? "border-primary" : ""
          }`}
          data-testid="card-enterprise-trial"
        >
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
                <CardTitle className="text-base sm:text-lg">Enterprise</CardTitle>
              </div>
              {currentTier === "enterprise" && isTrialActive && (
                <Badge variant="default" className="shrink-0" data-testid="badge-active-trial">Active</Badge>
              )}
              {!canActivateEnterprise && !isTrialActive && (
                <Badge variant="outline" className="shrink-0" data-testid="badge-trial-used">Already Used</Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {TIER_INFO.enterprise.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{TIER_INFO.enterprise.duration} free trial</span>
            </div>

            <Separator />

            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-medium">What's included:</p>
              <div className="space-y-1.5 sm:space-y-2">
                {TIER_FEATURES.enterprise.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm">
                    <feature.icon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full text-xs sm:text-sm"
              size="sm"
              disabled={
                !canActivateTrial || 
                !canActivateEnterprise || 
                activateTrialMutation.isPending ||
                (currentTier === "enterprise" && isTrialActive)
              }
              onClick={() => activateTrialMutation.mutate("enterprise")}
              data-testid="button-activate-enterprise-trial"
            >
              {activateTrialMutation.isPending ? (
                <>
                  <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Activating...
                </>
              ) : currentTier === "enterprise" && isTrialActive ? (
                "Trial Active"
              ) : !canActivateEnterprise ? (
                "Trial Already Used"
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">How Trials Work</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="space-y-1 sm:space-y-2">
              <p className="font-medium">✓ Per-Tier Trials</p>
              <p className="text-muted-foreground">
                You can trial both Professional and Enterprise plans once each
              </p>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="font-medium">✓ Full Feature Access</p>
              <p className="text-muted-foreground">
                Get complete access to all premium features during your trial
              </p>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="font-medium">✓ No Credit Card Required</p>
              <p className="text-muted-foreground">
                Start your trial immediately without payment details
              </p>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="font-medium">✓ Grace Period</p>
              <p className="text-muted-foreground">
                Get extra time to upgrade after your trial ends
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
