import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Lightbulb, CheckCircle2, TrendingUp, Brain } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

export default function HardwareRecommendationsPage() {
  const { toast } = useToast();
  const [buildingType, setBuildingType] = useState<string>("office");
  const [trafficLevel, setTrafficLevel] = useState<string>("medium");
  const [fireRating, setFireRating] = useState<string>("90min");
  const [adaRequired, setAdaRequired] = useState<string>("yes");
  const [securityLevel, setSecurityLevel] = useState<string>("standard");
  const [category, setCategory] = useState<string>("all");

  const generateMutation = useMutation({
    mutationFn: async (params: any) => {
      const res = await apiRequest("POST", "/api/recommendations/generate", params);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate recommendations");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/logs"] });
      toast({
        title: "AI Recommendations Generated",
        description: "Hardware recommendations successfully generated based on your requirements",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to generate recommendations",
        description: errorMessage.includes("AI service")
          ? "AI recommendation engine is temporarily unavailable. Please try again in a few moments"
          : errorMessage.includes("Invalid")
          ? "Invalid project requirements. Please check your selections and try again"
          : errorMessage || "Unable to generate AI recommendations. Please try again",
        variant: "destructive",
      });
    },
  });

  const { 
    data: logs,
    isLoading: logsLoading,
    isError: logsError,
    error: logsErrorObj,
    refetch: refetchLogs
  } = useQuery<any[]>({
    queryKey: ["/api/recommendations/logs"],
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      buildingType,
      trafficLevel,
      fireRating,
      adaRequired,
      securityLevel,
      category,
    });
  };

  const latestRecommendation = generateMutation.data;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <Brain className="h-6 sm:h-8 w-6 sm:w-8" />
            AI Hardware Recommendations
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Intelligent hardware selection powered by machine learning
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Input Parameters */}
        <Card data-testid="card-input-parameters">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Project Requirements
            </CardTitle>
            <CardDescription>
              Specify your project requirements for AI-powered recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="building-type" className="text-xs sm:text-sm">Building Type</Label>
              <Select value={buildingType} onValueChange={setBuildingType}>
                <SelectTrigger id="building-type" data-testid="select-building-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="traffic-level" className="text-xs sm:text-sm">Traffic Level</Label>
              <Select value={trafficLevel} onValueChange={setTrafficLevel}>
                <SelectTrigger id="traffic-level" data-testid="select-traffic-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (under 100 cycles/day)</SelectItem>
                  <SelectItem value="medium">Medium (100-500 cycles/day)</SelectItem>
                  <SelectItem value="high">High (over 500 cycles/day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fire-rating" className="text-xs sm:text-sm">Fire Rating</Label>
              <Select value={fireRating} onValueChange={setFireRating}>
                <SelectTrigger id="fire-rating" data-testid="select-fire-rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None Required</SelectItem>
                  <SelectItem value="20min">20 Minute</SelectItem>
                  <SelectItem value="45min">45 Minute</SelectItem>
                  <SelectItem value="90min">90 Minute</SelectItem>
                  <SelectItem value="3hr">3 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ada-required" className="text-xs sm:text-sm">ADA Compliance</Label>
              <Select value={adaRequired} onValueChange={setAdaRequired}>
                <SelectTrigger id="ada-required" data-testid="select-ada-required">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Required</SelectItem>
                  <SelectItem value="no">Not Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-level" className="text-xs sm:text-sm">Security Level</Label>
              <Select value={securityLevel} onValueChange={setSecurityLevel}>
                <SelectTrigger id="security-level" data-testid="select-security-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High Security</SelectItem>
                  <SelectItem value="maximum">Maximum Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs sm:text-sm">Hardware Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="locks">Locks</SelectItem>
                  <SelectItem value="closers">Closers</SelectItem>
                  <SelectItem value="hinges">Hinges</SelectItem>
                  <SelectItem value="panic-devices">Panic Devices</SelectItem>
                  <SelectItem value="access-control">Access Control</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGenerate} 
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGenerate(); }}
              disabled={generateMutation.isPending}
              className="w-full text-xs sm:text-sm"
              size="sm"
              data-testid="button-generate-recommendations"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Generate AI Recommendations
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recommendations Display */}
        <Card data-testid="card-recommendations">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              AI Recommendations
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Hardware recommendations based on your requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {latestRecommendation ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                    <div className="font-semibold text-green-900 dark:text-green-100">Top Recommendation</div>
                  </div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {latestRecommendation.topRecommendation}
                  </p>
                  {latestRecommendation.reasoning && (
                    <div className="pt-2 border-t border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                        AI Reasoning:
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {latestRecommendation.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                {latestRecommendation.alternatives && latestRecommendation.alternatives.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold text-xs sm:text-sm">Alternative Options</h4>
                    {latestRecommendation.alternatives.map((alt: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="p-2 sm:p-3 border rounded-lg hover-elevate space-y-2"
                        data-testid={`alternative-${idx}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
                          <span className="font-semibold text-sm sm:text-base">{alt.product}</span>
                          <Badge variant={
                            alt.tier === "economy" ? "secondary" : 
                            alt.tier === "premium" ? "default" : "outline"
                          }>
                            {alt.tier}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-green-700 dark:text-green-400">Pros:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-green-600 dark:text-green-500">
                              {alt.pros.map((pro: string, pIdx: number) => (
                                <li key={pIdx}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-orange-700 dark:text-orange-400">Cons:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-orange-600 dark:text-orange-500">
                              {alt.cons.map((con: string, cIdx: number) => (
                                <li key={cIdx}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Estimated Cost: </span>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            {alt.estimatedCost}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {latestRecommendation.budgetAnalysis && (
                  <div className="p-2 sm:p-3 border rounded-lg bg-muted/30 space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm">Budget Analysis</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Economy:</span>
                        <span className="font-medium">{latestRecommendation.budgetAnalysis.economyOption}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard:</span>
                        <span className="font-medium">{latestRecommendation.budgetAnalysis.standardOption}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Premium:</span>
                        <span className="font-medium">{latestRecommendation.budgetAnalysis.premiumOption}</span>
                      </div>
                    </div>
                  </div>
                )}

                {latestRecommendation.installationGuidance && latestRecommendation.installationGuidance.length > 0 && (
                  <div className="p-2 sm:p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                      Installation Guidance
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700 dark:text-blue-300">
                      {latestRecommendation.installationGuidance.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {latestRecommendation.complianceNotes && latestRecommendation.complianceNotes.length > 0 && (
                  <div className="p-2 sm:p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm text-green-900 dark:text-green-100">
                      Compliance Notes
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-green-700 dark:text-green-300">
                      {latestRecommendation.complianceNotes.map((note: string, idx: number) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configure requirements and generate recommendations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Recommendations Log */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Recent Recommendations</CardTitle>
          <CardDescription className="text-xs sm:text-sm">History of AI-generated hardware recommendations</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {logsLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground shrink-0" />
              <p className="ml-3 text-xs sm:text-sm text-muted-foreground">Loading recommendation history...</p>
            </div>
          ) : logsError ? (
            <ErrorState
              title="Failed to load recommendation history"
              message={logsErrorObj instanceof Error ? logsErrorObj.message : "Unable to fetch recent recommendations"}
              error={logsErrorObj as Error}
              onRetry={refetchLogs}
              testId="error-logs"
            />
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between gap-2 p-2 border rounded min-w-0" data-testid={`log-${log.id}`}>
                  <div className="text-xs sm:text-sm min-w-0">
                    <span className="font-medium truncate">{log.topRecommendation}</span>
                    <span className="text-muted-foreground ml-2">
                      · Score: {log.recommendationScore}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Brain}
              title="No recommendation history"
              description="Your AI-generated hardware recommendations will appear here after you generate your first set of recommendations."
              testId="empty-logs"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
