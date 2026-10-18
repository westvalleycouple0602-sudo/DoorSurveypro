import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Target, Lock, Eye, AlertTriangle, Zap, Video, Bell } from "lucide-react";
import type { Div28OpportunitySummary, Div28Feature } from "@shared/types/div28";
import { formatOpportunityTier, getTierColor, getTierBadgeVariant } from "@/hooks/use-div28-scorer";

interface Div28SummaryCardProps {
  summary: Div28OpportunitySummary;
  showRecommendations?: boolean;
  compact?: boolean;
}

export function Div28SummaryCard({ summary, showRecommendations = true, compact = false }: Div28SummaryCardProps) {
  const tierLabel = formatOpportunityTier(summary.tier);
  const tierColor = getTierColor(summary.tier);
  const badgeVariant = getTierBadgeVariant(summary.tier);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-muted-foreground";
  };

  const getFeatureLabel = (feature: Div28Feature): string => {
    const labels: Record<Div28Feature, string> = {
      ACCESS_CONTROL: "Access Control",
      DOOR_AUTOMATION: "Door Automation",
      CONTROLLED_EGRESS: "Controlled Egress",
      DELAYED_EGRESS: "Delayed Egress",
      SURVEILLANCE: "Surveillance",
      INTRUSION_DETECTION: "Intrusion Detection",
      GUN_DETECTION_READY: "Gun Detection Ready",
      LOCKDOWN_CONTROL: "Lockdown Control",
    };
    return labels[feature] || feature;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30" data-testid="div28-summary-compact">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Div28 Score:</span>
        </div>
        <span className={`text-lg font-bold ${getScoreColor(summary.score)}`} data-testid="text-div28-score">
          {summary.score}
        </span>
        <Badge variant={badgeVariant} data-testid="badge-div28-tier">
          {tierLabel}
        </Badge>
      </div>
    );
  }

  return (
    <Card data-testid="div28-summary-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Division 28 Security Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Opportunity Score</div>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${getScoreColor(summary.score)}`} data-testid="text-div28-score-large">
                {summary.score}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">Tier</div>
            <Badge variant={badgeVariant} className="text-sm" data-testid="badge-div28-tier-large">
              {tierLabel}
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          <Progress 
            value={summary.score} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Premium</span>
          </div>
        </div>

        {summary.recommendedFeatures && summary.recommendedFeatures.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recommended Features</div>
            <div className="flex flex-wrap gap-2">
              {summary.recommendedFeatures.map((feature: Div28Feature, index: number) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1" data-testid={`badge-feature-${feature.toLowerCase().replace(/_/g, '-')}`}>
                  {getFeatureIcon(feature)}
                  {getFeatureLabel(feature)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {summary.narrativeSummary && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium">Summary</div>
            <p className="text-sm text-muted-foreground" data-testid="text-narrative-summary">
              {summary.narrativeSummary}
            </p>
          </div>
        )}

        {showRecommendations && summary.warnings && summary.warnings.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Warnings
            </div>
            <ul className="space-y-1">
              {summary.warnings.map((warning: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`text-warning-${index}`}>
                  <Target className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getFeatureIcon(feature: Div28Feature) {
  switch (feature) {
    case 'ACCESS_CONTROL': return <Lock className="h-3 w-3" />;
    case 'SURVEILLANCE': return <Video className="h-3 w-3" />;
    case 'INTRUSION_DETECTION': return <AlertTriangle className="h-3 w-3" />;
    case 'DOOR_AUTOMATION': return <Zap className="h-3 w-3" />;
    case 'LOCKDOWN_CONTROL': return <Shield className="h-3 w-3" />;
    case 'DELAYED_EGRESS':
    case 'CONTROLLED_EGRESS': return <Bell className="h-3 w-3" />;
    case 'GUN_DETECTION_READY': return <Eye className="h-3 w-3" />;
    default: return <Eye className="h-3 w-3" />;
  }
}

export default Div28SummaryCard;
