// client/src/components/export/Div28ExportOptions.tsx
// Division 28 Quote Export Configuration Component

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  DollarSign,
  Settings,
  Shield,
  AlertTriangle,
} from "lucide-react";
import type { QuoteExportOptions, PricingMode, Div28ExportMode } from "@shared/types/div28";

interface Div28ExportOptionsProps {
  value: QuoteExportOptions;
  onChange: (options: QuoteExportOptions) => void;
  disabled?: boolean;
}

const PRICING_MODE_OPTIONS: { value: PricingMode; label: string; description: string }[] = [
  { value: "LINE_ITEM", label: "Line Item", description: "Show each item separately" },
  { value: "OPENING_PACKAGE", label: "Per Opening", description: "Package pricing by opening" },
  { value: "PROJECT_SUMMARY", label: "Project Summary", description: "Single total for project" },
];

const DIV28_MODE_OPTIONS: { value: "NONE" | "INLINE" | "APPENDIX"; label: string }[] = [
  { value: "NONE", label: "Hide Div 28" },
  { value: "INLINE", label: "Show Inline" },
  { value: "APPENDIX", label: "Show in Appendix" },
];

export function Div28ExportOptions({
  value,
  onChange,
  disabled = false,
}: Div28ExportOptionsProps) {
  const updateField = <K extends keyof QuoteExportOptions>(
    field: K,
    fieldValue: QuoteExportOptions[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const updateDiv28 = (updates: Partial<Div28ExportMode>) => {
    onChange({
      ...value,
      div28: { ...value.div28, ...updates },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-4">
        <Settings className="h-5 w-5 text-primary" />
        <div>
          <CardTitle className="text-lg">Quote Export Options</CardTitle>
          <CardDescription>Configure how quotes are formatted and exported</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Pricing Display</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pricing Mode</Label>
              <Select
                value={value.pricingMode}
                onValueChange={(v) => updateField("pricingMode", v as PricingMode)}
                disabled={disabled}
              >
                <SelectTrigger data-testid="select-pricing-mode">
                  <SelectValue placeholder="Select pricing mode" />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-taxes">Show Taxes</Label>
                <Switch
                  id="show-taxes"
                  checked={value.showTaxes}
                  onCheckedChange={(v) => updateField("showTaxes", v)}
                  disabled={disabled}
                  data-testid="switch-show-taxes"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-labor">Show Labor Breakout</Label>
                <Switch
                  id="show-labor"
                  checked={value.showLaborBreakout}
                  onCheckedChange={(v) => updateField("showLaborBreakout", v)}
                  disabled={disabled}
                  data-testid="switch-show-labor"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-opening">Show Opening Breakdown</Label>
                <Switch
                  id="show-opening"
                  checked={value.showOpeningBreakdown}
                  onCheckedChange={(v) => updateField("showOpeningBreakdown", v)}
                  disabled={disabled}
                  data-testid="switch-show-opening"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Division 28 Security Options</h3>
            {value.div28.mode !== "NONE" && (
              <Badge variant="secondary" className="text-xs">Active</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Div 28 Display Mode</Label>
              <Select
                value={value.div28.mode}
                onValueChange={(v) => updateDiv28({ mode: v as "NONE" | "INLINE" | "APPENDIX" })}
                disabled={disabled}
              >
                <SelectTrigger data-testid="select-div28-mode">
                  <SelectValue placeholder="Select display mode" />
                </SelectTrigger>
                <SelectContent>
                  {DIV28_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {value.div28.mode !== "NONE" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="flag-optional">Flag as Optional</Label>
                    <Badge variant="outline" className="text-xs">Recommended</Badge>
                  </div>
                  <Switch
                    id="flag-optional"
                    checked={value.div28.flagAsOptional}
                    onCheckedChange={(v) => updateDiv28({ flagAsOptional: v })}
                    disabled={disabled}
                    data-testid="switch-div28-optional"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="show-disclaimer">Show Div 28 Disclaimer</Label>
                  </div>
                  <Switch
                    id="show-disclaimer"
                    checked={value.div28.showDiv28Disclaimer}
                    onCheckedChange={(v) => updateDiv28({ showDiv28Disclaimer: v })}
                    disabled={disabled}
                    data-testid="switch-div28-disclaimer"
                  />
                </div>
              </div>
            )}
          </div>

          {value.div28.mode !== "NONE" && value.div28.showDiv28Disclaimer && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Div 28 Disclaimer Preview:</p>
                  <p className="text-xs mt-1">
                    Division 28 (Electronic Safety & Security) items are optional upgrades
                    and require coordination with a licensed security integrator. Pricing
                    shown is estimated and subject to final site survey by integrator partner.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Additional Options</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-alternate">Include Alternate Pricing</Label>
              <Switch
                id="include-alternate"
                checked={value.includeAlternateOption}
                onCheckedChange={(v) => updateField("includeAlternateOption", v)}
                disabled={disabled}
                data-testid="switch-include-alternate"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-confidential">Include Confidential Terms</Label>
              <Switch
                id="include-confidential"
                checked={value.includeConfidentialTerms}
                onCheckedChange={(v) => updateField("includeConfidentialTerms", v)}
                disabled={disabled}
                data-testid="switch-include-confidential"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Div28ExportOptions;
