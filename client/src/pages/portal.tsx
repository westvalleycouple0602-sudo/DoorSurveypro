import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  Activity,
  Building2,
} from "lucide-react";
import { CommentsList } from "@/components/comments/comments-list";
import { ActivityTimeline } from "@/components/activity-timeline";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PortalShare } from "@shared/schemas/portal.schema";

type PortalShareWithDetails = PortalShare & {
  project: {
    id: string;
    name: string;
    projectNumber: string;
    location: string | null;
  };
  organization: {
    id: string;
    name: string;
  };
};

export default function Portal() {
  const { toast } = useToast();
  const [, params] = useRoute("/portal/:shareToken");
  const [, setLocation] = useLocation();
  const shareToken = params?.shareToken;

  const [selectedAction, setSelectedAction] = useState<"approve" | "reject" | "request_changes" | null>(null);
  const [feedback, setFeedback] = useState("");

  // Fetch portal share details
  const { data: portalShare, isLoading, error } = useQuery<PortalShareWithDetails>({
    queryKey: ["/api/portal", shareToken],
    enabled: !!shareToken,
  });

  // Submit approval mutation
  const approvalMutation = useMutation({
    mutationFn: async (params: {
      action: "approve" | "reject" | "request_changes";
      feedback?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/portal/${shareToken}/approval`,
        params
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", shareToken] });
      setSelectedAction(null);
      setFeedback("");
      toast({
        title: "Approval submitted",
        description: "Your response has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to submit approval",
        description: error.message,
      });
    },
  });

  if (!shareToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Invalid portal link. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !portalShare) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Failed to load portal. The link may have expired or been revoked."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if share is expired
  const isExpired = portalShare.expiresAt && new Date(portalShare.expiresAt) < new Date();
  const isInactive = !portalShare.isActive;
  const canApprove = portalShare.accessLevel === "approve" && !isExpired && !isInactive;
  const canComment = ["comment", "approve"].includes(portalShare.accessLevel) && !isExpired && !isInactive;

  // Get approval status badge
  const approvalStatusBadge = {
    pending: <Badge variant="outline" className="text-amber-600">Pending Review</Badge>,
    approved: <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>,
    rejected: <Badge variant="outline" className="text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>,
    changes_requested: <Badge variant="outline" className="text-orange-600"><Clock className="h-3 w-3 mr-1" />Changes Requested</Badge>,
  }[portalShare.approvalStatus || "pending"];

  const handleSubmitApproval = async () => {
    if (!selectedAction) return;

    await approvalMutation.mutateAsync({
      action: selectedAction,
      feedback: feedback.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground truncate">
                  {portalShare.organization.name}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="text-project-name">
                {portalShare.project.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Project #{portalShare.project.projectNumber}
                {portalShare.project.location && ` • ${portalShare.project.location}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              {approvalStatusBadge}
              {portalShare.expiresAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  {isExpired ? "Expired" : "Expires"}{" "}
                  {formatDistanceToNow(new Date(portalShare.expiresAt), {
                    addSuffix: true,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Expiration/Inactive warning */}
        {(isExpired || isInactive) && (
          <Alert className="mb-4 sm:mb-6">
            <AlertDescription className="text-xs sm:text-sm">
              {isExpired
                ? "This portal link has expired and is no longer accepting responses."
                : "This portal link has been deactivated."}
            </AlertDescription>
          </Alert>
        )}

        {/* Client info */}
        {portalShare.clientName && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Shared With</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 text-xs sm:text-sm">
              <div className="space-y-1">
                <p className="font-medium">{portalShare.clientName}</p>
                {portalShare.clientEmail && (
                  <p className="text-muted-foreground">{portalShare.clientEmail}</p>
                )}
                {portalShare.clientCompany && (
                  <p className="text-muted-foreground">{portalShare.clientCompany}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="quote" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quote" data-testid="tab-quote" className="text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">Quote</span>
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments" className="text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">Comments</span>
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity" className="text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Quote Tab */}
          <TabsContent value="quote" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Project Proposal</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Review the proposal details and provide your decision below
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Quote details will be displayed here. Integration with the quote export system is pending.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Approval actions */}
            {canApprove && portalShare.approvalStatus === "pending" && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Approval Decision</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Please review the proposal and select an action
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <Button
                      variant={selectedAction === "approve" ? "default" : "outline"}
                      onClick={() => setSelectedAction("approve")}
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid="button-approve"
                    >
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      Approve
                    </Button>
                    <Button
                      variant={selectedAction === "request_changes" ? "default" : "outline"}
                      onClick={() => setSelectedAction("request_changes")}
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid="button-request-changes"
                    >
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      Request Changes
                    </Button>
                    <Button
                      variant={selectedAction === "reject" ? "destructive" : "outline"}
                      onClick={() => setSelectedAction("reject")}
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid="button-reject"
                    >
                      <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      Reject
                    </Button>
                  </div>

                  {selectedAction && (
                    <>
                      <Separator />
                      <div className="space-y-2 sm:space-y-3">
                        <label className="text-xs sm:text-sm font-medium">
                          Feedback {selectedAction !== "approve" && "(Required)"}
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder={
                            selectedAction === "approve"
                              ? "Add any additional comments (optional)..."
                              : "Please provide details about the changes needed or reasons for rejection..."
                          }
                          className="w-full min-h-[80px] sm:min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm resize-none"
                          data-testid="textarea-feedback"
                        />
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs sm:text-sm"
                            onClick={() => {
                              setSelectedAction(null);
                              setFeedback("");
                            }}
                            data-testid="button-cancel-approval"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitApproval}
                            size="sm"
                            className="text-xs sm:text-sm"
                            disabled={
                              approvalMutation.isPending ||
                              (selectedAction !== "approve" && !feedback.trim())
                            }
                            data-testid="button-submit-approval"
                          >
                            {approvalMutation.isPending ? "Submitting..." : "Submit Decision"}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Previous approval feedback */}
            {portalShare.approvalFeedback && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Approval Feedback</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{portalShare.approvalFeedback}</p>
                  {portalShare.approvedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Submitted {formatDistanceToNow(new Date(portalShare.approvedAt), { addSuffix: true })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            {canComment ? (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Discussion</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Ask questions or share feedback with the team
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <CommentsList
                    projectId={portalShare.projectId}
                    currentUser={{
                      id: portalShare.id,
                      email: portalShare.clientEmail,
                      firstName: portalShare.clientName?.split(" ")[0] || null,
                      lastName: portalShare.clientName?.split(" ").slice(1).join(" ") || null,
                      profileImageUrl: null,
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                  Comments are not enabled for this portal link
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Activity Timeline</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Recent updates and changes to this project
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <ActivityTimeline projectId={portalShare.projectId} limit={50} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
