import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search, Calendar, User, Clock, ArrowRight, Eye } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  authorId: string;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isFeatured: string;
  viewCount: number;
  readingTime: number | null;
  publishedAt: string | null;
  status: string;
  createdAt: string;
};

type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
  isActive: string;
};

export default function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: categories, isLoading: categoriesLoading } = useQuery<BlogCategory[]>({
    queryKey: ["/api/blog/categories"],
    queryFn: async () => {
      const response = await fetch("/api/blog/categories?isActive=true");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "published" });
      if (selectedCategory !== "all") {
        params.append("categoryId", selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      const response = await fetch(`/api/blog/posts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch blog posts");
      return response.json();
    },
  });

  const featuredPosts = posts?.filter(p => p.isFeatured === "yes") || [];
  const regularPosts = posts?.filter(p => p.isFeatured !== "yes") || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 max-w-7xl">
        <div className="mb-6 sm:mb-12 text-center">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-2 sm:mb-4" data-testid="heading-resources">
            Resources & Insights
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            Expert insights, industry trends, and best practices for commercial door surveying and estimation.
          </p>
        </div>

        <div className="mb-4 sm:mb-8 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all-categories">
                  All Categories
                </SelectItem>
                {categories?.map((category) => (
                  <SelectItem 
                    key={category.id} 
                    value={category.id} 
                    data-testid={`option-category-${category.slug}`}
                  >
                    {category.name} ({category.postCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {posts && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              {posts.length} {posts.length === 1 ? "article" : "articles"} found
            </div>
          )}
        </div>

        {postsLoading ? (
          <div className="space-y-4 sm:space-y-8">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 sm:h-64 w-full" />
                  <CardHeader className="p-3 sm:p-4">
                    <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                    <Skeleton className="h-20 sm:h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 sm:h-48 w-full" />
                  <CardHeader className="p-3 sm:p-4">
                    <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                    <Skeleton className="h-16 sm:h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-4 sm:space-y-8">
            {featuredPosts.length > 0 && (
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-6" data-testid="heading-featured">
                  Featured Articles
                </h2>
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  {featuredPosts.map((post) => (
                    <Card 
                      key={post.id} 
                      className="hover-elevate transition-all" 
                      data-testid={`card-featured-post-${post.id}`}
                    >
                      {post.featuredImage ? (
                        <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                          <img 
                            src={post.featuredImage} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                          <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-primary shrink-0" data-testid={`badge-featured-${post.id}`}>
                            <Star className="w-3 h-3 shrink-0 mr-1 fill-current" />
                            <span className="text-xs">Featured</span>
                          </Badge>
                        </div>
                      ) : (
                        <div className="p-2 sm:p-3 bg-muted/50 border-b">
                          <Badge className="bg-primary shrink-0" data-testid={`badge-featured-${post.id}`}>
                            <Star className="w-3 h-3 shrink-0 mr-1 fill-current" />
                            <span className="text-xs">Featured</span>
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
                          {post.categoryName && (
                            <Badge variant="outline" className="shrink-0 text-xs" data-testid={`badge-category-${post.id}`}>
                              {post.categoryName}
                            </Badge>
                          )}
                          {post.publishedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span className="truncate">{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-base sm:text-lg md:text-xl" data-testid={`title-post-${post.id}`}>
                          {post.title}
                        </CardTitle>
                        {post.authorName && (
                          <CardDescription className="flex items-center gap-1 text-xs sm:text-sm" data-testid={`author-${post.id}`}>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{post.authorName}</span>
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3" data-testid={`excerpt-${post.id}`}>
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between mb-3 sm:mb-4 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                            {post.readingTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{post.readingTime} min</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 shrink-0" />
                              <span>{post.viewCount}</span>
                            </span>
                          </div>
                        </div>
                        <Link href={`/resources/${post.slug}`}>
                          <Button variant="ghost" size="sm" className="w-full text-xs sm:text-sm" data-testid={`button-read-article-${post.id}`}>
                            Read Article
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 shrink-0" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {regularPosts.length > 0 && (
              <div>
                {featuredPosts.length > 0 && (
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-6" data-testid="heading-more-articles">
                    More Articles
                  </h2>
                )}
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {regularPosts.map((post) => (
                    <Card 
                      key={post.id} 
                      className="hover-elevate transition-all" 
                      data-testid={`card-post-${post.id}`}
                    >
                      {post.featuredImage && (
                        <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                          <img 
                            src={post.featuredImage} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
                          {post.categoryName && (
                            <Badge variant="outline" className="shrink-0 text-xs" data-testid={`badge-category-${post.id}`}>
                              {post.categoryName}
                            </Badge>
                          )}
                          {post.publishedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span className="truncate">{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-sm sm:text-base md:text-lg" data-testid={`title-post-${post.id}`}>
                          {post.title}
                        </CardTitle>
                        {post.authorName && (
                          <CardDescription className="flex items-center gap-1 text-xs" data-testid={`author-${post.id}`}>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{post.authorName}</span>
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2" data-testid={`excerpt-${post.id}`}>
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between mb-3 sm:mb-4 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                            {post.readingTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{post.readingTime}m</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 shrink-0" />
                              <span>{post.viewCount}</span>
                            </span>
                          </div>
                        </div>
                        <Link href={`/resources/${post.slug}`}>
                          <Button variant="ghost" size="sm" className="w-full text-xs sm:text-sm" data-testid={`button-read-article-${post.id}`}>
                            Read Article
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 shrink-0" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-no-results">
              No articles found {searchQuery ? `for "${searchQuery}"` : "for the selected category"}.
            </p>
            {(selectedCategory !== "all" || searchQuery) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }
                }}
                className="mt-3 sm:mt-4 text-xs sm:text-sm"
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
