import { useState, useRef, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, X } from "lucide-react";
import { MentionAutocomplete } from "./mention-autocomplete";
import type { ProjectComment } from "@shared/schemas/portal.schema";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment too long"),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentFormProps {
  currentUser?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  replyingTo?: ProjectComment;
  autoFocus?: boolean;
}

export function CommentForm({
  currentUser,
  onSubmit,
  onCancel,
  placeholder = "Add a comment... Use @username to mention team members",
  submitLabel = "Send",
  initialValue = "",
  replyingTo,
  autoFocus = false,
}: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: initialValue,
    },
  });

  const handleSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data.content);
      form.reset({ content: "" });
    } catch (error) {
      // handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  };

  // Handle mention selection from autocomplete
  const handleMentionSelect = (
    user: { id: string; displayName: string },
    startPos: number,
    endPos: number
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentContent = form.getValues("content");
    
    // Replace @query with @displayName
    const beforeMention = currentContent.substring(0, startPos);
    const afterMention = currentContent.substring(endPos);
    const mentionText = `@${user.displayName}`;
    const newContent = beforeMention + mentionText + " " + afterMention;

    // Update form value
    form.setValue("content", newContent);

    // Set cursor position after the mention
    setTimeout(() => {
      const cursorPos = startPos + mentionText.length + 1;
      textarea.setSelectionRange(cursorPos, cursorPos);
      textarea.focus();
    }, 0);
  };

  // Get user initials
  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ""}${currentUser.lastName?.[0] || ""}`.toUpperCase() ||
      currentUser.email?.[0]?.toUpperCase() ||
      "?"
    : "?";

  return (
    <div className="flex gap-3" data-testid="comment-form">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={currentUser?.profileImageUrl || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        {replyingTo && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Replying to{" "}
              <span className="font-medium">
                {replyingTo.authorName || "Unknown User"}
              </span>
            </span>
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onCancel}
                aria-label="Cancel reply"
                data-testid="button-cancel-reply"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        {...field}
                        ref={textareaRef}
                        placeholder={placeholder}
                        className="resize-none min-h-[80px]"
                        onKeyDown={handleKeyDown}
                        autoFocus={autoFocus}
                        data-testid="textarea-comment"
                      />
                      <MentionAutocomplete
                        textareaRef={textareaRef}
                        onSelect={handleMentionSelect}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press Cmd/Ctrl + Enter to send
              </p>
              <div className="flex gap-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !form.formState.isValid}
                  data-testid="button-submit-comment"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      {submitLabel}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
