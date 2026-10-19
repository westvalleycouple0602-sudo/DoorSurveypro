import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { validateNFPATolerance, type NFPAToleranceResult } from "@shared/calculators";
import type { DoorOpening } from "@shared/schema";

interface NFPAToleranceValidatorProps {
  opening: DoorOpening;
}

export function NFPAToleranceValidator({ opening }: NFPAToleranceValidatorProps) {
  const validation = useMemo<NFPAToleranceResult>(() => {
    return validateNFPATolerance({
      doorType: opening.doorType,
      doorWidth: opening.doorWidth,
      doorHeight: opening.doorHeight,
      frameWidth: opening.frameWidth,
      frameDepth: opening.frameDepth,
      fireRating: opening.doorFireRating,
      gasketingRequired: opening.gasketingRequired,
      undercut: null, // Field for undercut measurement can be added to schema later
      topGap: null,
      sideGap: null,
      meetingStileGap: null,
    });
  }, [opening]);

  if (!opening.doorType && !opening.doorWidth && !opening.doorFireRating) {
    return null;
  }

  const hasFireRating = opening.doorFireRating && opening.doorFireRating !== 'none' && opening.doorFireRating !== '0';

  return (
    <Card data-testid="card-nfpa-tolerance">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          NFPA 80/101 Tolerance Check
        </CardTitle>
        <CardDescription>
          Validates door clearances and measurements against NFPA 80 (Fire Doors) and NFPA 101 (Life Safety)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert data-testid="alert-summary" className={validation.isCompliant ? "border-green-500/50 bg-green-50 dark:bg-green-950" : "border-destructive/50 bg-destructive/10"}>
          <div className="flex items-start gap-3">
            {validation.isCompliant ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium mb-1">{validation.summary}</div>
              {hasFireRating && (
                <div className="text-sm text-muted-foreground">
                  Fire Rating: {opening.doorFireRating} | Gasketing: {opening.gasketingRequired === "yes" ? "Yes" : "No"}
                </div>
              )}
            </div>
          </div>
        </Alert>

        {validation.violations.length > 0 && (
          <div className="space-y-3" data-testid="container-violations">
            <div className="font-medium text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Violations ({validation.violations.length})
            </div>
            {validation.violations.map((violation, index) => (
              <div
                key={index}
                className="p-3 border border-destructive/50 rounded-md bg-destructive/5"
                data-testid={`violation-${index}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{violation.description}</span>
                      <Badge
                        variant={violation.severity === "critical" ? "destructive" : "outline"}
                        data-testid={`badge-severity-${index}`}
                      >
                        {violation.severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{violation.standard}</div>
                  </div>
                </div>
                {(violation.measured || violation.required) && (
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    {violation.measured && (
                      <div>
                        <span className="text-muted-foreground">Measured:</span>{" "}
                        <span className="font-medium">{violation.measured}</span>
                      </div>
                    )}
                    {violation.required && (
                      <div>
                        <span className="text-muted-foreground">Required:</span>{" "}
                        <span className="font-medium">{violation.required}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-sm bg-background/50 p-2 rounded border">
                  <span className="font-medium">Recommendation:</span> {violation.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="space-y-3" data-testid="container-warnings">
            <div className="font-medium text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({validation.warnings.length})
            </div>
            {validation.warnings.map((warning, index) => (
              <div
                key={index}
                className="p-3 border border-yellow-500/50 rounded-md bg-yellow-50/50 dark:bg-yellow-950/20"
                data-testid={`warning-${index}`}
              >
                <div className="text-sm font-medium mb-1">{warning.message}</div>
                <div className="text-xs text-muted-foreground">{warning.standard}</div>
              </div>
            ))}
          </div>
        )}

        {validation.passedChecks.length > 0 && validation.isCompliant && (
          <div className="space-y-2" data-testid="container-passed-checks">
            <div className="font-medium text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Passed Checks ({validation.passedChecks.length})
            </div>
            <div className="space-y-1">
              {validation.passedChecks.map((check, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-6" data-testid={`passed-check-${index}`}>
                  • {check}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border">
          <strong>Note:</strong> This validation uses calculated clearances based on door and frame dimensions. 
          For fire-rated doors without intumescent gasketing, maximum clearances are limited to 1/8" 
          (sides and top) and 3/4" (bottom). With proper gasketing, up to 1/4" clearance is permitted.
        </div>
      </CardContent>
    </Card>
  );
}
