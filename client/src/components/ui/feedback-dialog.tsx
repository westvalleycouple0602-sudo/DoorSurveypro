/**
 * General Feedback Dialog
 * 
 * Collects structured user feedback with category selection
 * and optional screenshot/context
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, Lightbulb, Bug, ThumbsUp, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const feedbackSchema = z.object({
  category: z.enum(["general", "feature", "bug", "praise", "concern"]),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

export type FeedbackData = z.infer<typeof feedbackSchema>;

export interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FeedbackData) => void | Promise<void>;
  defaultCategory?: FeedbackData["category"];
  defaultSubject?: string;
  captureContext?: boolean;
}

const FEEDBACK_CATEGORIES = [
  { value: "general", label: "General Feedback", icon: MessageSquare, color: "text-blue-500" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-yellow-500" },
  { value: "bug", label: "Report a Bug", icon: Bug, color: "text-destructive" },
  { value: "praise", label: "Share Praise", icon: ThumbsUp, color: "text-emerald-500" },
  { value: "concern", label: "Report Concern", icon: AlertTriangle, color: "text-orange-500" },
] as const;

export function FeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultCategory = "general",
  defaultSubject = "",
  captureContext = true,
}: FeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: defaultCategory,
      subject: defaultSubject,
      message: "",
      email: "",
      url: captureContext ? window.location.href : "",
      userAgent: captureContext ? navigator.userAgent : "",
    },
  });

  const handleSubmit = async (data: FeedbackData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = form.watch("category");
  const CategoryIcon = FEEDBACK_CATEGORIES.find(c => c.value === selectedCategory)?.icon || MessageSquare;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[550px]"
        data-testid="dialog-feedback"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            We value your input. Let us know how we can improve or what you love about DoorSurvey Pro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    data-testid="select-feedback-category"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEEDBACK_CATEGORIES.map((cat) => (
                        <SelectItem 
                          key={cat.value} 
                          value={cat.value}
                          data-testid={`option-category-${cat.value}`}
                        >
                          <div className="flex items-center gap-2">
                            <cat.icon className={cn("h-4 w-4", cat.color)} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of your feedback"
                      data-testid="input-feedback-subject"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide as much detail as possible..."
                      rows={5}
                      data-testid="textarea-feedback-message"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com (if you'd like us to follow up)"
                      data-testid="input-feedback-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                data-testid="button-cancel-feedback"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit-feedback"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
