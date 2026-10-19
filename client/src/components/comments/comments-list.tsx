import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, ChevronDown } from "lucide-react";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjectComment } from "@shared/schemas/portal.schema";

interface CommentsListProps {
  projectId: string;
  currentUser?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  maxDepth?: number;
  className?: string;
}

type CommentWithAuthor = ProjectComment & {
  author: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
  mentions: Array<{ id: string; mentionedUserId: string }>;
};

type CommentNode = CommentWithAuthor & { replies: CommentNode[] };

export function CommentsList({
  projectId,
  currentUser,
  maxDepth = 3,
  className,
}: CommentsListProps) {
  const { toast } = useToast();
  const [replyingTo, setReplyingTo] = useState<CommentWithAuthor | null>(null);
  const [editingComment, setEditingComment] = useState<CommentWithAuthor | null>(null);
  const limit = 20;

  // Fetch comments using infinite query for proper pagination
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/projects", projectId, "comments"],
    queryFn: async ({ pageParam = 0 }) => {
      // Backend uses offset-based pagination
      const response = await fetch(
        `/api/projects/${projectId}/comments?limit=${limit}&offset=${pageParam}`
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json() as Promise<{
        comments: CommentWithAuthor[];
        total: number;
      }>;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Calculate total loaded comments across all pages
      const loadedCount = allPages.reduce((sum, page) => sum + page.comments.length, 0);
      // Return next offset if there are more comments to load
      return loadedCount < lastPage.total ? loadedCount : undefined;
    },
    initialPageParam: 0,
  });

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: async (params: {
      content: string;
      parentCommentId?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/comments",
        {
          organizationId: "", // Will be filled by backend from session
          projectId,
          content: params.content,
          parentCommentId: params.parentCommentId,
        }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      setReplyingTo(null);
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to post comment",
        description: error.message,
      });
    },
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; content: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/comments/${params.id}`,
        { content: params.content }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comments"] });
      setEditingComment(null);
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update comment",
        description: error.message,
      });
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comments"] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete comment",
        description: error.message,
      });
    },
  });

  // Flatten all pages and build comment tree structure
  const commentTree = useMemo(() => {
    if (!data?.pages) return [];

    // Flatten all comments from all pages
    const allComments = data.pages.flatMap((page) => page.comments);

    const commentMap = new Map<string, CommentNode>();
    const rootComments: CommentNode[] = [];

    // Initialize all comments with empty replies array
    allComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Build tree structure
    allComments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        } else {
          // Parent not in loaded pages, treat as root
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  }, [data?.pages]);

  // Get total count from first page
  const totalCount = data?.pages[0]?.total || 0;
  const loadedCount = data?.pages.reduce((sum, page) => sum + page.comments.length, 0) || 0;

  const handleCreateComment = async (content: string) => {
    await createMutation.mutateAsync({
      content,
      parentCommentId: replyingTo?.id,
    });
  };

  const handleUpdateComment = async (content: string) => {
    if (!editingComment) return;
    await updateMutation.mutateAsync({
      id: editingComment.id,
      content,
    });
  };

  const renderComment = (comment: CommentNode, depth = 0) => {
    const isEditing = editingComment?.id === comment.id;

    return (
      <div key={comment.id}>
        {isEditing ? (
          <div className="mb-4">
            <CommentForm
              currentUser={currentUser}
              onSubmit={handleUpdateComment}
              onCancel={() => setEditingComment(null)}
              placeholder="Edit your comment..."
              submitLabel="Save"
              initialValue={comment.content}
              autoFocus
            />
          </div>
        ) : (
          <div className="mb-4">
            <CommentItem
              comment={comment}
              currentUserId={currentUser?.id}
              depth={depth}
              maxDepth={maxDepth}
              onReply={() => setReplyingTo(comment)}
              onEdit={() => setEditingComment(comment)}
              onDelete={(id) => deleteMutation.mutate(id)}
              showActions
            />

            {replyingTo?.id === comment.id && (
              <div className="ml-11 mt-3">
                <CommentForm
                  currentUser={currentUser}
                  onSubmit={handleCreateComment}
                  onCancel={() => setReplyingTo(null)}
                  placeholder="Write a reply..."
                  submitLabel="Reply"
                  replyingTo={comment as ProjectComment}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div>
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load comments. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className} data-testid="comments-list">
      {/* Comment form for new root-level comments */}
      {currentUser && !editingComment && !replyingTo && (
        <div className="mb-6">
          <CommentForm
            currentUser={currentUser}
            onSubmit={handleCreateComment}
            placeholder="Add a comment... Use @username to mention team members"
            submitLabel="Post Comment"
          />
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : commentTree.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to comment!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {commentTree.map((comment) => renderComment(comment))}

          {/* Load more button */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="button-load-more"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {isFetchingNextPage ? "Loading..." : "Load more comments"}
              </Button>
            </div>
          )}

          {/* Comments count */}
          <div className="pt-4 text-xs text-muted-foreground text-center">
            Showing {loadedCount} of {totalCount} comments
          </div>
        </div>
      )}
    </div>
  );
}
