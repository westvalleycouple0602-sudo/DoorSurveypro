import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface PlanUsage {
  tier: string;
  status: string;
  usage: {
    projects: { current: number; limit: number | null };
    users: { current: number; limit: number | null };
  };
}

export default function Billing() {
  const { data, isLoading, isError, refetch } = useQuery<PlanUsage>({
    queryKey: ["/api/subscriptions/usage"],
  });
  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-plan-usage">Plan &amp; usage</h1>
        <p className="text-muted-foreground mt-2">Online checkout and subscription billing are no longer available in this app.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Your existing plan and account permissions have not been changed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading plan" /> :
            isError ? <div role="alert">
              <p>Unable to load your plan and usage.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-3">Try again</Button>
            </div> : data ? <>
              <div className="flex gap-2"><Badge>{data.tier}</Badge><Badge variant="outline">{data.status}</Badge></div>
              <p>Projects: {data.usage.projects.current} / {data.usage.projects.limit ?? "Unlimited"}</p>
              <p>Team members: {data.usage.users.current} / {data.usage.users.limit ?? "Unlimited"}</p>
            </> : null}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Existing external subscriptions are not canceled by this change. Contact your administrator for plan changes or billing questions.</p>
      <Button variant="outline" asChild><Link href="/projects">Back to projects</Link></Button>
    </main>
  );
}
