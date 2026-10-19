import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Shield, 
  ShieldCheck, 
  CheckCircle2, 
  Book, 
  Loader2, 
  ArrowLeft, 
  FileSignature, 
  Flame, 
  Accessibility, 
  Lock, 
  HeartPulse,
  FileCheck
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AIComplianceExplainer } from "@/components/ai-compliance-explainer";
import { ErrorState } from "@/components/error-state";

interface ComplianceRule {
  id: string;
  code: string;
  codeType: string;
  title: string;
  description: string;
  severity: string;
  notes?: string;
}

interface ComplianceViolation {
  id: string;
  openingId: string;
  ruleId: string;
  status: string;
  detectedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  rule: ComplianceRule;
}

interface ViolationWithOpening extends ComplianceViolation {
  doorOpening?: any;
}

export default function CompliancePage() {
  const [, params] = useRoute("/projects/:projectId/compliance");
  const projectId = params?.projectId || "";
  const { toast } = useToast();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<ComplianceViolation | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionType, setActionType] = useState<"resolve" | "waive">("resolve");

  const { data: project, isLoading: projectLoading, isError: projectError, error: projectErrorObj, refetch: refetchProject } = useQuery<any>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: violations = [], isLoading: violationsLoading, isError: violationsError, error: violationsErrorObj, refetch: refetchViolations } = useQuery<ViolationWithOpening[]>({
    queryKey: ["/api/projects", projectId, "violations"],
    enabled: !!projectId,
  });

  const { data: openings = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", projectId, "openings"],
    enabled: !!projectId,
  });

  const resolveViolationMutation = useMutation({
    mutationFn: async ({ violationId, notes }: { violationId: string; notes?: string }) => {
      const response = await fetch(`/api/violations/${violationId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to resolve violation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "violations"] });
      toast({
        title: "Success",
        description: "Compliance violation resolved successfully. The issue has been marked as addressed.",
      });
      setResolveDialogOpen(false);
      setResolutionNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve violation",
        description: error.message || "Unable to mark violation as resolved. Please try again.",
        variant: "destructive",
      });
    },
  });

  const waiveViolationMutation = useMutation({
    mutationFn: async ({ violationId, notes }: { violationId: string; notes: string }) => {
      const response = await fetch(`/api/violations/${violationId}/waive`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to waive violation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "violations"] });
      toast({
        title: "Success",
        description: "Compliance violation waived successfully. Your justification has been recorded.",
      });
      setResolveDialogOpen(false);
      setResolutionNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to waive violation",
        description: error.message || "Unable to waive violation. Please ensure you've provided proper justification.",
        variant: "destructive",
      });
    },
  });

  const handleResolve = (violation: ComplianceViolation, type: "resolve" | "waive") => {
    setSelectedViolation(violation);
    setActionType(type);
    setResolveDialogOpen(true);
  };

  const handleSubmitAction = () => {
    if (!selectedViolation) return;

    if (actionType === "resolve") {
      resolveViolationMutation.mutate({
        violationId: selectedViolation.id,
        notes: resolutionNotes || undefined,
      });
    } else {
      if (!resolutionNotes.trim()) {
        toast({
          title: "Notes Required",
          description: "Please provide justification for waiving this violation.",
          variant: "destructive",
        });
        return;
      }
      waiveViolationMutation.mutate({
        violationId: selectedViolation.id,
        notes: resolutionNotes,
      });
    }
  };

  const getViolationOpening = (openingId: string) => {
    return openings.find((o: any) => o.id === openingId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "default";
      case "info":
        return "secondary";
      default:
        return "default";
    }
  };

  const getCodeTypeLabel = (codeType: string) => {
    switch (codeType) {
      case "ada_standard":
        return "ADA Standard";
      case "building_code":
        return "Building Code";
      case "fire_code":
        return "Fire Code";
      case "manufacturing_standard":
        return "Manufacturing Standard";
      default:
        return codeType;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return XCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return CheckCircle2;
      default:
        return FileText;
    }
  };

  const getCodeTypeIcon = (codeType: string) => {
    switch (codeType) {
      case "ada_standard":
        return Accessibility;
      case "building_code":
        return Book;
      case "fire_code":
        return Flame;
      case "manufacturing_standard":
        return FileCheck;
      default:
        return FileText;
    }
  };

  // Show error state for project
  if (projectError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <ErrorState
          title="Failed to load project"
          message={projectErrorObj instanceof Error ? projectErrorObj.message : "Unable to fetch project details. Please check your connection and try again."}
          error={projectErrorObj as Error}
          onRetry={refetchProject}
          testId="error-project"
          fullPage
        />
      </div>
    );
  }

  // Show error state for violations
  if (violationsError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <ErrorState
          title="Failed to load compliance violations"
          message={violationsErrorObj instanceof Error ? violationsErrorObj.message : "Unable to fetch violation data. Please check your connection and try again."}
          error={violationsErrorObj as Error}
          onRetry={refetchViolations}
          testId="error-violations"
          fullPage
        />
      </div>
    );
  }

  if (projectLoading || violationsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading compliance data...</p>
      </div>
    );
  }

  const criticalViolations = violations.filter(v => v.rule.severity === "critical");
  const warningViolations = violations.filter(v => v.rule.severity === "warning");
  const infoViolations = violations.filter(v => v.rule.severity === "info");

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
            Compliance Review
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {project?.name || "Project"} - Building Codes & Standards
          </p>
        </div>
        <Link href={`/projects/${projectId}`}>
          <Button size="sm" variant="outline" data-testid="button-back-to-project" className="w-full sm:w-auto text-xs sm:text-sm">
            <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
            Back to Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-critical-count">
              {criticalViolations.length}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-warning-count">
              {warningViolations.length}
            </div>
            <p className="text-xs text-muted-foreground">Should be reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Informational</CardTitle>
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-info-count">
              {infoViolations.length}
            </div>
            <p className="text-xs text-muted-foreground">For reference</p>
          </CardContent>
        </Card>
      </div>

      {violations.length === 0 ? (
        <Alert data-testid="empty-state">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>No compliance issues detected.</strong> All door openings meet the applicable building codes, fire codes, and manufacturing standards.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Compliance Violations
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Review and address the following code violations for this project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0 space-y-4 sm:space-y-6">
            {violations.map((violation) => {
              const opening = getViolationOpening(violation.openingId);
              return (
                <div key={violation.id} className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge variant={getSeverityColor(violation.rule.severity)} className="shrink-0 text-xs" data-testid={`badge-severity-${violation.id}`}>
                          {(() => {
                            const SeverityIcon = getSeverityIcon(violation.rule.severity);
                            return <SeverityIcon className="h-3 w-3 mr-1 shrink-0" />;
                          })()}
                          {violation.rule.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="shrink-0 text-xs" data-testid={`badge-code-type-${violation.id}`}>
                          {(() => {
                            const CodeTypeIcon = getCodeTypeIcon(violation.rule.codeType);
                            return <CodeTypeIcon className="h-3 w-3 mr-1 shrink-0" />;
                          })()}
                          {getCodeTypeLabel(violation.rule.codeType)}
                        </Badge>
                        <span className="font-mono text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Book className="h-3 w-3 shrink-0" />
                          {violation.rule.code}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base" data-testid={`text-violation-title-${violation.id}`}>
                        {violation.rule.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {violation.rule.description}
                      </p>
                      {opening && (
                        <Link href={`/openings/${violation.openingId}`}>
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs sm:text-sm" data-testid={`link-opening-${violation.id}`}>
                            Opening {opening.openingNumber} - {opening.location}
                          </Button>
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(violation, "resolve")}
                        data-testid={`button-resolve-${violation.id}`}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                        Mark Resolved
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(violation, "waive")}
                        data-testid={`button-waive-${violation.id}`}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <XCircle className="h-4 w-4 mr-2 shrink-0" />
                        Waive
                      </Button>
                    </div>
                  </div>
                  
                  {/* AI Compliance Explainer */}
                  <AIComplianceExplainer
                    violation={{
                      ruleCode: violation.rule.code,
                      description: violation.rule.description,
                      severity: violation.rule.severity,
                    }}
                    doorSpecs={{
                      width: opening?.doorWidth,
                      height: opening?.doorHeight,
                      doorType: opening?.doorType,
                      buildingType: project?.buildingType,
                    }}
                  />
                  
                  <Separator />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {actionType === "resolve" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Resolve Violation
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Waive Violation
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {actionType === "resolve"
                ? "Add notes about how this violation was resolved (optional)."
                : "Provide justification for waiving this code violation (required)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            {selectedViolation && (
              <Alert>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>{selectedViolation.rule.code}:</strong> {selectedViolation.rule.title}
                </AlertDescription>
              </Alert>
            )}
            <Textarea
              placeholder={
                actionType === "resolve"
                  ? "Describe how the issue was addressed..."
                  : "Explain why this violation can be waived..."
              }
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="min-h-24 text-sm"
              data-testid="input-resolution-notes"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              data-testid="button-cancel-action"
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <XCircle className="h-4 w-4 mr-2 shrink-0" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitAction}
              disabled={resolveViolationMutation.isPending || waiveViolationMutation.isPending}
              data-testid="button-submit-action"
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              {resolveViolationMutation.isPending || waiveViolationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  {actionType === "resolve" ? "Resolving..." : "Waiving..."}
                </>
              ) : (
                <>
                  {actionType === "resolve" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                      Resolve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2 shrink-0" />
                      Waive
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
