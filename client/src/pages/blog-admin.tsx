import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Star,
  Tag,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ErrorState } from "@/components/error-state";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isFeatured: string;
  viewCount: number;
  readingTime: number | null;
  publishedAt: string | null;
  status: string;
  createdAt: string;
  tags?: BlogTag[];
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
};

type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
};

type BlogTag = {
  id: string;
  slug: string;
  name: string;
  postCount: number;
};

type PostFormData = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  categoryId: string;
  isFeatured: boolean;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  tags: string[];
};

export default function BlogAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Check if user is admin or owner
  const isAdmin = user && (user.role === "owner" || user.role === "admin");

  // Fetch posts
  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    error: postsErrorObj,
    refetch: refetchPosts,
  } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/admin/posts"],
    enabled: !!isAdmin,
  });

  // Fetch categories
  const { data: categories } = useQuery<BlogCategory[]>({
    queryKey: ["/api/blog/categories"],
    enabled: !!isAdmin,
  });

  // Fetch tags
  const { data: tags } = useQuery<BlogTag[]>({
    queryKey: ["/api/blog/tags"],
    enabled: !!isAdmin,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/blog/admin/posts/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({
        title: "Post deleted",
        description: "Blog post has been deleted successfully",
      });
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/blog/admin/posts/${id}/publish`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({
        title: "Post published",
        description: "Blog post is now live",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Publish failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6" data-testid="page-blog-admin-loading">
        <Card>
          <CardContent className="flex items-center justify-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6" data-testid="page-blog-admin-unauthorized">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              You need admin or owner privileges to manage blog posts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (postsError) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <ErrorState
          title="Failed to load blog posts"
          message={postsErrorObj instanceof Error ? postsErrorObj.message : "Unable to fetch blog posts"}
          error={postsErrorObj as Error}
          onRetry={refetchPosts}
          testId="error-posts"
        />
      </div>
    );
  }

  // Filter posts
  const filteredPosts = (posts || []).filter((post: BlogPost) => {
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && post.status === "published") ||
      (statusFilter === "draft" && post.status === "draft");
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-blog-admin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">
            Blog Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create and manage blog posts for content marketing
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-post" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
          New Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-posts">
              {posts?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-published-posts">
              {posts?.filter((p: BlogPost) => p.status === "published").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-draft-posts">
              {posts?.filter((p: BlogPost) => p.status === "draft").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-views">
              {posts?.reduce((sum: number, p: BlogPost) => sum + p.viewCount, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg">Blog Posts</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          {postsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 sm:h-16 w-full" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 sm:py-12" data-testid="text-no-posts">
              <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold">No posts found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first blog post to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Title</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Category</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Views</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post: BlogPost) => (
                    <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                      <TableCell className="py-2 sm:py-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-xs sm:text-sm truncate">{post.title}</span>
                            {post.isFeatured === "yes" && (
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {post.excerpt}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2 sm:py-3">
                        {post.categoryName && (
                          <Badge variant="outline" className="text-xs shrink-0">{post.categoryName}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2 sm:py-3">
                        <Badge
                          variant={post.status === "published" ? "default" : "secondary"}
                          data-testid={`badge-status-${post.id}`}
                          className="text-xs shrink-0"
                        >
                          {post.status === "published" ? (
                            <CheckCircle className="h-3 w-3 mr-1 shrink-0" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1 shrink-0" />
                          )}
                          <span className="hidden xs:inline">{post.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2 sm:py-3">
                        <div className="flex items-center gap-1 text-xs sm:text-sm">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
                          <span>{post.viewCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-2 sm:py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          {format(new Date(post.createdAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 sm:py-3">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {post.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => publishMutation.mutate(post.id)}
                              disabled={publishMutation.isPending}
                              data-testid={`button-publish-${post.id}`}
                              className="text-xs hidden sm:inline-flex"
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                              <span className="hidden md:inline">Publish</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPost(post)}
                            data-testid={`button-edit-${post.id}`}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(post.id)}
                            data-testid={`button-delete-${post.id}`}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <PostFormDialog
        open={isCreateDialogOpen || !!editingPost}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setEditingPost(null);
        }}
        post={editingPost}
        categories={categories}
        tags={tags}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post
              and remove it from the public site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PostFormDialog({
  open,
  onClose,
  post,
  categories,
  tags,
}: {
  open: boolean;
  onClose: () => void;
  post: BlogPost | null;
  categories: BlogCategory[] | undefined;
  tags: BlogTag[] | undefined;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    categoryId: "",
    isFeatured: false,
    status: "draft",
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    ogImage: "",
    tags: [],
  });

  // Update form when post changes (for editing)
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.featuredImage || "",
        categoryId: post.categoryId || "",
        isFeatured: post.isFeatured === "yes",
        status: post.status as "draft" | "published",
        metaTitle: post.metaTitle || "",
        metaDescription: post.metaDescription || "",
        canonicalUrl: post.canonicalUrl || "",
        ogImage: post.ogImage || "",
        tags: post.tags?.map((t: BlogTag) => t.id) || [],
      });
    } else {
      // Reset form when creating new post
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        featuredImage: "",
        categoryId: "",
        isFeatured: false,
        status: "draft",
        metaTitle: "",
        metaDescription: "",
        canonicalUrl: "",
        ogImage: "",
        tags: [],
      });
    }
  }, [post]);

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    }));
  };

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const response = await fetch(
        post ? `/api/blog/admin/posts/${post.id}` : "/api/blog/admin/posts",
        {
          method: post ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error("Failed to save post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({
        title: post ? "Post updated" : "Post created",
        description: post
          ? "Blog post has been updated successfully"
          : "New blog post has been created",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-post-form">
        <DialogHeader>
          <DialogTitle>{post ? "Edit Post" : "Create New Post"}</DialogTitle>
          <DialogDescription>
            {post ? "Update the blog post details" : "Create a new blog post for content marketing"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter post title"
                required
                data-testid="input-title"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="url-friendly-slug"
                required
                data-testid="input-slug"
              />
              <p className="text-sm text-muted-foreground mt-1">
                URL: /resources/{formData.slug || "your-slug"}
              </p>
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief summary (150-160 characters)"
                rows={2}
                required
                data-testid="input-excerpt"
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Post content (HTML supported)"
                rows={10}
                required
                data-testid="input-content"
              />
            </div>

            <div>
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input
                id="featuredImage"
                value={formData.featuredImage}
                onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-featured-image"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-4 w-4"
                data-testid="checkbox-featured"
              />
              <Label htmlFor="isFeatured" className="cursor-pointer">
                Featured Post
              </Label>
            </div>
          </div>

          {/* SEO Fields */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">SEO Optimization</h3>
            
            <div>
              <Label htmlFor="metaTitle">Meta Title (Optional)</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="Custom title for search engines"
                data-testid="input-meta-title"
              />
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Description (Optional)</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder="Custom description for search engines"
                rows={2}
                data-testid="input-meta-description"
              />
            </div>

            <div>
              <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
              <Input
                id="canonicalUrl"
                value={formData.canonicalUrl}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                placeholder="https://doorsurvey.com/blog/post-name"
                data-testid="input-canonical-url"
              />
            </div>

            <div>
              <Label htmlFor="ogImage">Open Graph Image (Optional)</Label>
              <Input
                id="ogImage"
                value={formData.ogImage}
                onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                placeholder="https://example.com/og-image.jpg"
                data-testid="input-og-image"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saveMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              onClick={() => setFormData({ ...formData, status: "draft" })}
              disabled={saveMutation.isPending}
              data-testid="button-save-draft"
            >
              <Clock className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              type="submit"
              onClick={() => setFormData({ ...formData, status: "published" })}
              disabled={saveMutation.isPending}
              data-testid="button-publish"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {post?.status === "published" ? "Update & Publish" : "Publish Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
