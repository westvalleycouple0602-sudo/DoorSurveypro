import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import type { Div28SurveyAnswers, Div28OpportunitySummary } from "@shared/types/div28";

interface ScoreResponse {
  success: boolean;
  result: Div28OpportunitySummary;
  proposalText?: string;
  error?: string;
}

interface BatchScoreRequest {
  surveys: Div28SurveyAnswers[];
}

interface BatchScoreResponse {
  success: boolean;
  results: ScoreResponse[];
}

export function useDiv28Score() {
  return useMutation({
    mutationFn: async (surveyAnswers: Div28SurveyAnswers): Promise<ScoreResponse> => {
      const res = await apiRequest("POST", "/api/div28/score", surveyAnswers);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Scoring failed" }));
        throw new Error(error.message || "Failed to calculate Div28 score");
      }
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Scoring failed",
        description: error.message || "Unable to calculate Div28 score. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDiv28BatchScore() {
  return useMutation({
    mutationFn: async (surveys: Div28SurveyAnswers[]): Promise<BatchScoreResponse> => {
      const res = await apiRequest("POST", "/api/div28/score/batch", { surveys });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Batch scoring failed" }));
        throw new Error(error.message || "Failed to calculate batch Div28 scores");
      }
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Batch scoring failed",
        description: error.message || "Unable to calculate batch Div28 scores. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDiv28Recommendations(openingId: string) {
  return useQuery<Div28OpportunitySummary>({
    queryKey: ["/api/div28/recommendations", openingId],
    enabled: !!openingId,
  });
}

export function useDiv28ProposalText() {
  return useMutation({
    mutationFn: async (result: Div28OpportunitySummary): Promise<{ proposalText: string }> => {
      const res = await apiRequest("POST", "/api/div28/proposal-text", result);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Proposal generation failed" }));
        throw new Error(error.message || "Failed to generate proposal text");
      }
      return res.json();
    },
  });
}

export function formatOpportunityTier(tier: string): string {
  const tierLabels: Record<string, string> = {
    MINIMAL: "Minimal",
    LOW: "Low",
    MODERATE: "Moderate", 
    HIGH: "High",
    PREMIUM: "Premium",
  };
  return tierLabels[tier] || tier;
}

export function getTierColor(tier: string): string {
  const tierColors: Record<string, string> = {
    MINIMAL: "text-muted-foreground",
    LOW: "text-blue-600 dark:text-blue-400",
    MODERATE: "text-yellow-600 dark:text-yellow-400",
    HIGH: "text-orange-600 dark:text-orange-400",
    PREMIUM: "text-green-600 dark:text-green-400",
  };
  return tierColors[tier] || "text-foreground";
}

export function getTierBadgeVariant(tier: string): "default" | "secondary" | "destructive" | "outline" {
  if (tier === "PREMIUM" || tier === "HIGH") return "default";
  if (tier === "MODERATE") return "secondary";
  return "outline";
}
