import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Target,
  TrendingUp,
  Lock,
  Camera,
  Radio,
  DoorOpen,
  AlertTriangle,
  Building2,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project } from "@shared/schema";
import div28Illustration from "@assets/generated_images/door_security_access_control.png";

interface Div28ProjectSummary {
  projectId: string;
  projectName: string;
  projectNumber: string;
  totalOpenings: number;
  div28EnabledOpenings: number;
  averageScore: number;
  highestScore: number;
  tier: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  featuresDetected: string[];
}

function getScoreColor(tier: string) {
  switch (tier) {
    case "HIGH":
      return { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800" };
    case "MEDIUM":
      return { bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" };
    case "LOW":
      return { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted" };
  }
}

function getTierBadgeVariant(tier: string): "default" | "secondary" | "outline" {
  switch (tier) {
    case "HIGH":
      return "default";
    case "MEDIUM":
      return "secondary";
    default:
      return "outline";
  }
}

const FEATURE_ICONS: Record<string, typeof Shield> = {
  ACCESS_CONTROL: Lock,
  DOOR_AUTOMATION: DoorOpen,
  CONTROLLED_EGRESS: Shield,
  DELAYED_EGRESS: AlertTriangle,
  SURVEILLANCE: Camera,
  INTRUSION_DETECTION: Radio,
  LOCKDOWN_CONTROL: Shield,
  GUN_DETECTION_READY: Target,
};

function FeatureBadge({ feature }: { feature: string }) {
  const Icon = FEATURE_ICONS[feature] || Shield;
  const label = feature.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function ProjectCard({ summary }: { summary: Div28ProjectSummary }) {
  const colors = getScoreColor(summary.tier);
  
  return (
    <Card className="hover-elevate" data-testid={`card-div28-project-${summary.projectId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{summary.projectName}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              {summary.projectNumber}
            </CardDescription>
          </div>
          <Badge variant={getTierBadgeVariant(summary.tier)} data-testid={`badge-tier-${summary.projectId}`}>
            {summary.tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className={`h-5 w-5 ${colors.text}`} />
              <span className={`text-2xl font-bold ${colors.text}`} data-testid={`text-score-${summary.projectId}`}>
                {Math.round(summary.averageScore)}
              </span>
              <span className="text-sm text-muted-foreground">avg</span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{summary.div28EnabledOpenings} of {summary.totalOpenings} openings</div>
              <div className="font-medium">assessed</div>
            </div>
          </div>
          <Progress value={summary.averageScore} className="mt-2 h-1.5" />
        </div>
        
        {summary.featuresDetected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summary.featuresDetected.slice(0, 4).map(feature => (
              <FeatureBadge key={feature} feature={feature} />
            ))}
            {summary.featuresDetected.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{summary.featuresDetected.length - 4} more
              </Badge>
            )}
          </div>
        )}
        
        <Link href={`/projects/${summary.projectId}`}>
          <Button variant="outline" className="w-full gap-2" data-testid={`button-view-project-${summary.projectId}`}>
            View Project
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader className="p-3 sm:p-4">
            <Skeleton className="h-4 sm:h-5 w-3/4" />
            <Skeleton className="h-3 sm:h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3 p-3 sm:p-4 pt-0">
            <Skeleton className="h-14 sm:h-16 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
              <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
            </div>
            <Skeleton className="h-8 sm:h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Div28Assessments() {
  const { data: projects, isLoading, error, isError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectSummaries: Div28ProjectSummary[] = projects?.map(project => {
    const openings = (project as any).openings || [];
    const div28Openings = openings.filter((o: any) => o.div28Assessment?.enabled);
    const scores = div28Openings
      .map((o: any) => o.div28Assessment?.score)
      .filter((s: any) => typeof s === "number");
    
    const avgScore = scores.length > 0 
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
      : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    const allFeatures = new Set<string>();
    div28Openings.forEach((o: any) => {
      if (o.div28Assessment?.accessControlNeeded) allFeatures.add("ACCESS_CONTROL");
      if (o.div28Assessment?.doorAutomationNeeded) allFeatures.add("DOOR_AUTOMATION");
      if (o.div28Assessment?.delayedEgressNeeded) allFeatures.add("DELAYED_EGRESS");
      if (o.div28Assessment?.surveillanceNeeded) allFeatures.add("SURVEILLANCE");
      if (o.div28Assessment?.intrusionDetectionNeeded) allFeatures.add("INTRUSION_DETECTION");
      if (o.div28Assessment?.lockdownControlNeeded) allFeatures.add("LOCKDOWN_CONTROL");
    });

    let tier: "HIGH" | "MEDIUM" | "LOW" | "NONE" = "NONE";
    if (avgScore >= 70) tier = "HIGH";
    else if (avgScore >= 40) tier = "MEDIUM";
    else if (avgScore > 0) tier = "LOW";

    return {
      projectId: project.id,
      projectName: project.name,
      projectNumber: (project as any).projectNumber || `P-${project.id}`,
      totalOpenings: openings.length,
      div28EnabledOpenings: div28Openings.length,
      averageScore: avgScore,
      highestScore: maxScore,
      tier,
      featuresDetected: Array.from(allFeatures),
    };
  }).filter(s => s.div28EnabledOpenings > 0) || [];

  const stats = {
    totalProjects: projectSummaries.length,
    highOpportunity: projectSummaries.filter(s => s.tier === "HIGH").length,
    mediumOpportunity: projectSummaries.filter(s => s.tier === "MEDIUM").length,
    totalAssessedOpenings: projectSummaries.reduce((sum, s) => sum + s.div28EnabledOpenings, 0),
  };

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-div28-assessments">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">Division 28 Assessments</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Electronic security opportunity scoring across all projects
          </p>
        </div>
        <Badge variant="default" className="gap-1 shrink-0 self-start sm:self-auto">
          <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="text-xs">Opportunity Engine</span>
        </Badge>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-total-projects">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Projects Assessed</CardDescription>
            <CardTitle className="text-xl sm:text-3xl">{stats.totalProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="stat-high-opportunity">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 shrink-0" />
              <span className="truncate">High Opportunity</span>
            </CardDescription>
            <CardTitle className="text-xl sm:text-3xl text-green-600">{stats.highOpportunity}</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="stat-medium-opportunity">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
              <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-500 shrink-0" />
              <span className="truncate">Medium Opportunity</span>
            </CardDescription>
            <CardTitle className="text-xl sm:text-3xl text-yellow-600">{stats.mediumOpportunity}</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="stat-total-openings">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Openings Assessed</CardDescription>
            <CardTitle className="text-xl sm:text-3xl">{stats.totalAssessedOpenings}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Separator />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load projects</p>
          </CardContent>
        </Card>
      ) : projectSummaries.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <img 
              src={div28Illustration} 
              alt="Electronic access control illustration" 
              className="w-full max-w-md mx-auto mb-6 rounded-lg opacity-90"
              data-testid="img-div28-empty-state"
            />
            <h3 className="text-lg font-medium mb-2">No Division 28 Assessments Yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto px-2">
              Enable Division 28 electronic security assessments in your door survey openings to see opportunity scores here.
            </p>
            <Link href="/projects">
              <Button data-testid="button-go-to-projects">
                Go to Projects
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold">Projects with Div28 Assessments</h2>
            <Badge variant="secondary" className="self-start sm:self-auto shrink-0">{projectSummaries.length} projects</Badge>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projectSummaries
              .sort((a, b) => b.averageScore - a.averageScore)
              .map(summary => (
                <ProjectCard key={summary.projectId} summary={summary} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
