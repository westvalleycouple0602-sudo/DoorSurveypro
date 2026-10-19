import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Calendar, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const scheduleSiteVisitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, "Date is required"),
  location: z.string().optional(),
});

type ScheduleSiteVisitForm = z.infer<typeof scheduleSiteVisitSchema>;

interface ScheduleSiteVisitDialogProps {
  projectId: string;
  projectName: string;
  projectLocation?: string | null;
}

export function ScheduleSiteVisitDialog({
  projectId,
  projectName,
  projectLocation,
}: ScheduleSiteVisitDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ScheduleSiteVisitForm>({
    resolver: zodResolver(scheduleSiteVisitSchema),
    defaultValues: {
      title: `Site Visit - ${projectName}`,
      description: "",
      scheduledDate: "",
      location: projectLocation || "",
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: ScheduleSiteVisitForm) => {
      return await apiRequest("POST", "/api/integrations/schedule-site-visit", {
        projectId,
        ...data,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [`/api/integrations/linked-resources`] });
      
      const { createdCount, message, results } = response as any;
      const hasErrors = results?.errors && results.errors.length > 0;
      
      toast({
        title: hasErrors ? "Partially Scheduled" : "Site Visit Scheduled",
        description: message,
        variant: hasErrors ? "default" : "default",
      });
      
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule site visit. Please try again.",
      });
    },
  });

  const onSubmit = (data: ScheduleSiteVisitForm) => {
    scheduleMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-schedule-site-visit">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Site Visit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Site Visit</DialogTitle>
          <DialogDescription>
            Create a Jira issue, calendar event, and Confluence page for this site visit.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Site Visit - Project Name"
                      data-testid="input-visit-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      data-testid="input-visit-date"
                    />
                  </FormControl>
                  <FormDescription>
                    Date and time for the site visit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={projectLocation || "Enter location"}
                      data-testid="input-visit-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Purpose of the site visit, items to review, etc."
                      rows={4}
                      data-testid="input-visit-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-visit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                data-testid="button-submit-visit"
              >
                {scheduleMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Schedule Visit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
