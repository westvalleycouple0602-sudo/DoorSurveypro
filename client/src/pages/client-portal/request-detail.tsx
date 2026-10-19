import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  MapPin,
  DoorOpen,
  MessageSquare,
  Send,
  Calendar,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { ServiceRequest, ServiceRequestItem, ServiceRequestNote } from "@shared/schemas/portal.schema";

interface PortalUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
}

interface ServiceRequestWithDetails extends ServiceRequest {
  items: ServiceRequestItem[];
  notes: ServiceRequestNote[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock; description: string }> = {
  new: { label: "Draft", variant: "outline", icon: FileText, description: "Request is being prepared" },
  submitted: { label: "Submitted", variant: "secondary", icon: Clock, description: "Waiting for review" },
  in_review: { label: "In Review", variant: "secondary", icon: Clock, description: "Our team is reviewing your request" },
  quoted: { label: "Quote Ready", variant: "default", icon: CheckCircle, description: "Quote is ready for your review" },
  scheduled: { label: "Visit Scheduled", variant: "default", icon: Calendar, description: "Site visit has been scheduled" },
  completed: { label: "Completed", variant: "default", icon: CheckCircle, description: "Request has been completed" },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertCircle, description: "Request was cancelled" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low Priority", className: "bg-gray-100 text-gray-700" },
  normal: { label: "Normal Priority", className: "bg-blue-100 text-blue-700" },
  high: { label: "High Priority", className: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700" },
};

export default function RequestDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/client-portal/requests/:id");
  const requestId = params?.id;
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");

  const { data: user, isLoading: userLoading, error: userError, isError: userIsError } = useQuery<PortalUser>({
    queryKey: ["/api/portal/auth/me"],
  });

  const { data: request, isLoading: requestLoading, error: requestError, isError: requestIsError } = useQuery<ServiceRequestWithDetails>({
    queryKey: ["/api/portal/requests", requestId],
    enabled: !!user && !!requestId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/portal/requests/${requestId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/requests", requestId] });
      setNewNote("");
      toast({ title: "Note added" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  if (userLoading || requestLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (userIsError || requestIsError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  if (userError || !user) {
    setLocation("/client-portal/login");
    return null;
  }

  if (requestError || !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Request not found or you don't have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConf = statusConfig[request.status] || statusConfig.new;
  const priorityConf = priorityConfig[request.priority] || priorityConfig.normal;
  const StatusIcon = statusConf.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/client-portal">
              <Button variant="ghost" size="icon" aria-label="Back to portal" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {request.requestNumber}
                </span>
                <Badge variant={statusConf.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConf.label}
                </Badge>
              </div>
              <h1 className="font-semibold truncate" data-testid="text-request-title">
                {request.title}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConf.variant === "default" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{statusConf.label}</p>
                <p className="text-sm text-muted-foreground">{statusConf.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium capitalize">{request.requestType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Priority</span>
                <p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConf.className}`}>
                    {priorityConf.label}
                  </span>
                </p>
              </div>
              {request.workOrderNumber && (
                <div>
                  <span className="text-muted-foreground">Work Order #</span>
                  <p className="font-medium">{request.workOrderNumber}</p>
                </div>
              )}
              {request.poNumber && (
                <div>
                  <span className="text-muted-foreground">PO #</span>
                  <p className="font-medium">{request.poNumber}</p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">Submitted</span>
                <p className="font-medium">
                  {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>

            {request.description && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="mt-1">{request.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(request.locationName || request.locationAddress) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {request.locationName && <p className="font-medium">{request.locationName}</p>}
              {request.locationAddress && <p className="text-muted-foreground">{request.locationAddress}</p>}
              {(request.buildingName || request.floorLevel) && (
                <p className="text-muted-foreground">
                  {[request.buildingName, request.floorLevel].filter(Boolean).join(", ")}
                </p>
              )}
              {request.accessNotes && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <span className="text-muted-foreground">Access Notes</span>
                    <p className="mt-1">{request.accessNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {request.items && request.items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                Doors ({request.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.doorLabel || `Door ${index + 1}`}</p>
                    {item.locationHint && (
                      <p className="text-sm text-muted-foreground">{item.locationHint}</p>
                    )}
                    {(item.doorType || item.approximateSize) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {[
                          item.doorType?.replace(/_/g, " "),
                          item.approximateSize
                        ].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {item.issueDescription && (
                      <p className="text-sm mt-2 bg-white dark:bg-gray-900 p-2 rounded border">
                        {item.issueDescription}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Notes & Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.notes && request.notes.length > 0 ? (
              <div className="space-y-3">
                {request.notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg ${
                      note.isPortalUser
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-gray-50 dark:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {note.authorName || "Team Member"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notes yet. Add a note below to communicate with our team.
              </p>
            )}

            <Separator />

            <div className="space-y-2">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-note"
              />
              <Button
                onClick={handleAddNote}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAddNote(); }}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="w-full"
                data-testid="button-add-note"
              >
                {addNoteMutation.isPending ? "Sending..." : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Add Note
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
