import { memo, useMemo } from "react";
import type {
  DoorElevationOverlayHardwareMarker,
  OverlayStatus,
  RuleEvaluationResult
} from "../types/doorElevationOverlay";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  marker: DoorElevationOverlayHardwareMarker | null;
  evaluations: RuleEvaluationResult[];
  onClose?: () => void;
};

const STATUS_COLORS: Record<OverlayStatus, { fill: string; className: string }> = {
  pass: { fill: "hsl(142, 76%, 36%)", className: "bg-green-500" },
  violation: { fill: "hsl(0, 84%, 60%)", className: "bg-red-500" },
  unknown: { fill: "hsl(220, 9%, 46%)", className: "bg-muted-foreground" }
};

const HardwareComplianceDetails = memo(function HardwareComplianceDetails({
  marker,
  evaluations,
  onClose
}: Props) {
  const relatedEvaluations = useMemo(() => {
    if (!marker) return [];
    return evaluations.filter((ev) => ev.hardwareId === marker.hardwareId);
  }, [marker, evaluations]);

  if (!marker) {
    return (
      <aside 
        className="w-full md:w-80 border-l border-border bg-card p-4 text-sm text-muted-foreground"
        data-testid="compliance-details-empty"
        aria-label="Compliance details panel"
      >
        <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">
          Compliance Details
        </p>
        <p>Select a hardware marker on the LiDAR door view to see rule checks.</p>
      </aside>
    );
  }

  return (
    <aside 
      className="w-full md:w-80 border-l border-border bg-card flex flex-col"
      data-testid="compliance-details-panel"
      aria-label={`Compliance details for ${marker.type}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 bg-muted/50">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLORS[marker.status].className}`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-foreground">
              {marker.type}
            </span>
          </div>
          {marker.hardwareId && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Hardware ID: {marker.hardwareId}
            </span>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-details"
            aria-label="Close compliance details panel"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {relatedEvaluations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No specific rule evaluations associated with this hardware yet.
          </p>
        ) : (
          relatedEvaluations.map((ev) => (
            <article
              key={ev.ruleId}
              className={`rounded-lg p-3 text-xs space-y-1 border ${
                ev.passed
                  ? "border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/30"
                  : "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30"
              }`}
              data-testid={`rule-evaluation-${ev.ruleId}`}
              aria-label={`Rule ${ev.ruleId}: ${ev.passed ? "passed" : "failed"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">
                  {ev.ruleId}
                </span>
                <Badge 
                  variant={ev.passed ? "default" : "destructive"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {ev.passed ? "PASS" : "VIOLATION"}
                </Badge>
              </div>

              <div className="text-foreground leading-snug">
                {ev.message}
              </div>

              {ev.remediation && !ev.passed && (
                <div className="text-[11px] text-red-800 dark:text-red-200 bg-red-100/80 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded mt-2 p-2">
                  <div className="font-semibold mb-0.5">
                    Suggested Fix
                  </div>
                  <div>{ev.remediation}</div>
                </div>
              )}

              <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-1">
                {ev.codeReferences.map((cr) => (
                  <span
                    key={cr}
                    className="px-1 py-0.5 bg-muted rounded"
                    data-testid={`code-ref-${cr.replace(/\s+/g, '-')}`}
                  >
                    {cr}
                  </span>
                ))}
              </div>

              <div className="text-[10px] text-muted-foreground mt-1">
                Confidence: {(ev.confidence * 100).toFixed(0)}%
                {ev.measurement_source ? ` • Source: ${ev.measurement_source}` : ""}
              </div>
            </article>
          ))
        )}
      </div>
    </aside>
  );
});

export default HardwareComplianceDetails;
