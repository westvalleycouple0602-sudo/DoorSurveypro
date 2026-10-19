// client/src/components/door-survey/Div28SurveyForm.tsx
// Division 28 Electronic Security Assessment Form Component

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Shield,
  Camera,
  Lock,
  DoorOpen,
  AlertTriangle,
  HelpCircle,
  Loader2,
  CheckCircle,
  Target,
  Radio,
} from "lucide-react";
import {
  div28SurveyAnswersSchema,
  defaultDiv28SurveyAnswers,
} from "@shared/schemas/div28.schema";
import type { Div28SurveyAnswers, Div28OpportunitySummary } from "@shared/types/div28";

interface Div28SurveyFormProps {
  openingId: string;
  defaultValues?: Partial<Div28SurveyAnswers>;
  onSubmit: (data: Div28SurveyAnswers) => void;
  onScoreUpdate?: (summary: Div28OpportunitySummary) => void;
  isSubmitting?: boolean;
  showScorePanel?: boolean;
}

const AREA_TYPE_OPTIONS = [
  { value: "PUBLIC", label: "Public Area" },
  { value: "STAFF_ONLY", label: "Staff Only" },
  { value: "CRITICAL_CARE", label: "Critical Care" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "BEHAVIORAL_HEALTH", label: "Behavioral Health" },
  { value: "IT_DATA_CENTER", label: "IT/Data Center" },
  { value: "ADMIN", label: "Administrative" },
  { value: "OTHER", label: "Other" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "LOW", label: "Low Risk" },
  { value: "MEDIUM", label: "Medium Risk" },
  { value: "HIGH", label: "High Risk" },
  { value: "CRITICAL", label: "Critical" },
];

const ACCESS_CONTROL_OPTIONS = [
  { value: "NONE", label: "No Access Control" },
  { value: "MECHANICAL_ONLY", label: "Mechanical Key Only" },
  { value: "BADGE_CARD", label: "Badge/Card Reader" },
  { value: "PIN_KEYPAD", label: "PIN/Keypad" },
  { value: "BADGE_PLUS_PIN", label: "Badge + PIN (Dual Auth)" },
  { value: "MOBILE_CREDENTIAL", label: "Mobile Credential" },
];

const EGRESS_TYPE_OPTIONS = [
  { value: "FREE_EGRESS", label: "Free Egress" },
  { value: "CONTROLLED_EGRESS", label: "Controlled Egress" },
  { value: "DELAYED_EGRESS", label: "Delayed Egress (15/30 sec)" },
  { value: "SPECIAL_LOCKING_ARRANGEMENT", label: "Special Locking Arrangement" },
];

const SURVEILLANCE_OPTIONS = [
  { value: "NONE", label: "No Surveillance" },
  { value: "LOCAL_CAMERA", label: "Local Camera" },
  { value: "EXISTING_VIDEO_INTEGRATION", label: "Existing VMS Integration" },
  { value: "ANALYTICS_READY", label: "Analytics-Ready Camera" },
];

const INTRUSION_OPTIONS = [
  { value: "NONE", label: "No Intrusion Detection" },
  { value: "DOOR_CONTACT_ONLY", label: "Door Contact Only" },
  { value: "DOOR_PLUS_MOTION", label: "Door + Motion Sensor" },
  { value: "DOOR_PLUS_GLASSBREAK", label: "Door + Glassbreak" },
];

const LOCKDOWN_OPTIONS = [
  { value: "NONE", label: "No Lockdown Coverage" },
  { value: "LOCAL_ONLY", label: "Local Lock Only" },
  { value: "ZONE_LOCKDOWN", label: "Zone Lockdown" },
  { value: "BUILDING_LOCKDOWN", label: "Building-Wide Lockdown" },
];

const GUN_DETECTION_OPTIONS = [
  { value: "NONE", label: "Not Interested" },
  { value: "INTERESTED", label: "Interested" },
  { value: "REQUIRED", label: "Required" },
];

