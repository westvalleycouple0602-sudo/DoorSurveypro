import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Brain, TrendingUp, BookOpen, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import type { OpeningInput, ComplianceResponse } from "@shared/schemas/compliance.schema";

export default function ComplianceValidationPage() {
  const { toast } = useToast();
  const [clearWidth, setClearWidth] = useState("36");
  const [openingForce, setOpeningForce] = useState("4");
  const [nominalWidth, setNominalWidth] = useState("36");
  const [fireRating, setFireRating] = useState("90min");
  const [hardwareFireRating, setHardwareFireRating] = useState("90min");
  const [occupancyLoad, setOccupancyLoad] = useState("25");
  const [lockType, setLockType] = useState("standard");

  const validateMutation = useMutation<
    ComplianceResponse,
    Error,
    {
      clearWidth: string;
      openingForce: string;
      nominalWidth: string;
      fireRating: string;
      hardwareFireRating: string;
      occupancyLoad: string;
      lockType: string;
    }
  >({
    mutationFn: async (specs) => {
      // Build opening payload - backend schema will coerce strings to numbers and validate enums
      const opening = {
        doorType: "hinged-single",
        width: specs.nominalWidth, // Backend coerces to number
        clearWidth: specs.clearWidth, // Backend coerces to number
        height: 84,
        fireRating: specs.fireRating, // Backend validates enum
        hardwareGrade: "Grade 1",
        closingForce: specs.openingForce, // Backend coerces to number
        isAccessible: true,
        hasAutomaticOperator: false,
        threshold: "standard",
        isExterior: false,
        occupancyLoad: specs.occupancyLoad, // Backend coerces to number
        lockType: specs.lockType, // Backend validates enum
        hardwareFireRating: specs.hardwareFireRating, // Backend validates enum
      };

      const res = await apiRequest("POST", "/api/compliance/check-with-citations", { opening });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Validation failed");
      }
      return (await res.json()) as ComplianceResponse;
    },
    onSuccess: (data) => {
      const violationCount = data.violations?.length || 0;
      toast({
        title: violationCount === 0 ? "Compliant" : "Violations Found",
        description: violationCount === 0
          ? "All specifications meet code requirements with AI-verified citations"
          : `${violationCount} violation${violationCount > 1 ? 's' : ''} detected with code references`,
        variant: violationCount === 0 ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Validation failed",
        description: errorMessage.includes("AI") || errorMessage.includes("service")
          ? "AI validation service is currently unavailable. Please try again later"
          : errorMessage.includes("spec") || errorMessage.includes("invalid")
          ? "Invalid specifications provided. Please check your inputs"
          : errorMessage || "Unable to validate specifications. Please try again",
        variant: "destructive",
      });
    },
  });

  const handleValidate = () => {
    validateMutation.mutate({
      clearWidth,
      openingForce,
      nominalWidth,
      fireRating,
      hardwareFireRating,
      occupancyLoad,
      lockType,
    });
  };

  const result = validateMutation.data;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-compliance-validation">
      {/* Feature Notice */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-500 shrink-0" />
        <AlertTitle className="text-sm sm:text-base text-blue-900 dark:text-blue-100">AI-Powered Compliance with Code Citations</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
          Our RAG-enhanced validation engine analyzes your door specifications against 26 embedded building code sections 
          (ADA, IBC, NFPA, SDI, BHMA, FGI, AAADM, NEC) and provides specific code citations with each violation or compliance confirmation. 
          Powered by vector similarity search for accurate, authoritative references.
        </AlertDescription>
      </Alert>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="heading-compliance-validation">
          <ShieldCheck className="h-6 sm:h-8 w-6 sm:w-8" />
          Building Code Compliance Validation
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Real-time validation with AI-powered code citations from IBC, ADA, NFPA, and more
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        {/* Input Specifications */}
        <Card data-testid="card-door-specs">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Door Specifications</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Enter door and hardware specifications for validation</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="clear-width" className="text-xs sm:text-sm">Clear Opening Width (inches)</Label>
              <Input 
                id="clear-width"
                type="number"
                value={clearWidth}
                onChange={(e) => setClearWidth(e.target.value)}
                className="text-sm"
                data-testid="input-clear-width"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="opening-force" className="text-xs sm:text-sm">Opening Force (lbs)</Label>
              <Input 
                id="opening-force"
                type="number"
                value={openingForce}
                onChange={(e) => setOpeningForce(e.target.value)}
                className="text-sm"
                data-testid="input-opening-force"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="nominal-width" className="text-xs sm:text-sm">Nominal Door Width (inches)</Label>
              <Input 
                id="nominal-width"
                type="number"
                value={nominalWidth}
                onChange={(e) => setNominalWidth(e.target.value)}
                className="text-sm"
                data-testid="input-nominal-width"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="fire-rating" className="text-xs sm:text-sm">Fire Rating - Door</Label>
              <Select value={fireRating} onValueChange={setFireRating}>
                <SelectTrigger id="fire-rating" className="text-sm" data-testid="select-fire-rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="20min">20 Minute</SelectItem>
                  <SelectItem value="45min">45 Minute</SelectItem>
                  <SelectItem value="90min">90 Minute</SelectItem>
                  <SelectItem value="3hr">3 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="hardware-fire-rating" className="text-xs sm:text-sm">Fire Rating - Hardware</Label>
              <Select value={hardwareFireRating} onValueChange={setHardwareFireRating}>
                <SelectTrigger id="hardware-fire-rating" className="text-sm" data-testid="select-hardware-fire-rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="20min">20 Minute</SelectItem>
                  <SelectItem value="45min">45 Minute</SelectItem>
                  <SelectItem value="90min">90 Minute</SelectItem>
                  <SelectItem value="3hr">3 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="occupancy-load" className="text-xs sm:text-sm">Occupancy Load</Label>
              <Input 
                id="occupancy-load"
                type="number"
                value={occupancyLoad}
                onChange={(e) => setOccupancyLoad(e.target.value)}
                className="text-sm"
                data-testid="input-occupancy-load"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="lock-type" className="text-xs sm:text-sm">Lock Type</Label>
              <Select value={lockType} onValueChange={setLockType}>
                <SelectTrigger id="lock-type" className="text-sm" data-testid="select-lock-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Lock</SelectItem>
                  <SelectItem value="panic">Panic Hardware</SelectItem>
                  <SelectItem value="exit">Exit Device</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleValidate} 
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleValidate(); }}
              disabled={validateMutation.isPending}
              className="w-full text-xs sm:text-sm"
              data-testid="button-validate"
            >
              {validateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Validate Compliance
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Validation Results */}
        <Card data-testid="card-validation-results">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Validation Results</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Code compliance status with AI-powered citations</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {result ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Summary Alert */}
                {result.summary && (
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                    <AlertTitle className="text-sm sm:text-base text-blue-900 dark:text-blue-100">AI Analysis Summary</AlertTitle>
                    <AlertDescription className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      {result.summary}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Compliance Status */}
                {(!result.violations || result.violations.length === 0) ? (
                  <>
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      <AlertTitle className="text-sm sm:text-base text-green-900 dark:text-green-100">Fully Compliant</AlertTitle>
                      <AlertDescription className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                        All specifications meet code requirements
                      </AlertDescription>
                    </Alert>

                    {/* Compliant Areas */}
                    {result.compliantAreas && result.compliantAreas.length > 0 && (
                      <div className="p-3 sm:p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 space-y-1.5 sm:space-y-2">
                        <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 text-green-900 dark:text-green-100">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          Compliant Areas
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-green-700 dark:text-green-300">
                          {result.compliantAreas.map((area: string, idx: number) => (
                            <li key={idx}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      <AlertTitle className="text-sm sm:text-base">Violations Detected</AlertTitle>
                      <AlertDescription className="text-xs sm:text-sm">
                        {result.violations.length} violation{result.violations.length > 1 ? 's' : ''} found with code citations
                      </AlertDescription>
                    </Alert>

                    {/* Missing Inputs */}
                    {result.missingInputs && result.missingInputs.length > 0 && (
                      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                        <AlertTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-100">Additional Information Needed</AlertTitle>
                        <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                          <ul className="list-disc list-inside space-y-1 mt-1.5 sm:mt-2">
                            {result.missingInputs.map((input: string, idx: number) => (
                              <li key={idx}>{input}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Compliant Areas (shown even with violations) */}
                    {result.compliantAreas && result.compliantAreas.length > 0 && (
                      <div className="p-3 sm:p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 space-y-1.5 sm:space-y-2">
                        <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 text-green-900 dark:text-green-100">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          Compliant Areas
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-green-700 dark:text-green-300">
                          {result.compliantAreas.map((area: string, idx: number) => (
                            <li key={idx}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Violations with Citations */}
                    <div className="space-y-2 sm:space-y-3">
                      {(result.violations || []).map((violation: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-3 sm:p-4 border rounded-lg space-y-2 sm:space-y-3 hover-elevate"
                          data-testid={`violation-${idx}`}
                        >
                          {/* Header with Citation */}
                          <div className="flex items-center justify-between flex-wrap gap-1.5 sm:gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 shrink-0" />
                              <Badge variant="outline" className="font-mono text-xs shrink-0">
                                {violation.citation}
                              </Badge>
                            </div>
                            <Badge variant={violation.severity === "critical" ? "destructive" : "secondary"} className="shrink-0">
                              {violation.severity}
                            </Badge>
                          </div>
                          
                          {/* Description */}
                          <p className="text-xs sm:text-sm font-medium">{violation.description}</p>
                          
                          {/* Recommendation */}
                          {violation.recommendation && (
                            <div className="mt-1.5 sm:mt-2 p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 shrink-0" />
                                Recommended Action:
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                {violation.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8 sm:py-12">
                <ShieldCheck className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-xs sm:text-sm">Enter specifications and validate compliance</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RAG Code Citations Card */}
        {result && result.ragResults && result.ragResults.length > 0 && (
          <Card className="sm:col-span-2" data-testid="card-rag-citations">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Relevant Building Code Citations
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Top {result.ragResults.length} most relevant code sections retrieved via AI vector search
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {result.ragResults.map((citation: any, idx: number) => (
                  <div 
                    key={idx}
                    className="p-3 sm:p-4 border rounded-lg space-y-2 sm:space-y-3 hover-elevate"
                    data-testid={`citation-${idx}`}
                  >
                    {/* Header with Code Section */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {citation.codeType} {citation.section}
                      </Badge>
                      <div className="text-xs text-muted-foreground shrink-0">
                        Rank #{idx + 1}
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-xs sm:text-sm">{citation.title}</h4>

                    {/* Similarity Score */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Relevance Score</span>
                        <span className="font-semibold">{(citation.similarity * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={citation.similarity * 100} className="h-1.5 sm:h-2" />
                    </div>

                    {/* Code Excerpt */}
                    <p className="text-xs text-muted-foreground line-clamp-3 sm:line-clamp-4">
                      {citation.chunk.split('\n').filter((line: string) => line.trim()).slice(1, 4).join(' ')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
