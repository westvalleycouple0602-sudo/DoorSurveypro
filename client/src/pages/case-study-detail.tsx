import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Eye, Calendar, Building2, Quote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CaseStudy = {
  id: string;
  slug: string;
  customerName: string;
  customerCompany: string;
  customerTitle: string | null;
  customerPhoto: string | null;
  industry: string | null;
  title: string;
  subtitle: string | null;
  challenge: string;
  solution: string;
  results: string;
  testimonialQuote: string | null;
  metrics: Record<string, any> | null;
  heroImage: string | null;
  pdfUrl: string | null;
  isFeatured: string;
  viewCount: number;
  downloadCount: number;
  publishedAt: string | null;
  status: string;
  createdAt: string;
};

export default function CaseStudyDetailPage() {
  const [, params] = useRoute("/case-studies/:slug");
  const { toast } = useToast();
  const slug = params?.slug;

  const { data: caseStudy, isLoading } = useQuery<CaseStudy>({
    queryKey: ["/api/testimonials/case-studies/slug", slug],
    queryFn: async () => {
      const response = await fetch(`/api/testimonials/case-studies/slug/${slug}`);
      if (!response.ok) throw new Error("Case study not found");
      return response.json();
    },
    enabled: !!slug,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/testimonials/case-studies/${caseStudy?.id}/download`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      return response.json();
    },
    onSuccess: (data) => {
      window.open(data.pdfUrl, "_blank");
      toast({
        title: "PDF Downloaded",
        description: "The case study PDF has been opened in a new tab.",
      });
    },
    onError: () => {
      toast({
        title: "Download Failed",
        description: "Unable to download the PDF. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-4xl">
          <Skeleton className="h-6 sm:h-8 w-20 sm:w-24 mb-4 sm:mb-6" />
          <Skeleton className="h-48 sm:h-64 w-full mb-4 sm:mb-6" />
          <Skeleton className="h-8 sm:h-12 w-3/4 mb-3 sm:mb-4" />
          <Skeleton className="h-5 sm:h-6 w-1/2 mb-6 sm:mb-8" />
          <Skeleton className="h-32 sm:h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!caseStudy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-bold mb-2">Case Study Not Found</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">The requested case study could not be found.</p>
          <Link href="/case-studies">
            <Button size="sm" className="text-xs sm:text-sm">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              Back to Case Studies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-4xl">
        <Link href="/case-studies">
          <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 text-xs sm:text-sm" data-testid="button-back">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
            Back to Case Studies
          </Button>
        </Link>

        {caseStudy.heroImage && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6 sm:mb-8">
            <img 
              src={caseStudy.heroImage} 
              alt={caseStudy.title}
              className="w-full h-full object-cover"
              data-testid="image-cover"
            />
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            {caseStudy.industry && (
              <Badge variant="outline" className="text-xs shrink-0" data-testid="badge-industry">{caseStudy.industry}</Badge>
            )}
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {caseStudy.viewCount} views
              </span>
              {caseStudy.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  {new Date(caseStudy.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2 sm:mb-3" data-testid="heading-title">{caseStudy.title}</h1>
          <div className="flex items-center gap-2 text-sm sm:text-base lg:text-lg text-muted-foreground" data-testid="text-company">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            {caseStudy.customerCompany}
          </div>
        </div>

        {caseStudy.pdfUrl && (
          <Button 
            size="sm"
            onClick={() => downloadMutation.mutate()} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') downloadMutation.mutate(); }}
            disabled={downloadMutation.isPending}
            className="mb-6 sm:mb-8 text-xs sm:text-sm"
            data-testid="button-download-pdf"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
            Download PDF ({caseStudy.downloadCount} downloads)
          </Button>
        )}

        {caseStudy.subtitle && (
          <div className="prose dark:prose-invert max-w-none mb-6 sm:mb-8">
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground" data-testid="text-subtitle">{caseStudy.subtitle}</p>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">The Challenge</h2>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-challenge">
                {caseStudy.challenge}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">The Solution</h2>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-solution">
                {caseStudy.solution}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">The Results</h2>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-results">
                {caseStudy.results}
              </p>
            </CardContent>
          </Card>
        </div>

        {caseStudy.metrics && Object.keys(caseStudy.metrics).length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">Key Metrics</h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {Object.entries(caseStudy.metrics).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">{key}</div>
                    <div className="text-lg sm:text-2xl font-bold" data-testid={`metric-${key}`}>{String(value)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {caseStudy.testimonialQuote && (
          <div className="mb-6 sm:mb-8">
            <Separator className="mb-6 sm:mb-8" />
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 sm:p-6">
                <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-3 sm:mb-4 shrink-0" />
                <blockquote className="text-sm sm:text-base lg:text-lg italic mb-3 sm:mb-4" data-testid="text-quote">
                  "{caseStudy.testimonialQuote}"
                </blockquote>
                {caseStudy.customerName && (
                  <div className="text-xs sm:text-sm">
                    <div className="font-semibold" data-testid="text-author">{caseStudy.customerName}</div>
                    {caseStudy.customerTitle && (
                      <div className="text-muted-foreground" data-testid="text-role">{caseStudy.customerTitle}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center">
          <Link href="/case-studies">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              View More Case Studies
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
