import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Phase3Demo } from "@/components/phase3-demo";
import { Phase4Demo } from "@/components/phase4-demo";
import { Phase5Demo } from "@/components/phase5-demo";
import { Phase6Demo } from "@/components/phase6-demo";

export default function Roadmap() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Roadmap</h1>
        <p className="text-muted-foreground mt-2">
          Explore the latest features and improvements to DoorSurvey Pro
        </p>
      </div>

      <Separator />

      {/* Phase 3 Demo */}
      <Phase3Demo />

      <Separator className="my-6" />

      {/* Phase 4 Demo */}
      <Phase4Demo />

      <Separator className="my-6" />

      {/* Phase 5 Demo */}
      <Phase5Demo />

      <Separator className="my-6" />

      {/* Phase 6: Advanced Search & Filtering System */}
      <Phase6Demo />

      <Separator className="my-6" />

      {/* UX Enhancements */}
      <Card data-testid="card-ux-enhancements">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-500/10 p-2">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Enhanced User Experience</CardTitle>
                <CardDescription>Improved loading states, tooltips, and onboarding</CardDescription>
              </div>
            </div>
            <Badge variant="default">New</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Key Components</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Progress Indicators:</strong> Smart loading states with contextual messages (default, inline, overlay variants)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Enhanced Metric Cards:</strong> Interactive cards with trends, badges, and click actions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Info Tooltips:</strong> Contextual help for complex features with flexible positioning</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Page Headers:</strong> Consistent headers with breadcrumbs, badges, and action buttons</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Feature Announcements:</strong> Beautiful cards for highlighting new features with dismissible states</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Onboarding Checklist:</strong> Interactive progress tracker for guiding new users through setup</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Benefits</h4>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">•</span>
                <span className="text-muted-foreground">Better performance perception through smart loading states</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">•</span>
                <span className="text-muted-foreground">Reduced learning curve with contextual tooltips</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">•</span>
                <span className="text-muted-foreground">Improved data visibility with trend indicators</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">•</span>
                <span className="text-muted-foreground">Consistent experience across the platform</span>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
