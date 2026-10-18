// client/src/components/pm/ProcurementChecklistPanel.tsx
// Procurement Red Flag Review Panel Component

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Package, Building2 } from "lucide-react";
import type { ProcurementLine, ManufacturerDomain } from "@shared/projectManagement";

export interface ProcurementRedFlagLine {
  id: string;
  manufacturer: ManufacturerDomain;
  openingLabel?: string | null;
  hardwareSetId?: string | null;
  description: string;
  redFlags: string[];
}

export interface ProcurementChecklistPanelProps {
  lines: ProcurementRedFlagLine[];
  isLoading?: boolean;
}

const MANUFACTURER_COLORS: Record<ManufacturerDomain, string> = {
  ALLEGION: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ASSA_ABLOY: "bg-green-500/10 text-green-600 dark:text-green-400",
  DORMAKABA: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  STANLEY: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  HAGER: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  OTHER: "bg-muted text-muted-foreground",
};

export function ProcurementChecklistPanel({
  lines,
  isLoading,
}: ProcurementChecklistPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!lines.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No procurement lines or red flags detected yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalRedFlags = lines.reduce((sum, line) => sum + line.redFlags.length, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Procurement Red-Flag Review
            </CardTitle>
            <CardDescription>
              Quickly scan items that need clarification before releasing orders to
              manufacturers.
            </CardDescription>
          </div>
          <Badge variant="destructive" className="text-sm">
            {totalRedFlags} {totalRedFlags === 1 ? "Issue" : "Issues"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[420px]">
          <div className="space-y-3">
            {lines.map((line) => (
              <Card key={line.id} className="bg-muted/50" data-testid={`procurement-line-${line.id}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{line.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {line.openingLabel && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {line.openingLabel}
                          </span>
                        )}
                        {line.openingLabel && line.hardwareSetId && (
                          <span>·</span>
                        )}
                        {line.hardwareSetId && (
                          <span>Set {line.hardwareSetId}</span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={MANUFACTURER_COLORS[line.manufacturer] || ""}
                    >
                      {line.manufacturer.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  {line.redFlags.length > 0 && (
                    <ul className="space-y-1">
                      {line.redFlags.map((flag, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-destructive"
                        >
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
