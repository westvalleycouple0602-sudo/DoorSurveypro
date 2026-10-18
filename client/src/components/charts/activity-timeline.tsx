import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FolderPlus, DoorOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  type: 'project_created' | 'opening_added';
  title: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card data-testid="card-activity-timeline">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-chart-3" />
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
        <CardDescription>Latest updates across your projects</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                data-testid={`activity-${index}`}
              >
                <div className="rounded-md bg-muted p-2 shrink-0">
                  {activity.type === 'project_created' ? (
                    <FolderPlus className="h-3 w-3 text-chart-1" />
                  ) : (
                    <DoorOpen className="h-3 w-3 text-chart-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
