import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Calendar, User, Clock, Tag, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";

type BlogTag = {
  id: string;
  slug: string;
  name: string;
  postCount: number;
};

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
  relatedPosts?: BlogPost[];
  tags?: BlogTag[];
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
};

export default function ResourceDetailPage() {
  const [, params] = useRoute("/resources/:slug");
  const { toast } = useToast();
  const slug = params?.slug;

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts/slug", slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/slug/${slug}`);
      if (!response.ok) throw new Error("Blog post not found");
      return response.json();
    },
    enabled: !!slug,
  });

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title || "DoorSurvey Pro Resource";
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        toast({
          title: "Shared Successfully",
          description: "The article has been shared.",
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Article link copied to clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-4 sm:mb-6" />
          <Skeleton className="h-48 sm:h-64 w-full mb-4 sm:mb-6" />
          <Skeleton className="h-8 sm:h-12 w-3/4 mb-3 sm:mb-4" />
          <Skeleton className="h-5 sm:h-6 w-1/2 mb-6 sm:mb-8" />
          <Skeleton className="h-72 sm:h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Article Not Found</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">The requested article could not be found.</p>
          <Link href="/resources">
            <Button size="sm" className="text-xs sm:text-sm" data-testid="button-back-not-found">
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
              Back to Resources
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Generate structured data for blog post
  const articleStructuredData = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage ? (post.featuredImage.startsWith('http') ? post.featuredImage : `${window.location.origin}${post.featuredImage}`) : undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.publishedAt || post.createdAt,
    author: post.authorName ? {
      '@type': 'Person',
      name: post.authorName,
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'DoorSurvey Pro',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': window.location.href,
    },
    keywords: post.tags?.map(t => t.name).join(', '),
    articleSection: post.categoryName || undefined,
    wordCount: post.content ? post.content.split(/\s+/).length : undefined,
  } : undefined;

  return (
    <div className="min-h-screen bg-background">
      {post && (
        <SEOHead
          title={post.metaTitle || post.title}
          description={post.metaDescription || post.excerpt}
          canonical={post.canonicalUrl || `${window.location.origin}/resources/${post.slug}`}
          ogType="article"
          ogImage={post.ogImage || post.featuredImage || undefined}
          twitterCard="summary_large_image"
          keywords={post.tags?.map(t => t.name)}
          structuredData={articleStructuredData}
        />
      )}
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 max-w-4xl">
        <Link href="/resources">
          <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 text-xs sm:text-sm" data-testid="button-back">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
            Back to Resources
          </Button>
        </Link>

        {post.featuredImage && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 sm:mb-8">
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover"
              data-testid="image-cover"
            />
          </div>
        )}

        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap min-w-0">
            {post.categoryName && (
              <Badge variant="outline" className="shrink-0 text-xs" data-testid="badge-category">{post.categoryName}</Badge>
            )}
            {post.isFeatured === "yes" && (
              <Badge className="bg-primary shrink-0 text-xs" data-testid="badge-featured">Featured</Badge>
            )}
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
              {post.publishedAt && (
                <span className="flex items-center gap-1" data-testid="text-published-date">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">{format(new Date(post.publishedAt), "MMMM d, yyyy")}</span>
                  <span className="sm:hidden">{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                </span>
              )}
              {post.readingTime && (
                <span className="flex items-center gap-1" data-testid="text-reading-time">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span>{post.readingTime} min</span>
                </span>
              )}
              <span className="flex items-center gap-1" data-testid="text-view-count">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>{post.viewCount}</span>
              </span>
            </div>
          </div>
          
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-3 sm:mb-4" data-testid="heading-title">{post.title}</h1>
          
          {post.authorName && (
            <div className="flex items-center gap-2 text-sm sm:text-lg text-muted-foreground mb-3 sm:mb-4 min-w-0" data-testid="text-author">
              <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{post.authorName}</span>
            </div>
          )}

          {post.excerpt && (
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-3 sm:mb-4" data-testid="text-excerpt">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShare(); }}
              className="text-xs sm:text-sm"
              data-testid="button-share"
            >
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
              Share
            </Button>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
              {post.tags.map((tag) => (
                <Badge 
                  key={tag.id} 
                  variant="secondary"
                  className="shrink-0 text-xs"
                  data-testid={`badge-tag-${tag.slug}`}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator className="mb-4 sm:mb-8" />

        <div className="prose dark:prose-invert max-w-none mb-8 sm:mb-12 prose-sm sm:prose-base">
          <div 
            dangerouslySetInnerHTML={{ __html: post.content }} 
            data-testid="content-article"
          />
        </div>

        {post.relatedPosts && post.relatedPosts.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <Separator className="mb-4 sm:mb-8" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-6" data-testid="heading-related">Related Articles</h2>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {post.relatedPosts.map((related) => (
                <Link key={related.id} href={`/resources/${related.slug}`}>
                  <Card className="hover-elevate transition-all h-full" data-testid={`card-related-${related.id}`}>
                    {related.featuredImage && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img 
                          src={related.featuredImage} 
                          alt={related.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
                        {related.categoryName && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {related.categoryName}
                          </Badge>
                        )}
                        {related.publishedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(related.publishedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-sm sm:text-base md:text-lg" data-testid={`title-related-${related.id}`}>
                        {related.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {related.excerpt}
                      </p>
                      {related.readingTime && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 sm:mt-3">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{related.readingTime} min read</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