function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs cursor-help text-muted-foreground hover-elevate">
            <HelpCircle className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScoreGauge({ score, tier }: { score: number; tier: string }) {
  const getColor = () => {
    if (tier === "HIGH") return "text-green-600 dark:text-green-400";
    if (tier === "MEDIUM") return "text-yellow-600 dark:text-yellow-400";
    if (tier === "LOW") return "text-blue-600 dark:text-blue-400";
    return "text-muted-foreground";
  };

  const getBg = () => {
    if (tier === "HIGH") return "bg-green-100 dark:bg-green-900/20";
    if (tier === "MEDIUM") return "bg-yellow-100 dark:bg-yellow-900/20";
    if (tier === "LOW") return "bg-blue-100 dark:bg-blue-900/20";
    return "bg-muted";
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg ${getBg()}`}>
      <div className={`text-4xl font-bold ${getColor()}`}>{score}</div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Opportunity Score</div>
        <Badge variant={tier === "HIGH" ? "default" : tier === "MEDIUM" ? "secondary" : "outline"}>
          {tier} Opportunity
        </Badge>
      </div>
    </div>
  );
}

export function Div28SurveyForm({
  openingId,
  defaultValues,
  onSubmit,
  onScoreUpdate,
  isSubmitting = false,
  showScorePanel = true,
}: Div28SurveyFormProps) {
  const form = useForm<Div28SurveyAnswers>({
    resolver: zodResolver(div28SurveyAnswersSchema),
    defaultValues: {
      ...defaultDiv28SurveyAnswers(openingId),
      ...defaultValues,
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;

  const handleFormSubmit = (data: Div28SurveyAnswers) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Division 28: Electronic Security Assessment</CardTitle>
            <CardDescription>
              Evaluate security requirements for Opening {openingId}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Area Type</Label>
                <FieldHelp text="The type of area this opening provides access to. Helps determine security requirements." />
              </div>
              <Select
                value={watch("areaType")}
                onValueChange={(v) => setValue("areaType", v as any)}
              >
                <SelectTrigger data-testid="select-div28-area-type">
                  <SelectValue placeholder="Select area type" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.areaType && (
                <p className="text-xs text-destructive">{errors.areaType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Risk Level</Label>
                <FieldHelp text="Overall security risk assessment for this opening based on asset value and threat level." />
              </div>
              <Select
                value={watch("riskLevel")}
                onValueChange={(v) => setValue("riskLevel", v as any)}
              >
                <SelectTrigger data-testid="select-div28-risk-level">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Access Control</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Access Control Mode</Label>
                  <FieldHelp text="The primary method used to control access through this opening." />
                </div>
                <Select
                  value={watch("accessControlMode")}
                  onValueChange={(v) => setValue("accessControlMode", v as any)}
                >
                  <SelectTrigger data-testid="select-div28-access-mode">
                    <SelectValue placeholder="Select access control" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_CONTROL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Requires Audit Trail</Label>
                    <FieldHelp text="Door events should be logged for compliance or security review." />
                  </div>
                  <Switch
                    checked={watch("requiresAuditTrail")}
                    onCheckedChange={(v) => setValue("requiresAuditTrail", v)}
                    data-testid="switch-div28-audit-trail"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Scheduled Lock/Unlock</Label>
                    <FieldHelp text="Door should automatically lock/unlock on a schedule." />
                  </div>
                  <Switch
                    checked={watch("scheduledLockUnlock")}
                    onCheckedChange={(v) => setValue("scheduledLockUnlock", v)}
                    data-testid="switch-div28-scheduled"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Egress & Traffic</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Egress Type</Label>
                  <FieldHelp text="How egress is controlled through this opening per fire code requirements." />
                </div>
                <Select
                  value={watch("egressType")}
                  onValueChange={(v) => setValue("egressType", v as any)}
                >
                  <SelectTrigger data-testid="select-div28-egress-type">
                    <SelectValue placeholder="Select egress type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EGRESS_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Unsure About Egress Code</Label>
                    <FieldHelp text="Flag for engineering review if code requirements are unclear." />
                  </div>
                  <Switch
                    checked={watch("unsureAboutEgressCode")}
                    onCheckedChange={(v) => setValue("unsureAboutEgressCode", v)}
                    data-testid="switch-div28-unsure-egress"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Heavy/High Traffic</Label>
                    <FieldHelp text="Opening experiences high volume of daily use. Affects hardware durability requirements." />
                  </div>
                  <Switch
                    checked={watch("heavyOrHighTraffic")}
                    onCheckedChange={(v) => setValue("heavyOrHighTraffic", v)}
                    data-testid="switch-div28-high-traffic"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>ADA Priority</Label>
                  <FieldHelp text="Opening requires ADA-compliant automatic operator or accessibility features." />
                </div>
                <Switch
                  checked={watch("adaPriority")}
                  onCheckedChange={(v) => setValue("adaPriority", v)}
                  data-testid="switch-div28-ada"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Infection Control Priority</Label>
                  <FieldHelp text="Touchless operation required for infection control (healthcare settings)." />
                </div>
                <Switch
                  checked={watch("infectionControlPriority")}
                  onCheckedChange={(v) => setValue("infectionControlPriority", v)}
                  data-testid="switch-div28-infection-control"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Surveillance & Detection</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Surveillance Level</Label>
                  <FieldHelp text="Camera and video surveillance requirements for this opening." />
                </div>
                <Select
                  value={watch("surveillanceLevel")}
                  onValueChange={(v) => setValue("surveillanceLevel", v as any)}
                >
                  <SelectTrigger data-testid="select-div28-surveillance">
                    <SelectValue placeholder="Select surveillance" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURVEILLANCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Intrusion Detection</Label>
                  <FieldHelp text="Alarm and detection sensors for this opening." />
                </div>
                <Select
                  value={watch("intrusionLevel")}
                  onValueChange={(v) => setValue("intrusionLevel", v as any)}
                >
                  <SelectTrigger data-testid="select-div28-intrusion">
                    <SelectValue placeholder="Select intrusion level" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTRUSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Lockdown & Advanced Security</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Lockdown Coverage</Label>
                  <FieldHelp text="How this opening participates in building lockdown scenarios." />
                </div>
                <Select
                  value={watch("lockdownCoverage")}
                  onValueChange={(v) => setValue("lockdownCoverage", v as any)}
                >
                  <SelectTrigger data-testid="select-div28-lockdown">
                    <SelectValue placeholder="Select lockdown coverage" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCKDOWN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Gun Detection Interest</Label>
                  <FieldHelp text="Customer interest in AI-powered weapon detection at this entry point." />
                </div>
                <Select
                  value={watch("gunDetectionIntent")}
                  onValueChange={(v) => setValue("gunDetectionIntent", v as any)}
                >
                  <SelectTrigger data-testid="select-div28-gun-detection">
                    <SelectValue placeholder="Select interest level" />
                  </SelectTrigger>
                  <SelectContent>
                    {GUN_DETECTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Additional Notes</Label>
              <FieldHelp text="Any special requirements, site conditions, or customer requests related to electronic security." />
            </div>
            <Textarea
              value={watch("notes") || ""}
              onChange={(e) => setValue("notes", e.target.value)}
              placeholder="Enter any additional security notes or requirements..."
              data-testid="textarea-div28-notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting} data-testid="button-div28-submit">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Assessment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default Div28SurveyForm;
