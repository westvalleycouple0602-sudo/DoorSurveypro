import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Reply, Edit2, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectComment } from "@shared/schemas/portal.schema";

interface CommentItemProps {
  comment: ProjectComment & {
    author: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
    } | null;
    mentions: Array<{ id: string; mentionedUserId: string }>;
  };
  currentUserId?: string;
  depth?: number;
  maxDepth?: number;
  onReply?: (comment: ProjectComment) => void;
  onEdit?: (comment: ProjectComment) => void;
  onDelete?: (commentId: string) => void;
  showActions?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  depth = 0,
  maxDepth = 3,
  onReply,
  onEdit,
  onDelete,
  showActions = true,
}: CommentItemProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const isAuthor = currentUserId === comment.authorId;
  const isTeamMember = comment.authorType === "team";
  const isDeleted = comment.isDeleted;

  // Get author display name
  const authorName = comment.author
    ? `${comment.author.firstName || ""} ${comment.author.lastName || ""}`.trim() ||
      comment.author.email ||
      "Unknown User"
    : comment.authorName || "Unknown User";

  // Get initials for avatar fallback
  const initials = comment.author
    ? `${comment.author.firstName?.[0] || ""}${comment.author.lastName?.[0] || ""}`.toUpperCase() ||
      comment.author.email?.[0]?.toUpperCase() ||
      "?"
    : comment.authorName?.[0]?.toUpperCase() || "?";

  // Highlight mentions in content
  const contentWithMentions = comment.contentHtml || comment.content;

  return (
    <div
      className={cn(
        "flex gap-3 group",
        depth > 0 && "ml-12 mt-3 border-l-2 border-border pl-3"
      )}
      data-testid={`comment-${comment.id}`}
    >
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={comment.author?.profileImageUrl || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm" data-testid={`comment-author-${comment.id}`}>
              {authorName}
            </span>
            {isTeamMember && (
              <Badge variant="outline" className="text-xs h-5">
                Team
              </Badge>
            )}
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {showActions && !isDeleted && (isAuthor || currentUserId) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Comment options"
                  data-testid={`button-comment-menu-${comment.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onReply && depth < maxDepth && (
                  <DropdownMenuItem onClick={() => onReply(comment)} data-testid={`button-reply-${comment.id}`}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {isAuthor && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(comment)} data-testid={`button-edit-${comment.id}`}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isAuthor && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    className="text-destructive"
                    data-testid={`button-delete-${comment.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-1">
          {isDeleted ? (
            <p className="text-sm text-muted-foreground italic">
              This comment has been deleted
            </p>
          ) : (
            <div
              className={cn(
                "text-sm prose prose-sm dark:prose-invert max-w-none",
                !showFullContent && "line-clamp-4"
              )}
              dangerouslySetInnerHTML={{ __html: contentWithMentions }}
              data-testid={`comment-content-${comment.id}`}
            />
          )}

          {!isDeleted && contentWithMentions.length > 200 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setShowFullContent(!showFullContent)}
              data-testid={`button-expand-${comment.id}`}
            >
              {showFullContent ? "Show less" : "Show more"}
            </Button>
          )}
        </div>

        {/* Attachments */}
        {!isDeleted && Array.isArray(comment.attachments) && (comment.attachments as unknown[]).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {((comment.attachments as unknown[]) as Array<{ url: string; filename: string }>).map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
                data-testid={`attachment-${comment.id}-${index}`}
              >
                <Check className="h-3 w-3" />
                {attachment.filename}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
