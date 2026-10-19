import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare,
  CheckCircle,
  Share2,
  FileText,
  Edit,
  Trash,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectActivity } from "@shared/schemas/portal.schema";

interface ActivityTimelineProps {
  projectId: string;
  activityTypes?: string[];
  limit?: number;
  className?: string;
}

type ActivityWithDetails = ProjectActivity & {
  actor: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
};

const activityIcons: Record<string, React.ReactNode> = {
  comment_added: <MessageSquare className="h-4 w-4" />,
  comment_edited: <Edit className="h-4 w-4" />,
  comment_deleted: <Trash className="h-4 w-4" />,
  approval_submitted: <CheckCircle className="h-4 w-4" />,
  portal_share_created: <Share2 className="h-4 w-4" />,
  quote_exported: <FileText className="h-4 w-4" />,
  project_created: <Activity className="h-4 w-4" />,
  project_updated: <Edit className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  comment_added: "text-blue-600 dark:text-blue-400",
  comment_edited: "text-amber-600 dark:text-amber-400",
  comment_deleted: "text-red-600 dark:text-red-400",
  approval_submitted: "text-green-600 dark:text-green-400",
  portal_share_created: "text-purple-600 dark:text-purple-400",
  quote_exported: "text-indigo-600 dark:text-indigo-400",
  project_created: "text-emerald-600 dark:text-emerald-400",
  project_updated: "text-orange-600 dark:text-orange-400",
};

export function ActivityTimeline({
  projectId,
  activityTypes,
  limit = 50,
  className,
}: ActivityTimelineProps) {
  const { data, isLoading, error } = useQuery<{
    activities: ActivityWithDetails[];
    total: number;
  }>({
    queryKey: [
      "/api/projects",
      projectId,
      "activities",
      { types: activityTypes, limit },
    ],
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load activity timeline. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data?.activities || data.activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="activity-timeline">
      {data.activities.map((activity, index) => {
        const isLast = index === data.activities.length - 1;
        const icon = activityIcons[activity.activityType] || (
          <Activity className="h-4 w-4" />
        );
        const iconColor =
          activityColors[activity.activityType] || "text-gray-600 dark:text-gray-400";

        // Get actor display name
        const actorName = activity.actor
          ? `${activity.actor.firstName || ""} ${activity.actor.lastName || ""}`.trim() ||
            activity.actor.email ||
            "Unknown User"
          : activity.actorName || "System";

        // Get initials for avatar fallback
        const initials = activity.actor
          ? `${activity.actor.firstName?.[0] || ""}${activity.actor.lastName?.[0] || ""}`.toUpperCase() ||
            activity.actor.email?.[0]?.toUpperCase() ||
            "?"
          : activity.actorName?.[0]?.toUpperCase() || "S";

        return (
          <div
            key={activity.id}
            className="flex gap-3 relative"
            data-testid={`activity-${activity.id}`}
          >
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
            )}

            {/* Avatar with activity icon */}
            <div className="relative">
              <Avatar className="h-8 w-8">
                {activity.actor?.profileImageUrl ? (
                  <AvatarImage src={activity.actor.profileImageUrl} />
                ) : null}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-border flex items-center justify-center",
                  iconColor
                )}
              >
                {icon}
              </div>
            </div>

            {/* Activity content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{actorName}</span>{" "}
                    <span className="text-muted-foreground">
                      {activity.description}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {activity.actorType !== "team" && (
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {activity.actorType}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata display */}
              {activity.metadata &&
                typeof activity.metadata === "object" &&
                Object.keys(activity.metadata as object).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                  </div>
                )}
            </div>
          </div>
        );
      })}

      {/* Total count */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        Showing {data.activities.length} of {data.total} activities
      </div>
    </div>
  );
}
