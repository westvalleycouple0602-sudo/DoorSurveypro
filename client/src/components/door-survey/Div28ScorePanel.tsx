// client/src/components/door-survey/Div28ScorePanel.tsx
// Division 28 Opportunity Score Display Component

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Shield,
  Lock,
  Camera,
  Radio,
  DoorOpen,
  AlertTriangle,
} from "lucide-react";
import type { Div28OpportunitySummary, Div28Feature } from "@shared/types/div28";

interface Div28ScorePanelProps {
  summary: Div28OpportunitySummary;
  showFeatures?: boolean;
  showWarnings?: boolean;
  compact?: boolean;
}

const FEATURE_CONFIG: Record<Div28Feature, { icon: typeof Shield; label: string; color: string }> = {
  ACCESS_CONTROL: { icon: Lock, label: "Access Control", color: "text-blue-600" },
  DOOR_AUTOMATION: { icon: DoorOpen, label: "Door Automation", color: "text-green-600" },
  CONTROLLED_EGRESS: { icon: Shield, label: "Controlled Egress", color: "text-orange-600" },
  DELAYED_EGRESS: { icon: AlertTriangle, label: "Delayed Egress", color: "text-yellow-600" },
  SURVEILLANCE: { icon: Camera, label: "Video Surveillance", color: "text-purple-600" },
  INTRUSION_DETECTION: { icon: Radio, label: "Intrusion Detection", color: "text-red-600" },
  GUN_DETECTION_READY: { icon: Target, label: "Gun Detection Ready", color: "text-rose-600" },
  LOCKDOWN_CONTROL: { icon: Shield, label: "Lockdown Control", color: "text-indigo-600" },
};

function getScoreColor(tier: string) {
  switch (tier) {
    case "HIGH":
      return { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400" };
    case "MEDIUM":
      return { bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" };
    case "LOW":
      return { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground" };
  }
}

function getProgressColor(tier: string) {
  switch (tier) {
    case "HIGH":
      return "bg-green-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "LOW":
      return "bg-blue-500";
    default:
      return "bg-muted-foreground";
  }
}

export function Div28ScorePanel({
  summary,
  showFeatures = true,
  showWarnings = true,
  compact = false,
}: Div28ScorePanelProps) {
  const colors = getScoreColor(summary.tier);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg}`}>
        <Target className={`h-5 w-5 ${colors.text}`} />
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${colors.text}`}>{summary.score}</span>
          <Badge variant={summary.tier === "HIGH" ? "default" : "secondary"}>
            {summary.tier}
          </Badge>
        </div>
        {summary.recommendedFeatures.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {summary.recommendedFeatures.length} features
          </span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Div 28 Opportunity Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`p-4 rounded-lg ${colors.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Target className={`h-6 w-6 ${colors.text}`} />
              <span className={`text-4xl font-bold ${colors.text}`}>{summary.score}</span>
            </div>
            <Badge
              variant={summary.tier === "HIGH" ? "default" : summary.tier === "MEDIUM" ? "secondary" : "outline"}
              className="text-sm"
            >
              {summary.tier} Opportunity
            </Badge>
          </div>
          <Progress
            value={summary.score}
            className="h-2"
          />
        </div>

        {summary.narrativeSummary && (
          <p className="text-sm text-muted-foreground">{summary.narrativeSummary}</p>
        )}

        {showFeatures && summary.recommendedFeatures.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Recommended Features ({summary.recommendedFeatures.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {summary.recommendedFeatures.map((feature) => {
                  const config = FEATURE_CONFIG[feature];
                  const Icon = config.icon;
                  return (
                    <Badge
                      key={feature}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      {config.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {showWarnings && summary.warnings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Compliance Notes ({summary.warnings.length})
              </h4>
              <ul className="space-y-1">
                {summary.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-0.5">-</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default Div28ScorePanel;
