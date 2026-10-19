import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Download, Eye, ArrowRight } from "lucide-react";
import { useState } from "react";

type CaseStudy = {
  id: string;
  slug: string;
  customerName: string;
  customerCompany: string;
  customerTitle: string | null;
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

export default function CaseStudiesPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");

  const { data: caseStudies, isLoading } = useQuery<CaseStudy[]>({
    queryKey: ["/api/testimonials/case-studies", selectedIndustry],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "published" });
      if (selectedIndustry !== "all") {
        params.append("industry", selectedIndustry);
      }
      const response = await fetch(`/api/testimonials/case-studies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch case studies");
      return response.json();
    },
  });

  const industries = Array.from(new Set(caseStudies?.map(cs => cs.industry).filter((ind): ind is string => ind !== null) || []));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-7xl">
        <div className="mb-6 sm:mb-8 lg:mb-12 text-center">
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2 sm:mb-4" data-testid="heading-case-studies">Customer Success Stories</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
            Discover how leading organizations are transforming their door survey workflows with DoorSurvey Pro. 
            Real results from real customers.
          </p>
        </div>

        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-wrap justify-between items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[160px] sm:w-[200px] text-xs sm:text-sm" data-testid="select-industry">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all-industries">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry} data-testid={`option-industry-${industry}`}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {caseStudies && (
            <div className="text-xs sm:text-sm text-muted-foreground shrink-0">
              {caseStudies.length} {caseStudies.length === 1 ? "case study" : "case studies"}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-36 sm:h-48 w-full" />
                <CardHeader className="p-3 sm:p-4">
                  <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <Skeleton className="h-16 sm:h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : caseStudies && caseStudies.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {caseStudies.map((caseStudy) => (
              <Card key={caseStudy.id} className="hover-elevate transition-all" data-testid={`card-case-study-${caseStudy.id}`}>
                {caseStudy.heroImage ? (
                  <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                    <img 
                      src={caseStudy.heroImage} 
                      alt={caseStudy.title}
                      className="w-full h-full object-cover"
                    />
                    {caseStudy.isFeatured === "yes" && (
                      <Badge className="absolute top-2 right-2 bg-primary text-xs" data-testid={`badge-featured-${caseStudy.id}`}>
                        <Star className="w-3 h-3 mr-1 fill-current shrink-0" />
                        Featured
                      </Badge>
                    )}
                  </div>
                ) : caseStudy.isFeatured === "yes" ? (
                  <div className="p-2 sm:p-3 bg-muted/50 border-b">
                    <Badge className="bg-primary text-xs" data-testid={`badge-featured-${caseStudy.id}`}>
                      <Star className="w-3 h-3 mr-1 fill-current shrink-0" />
                      Featured
                    </Badge>
                  </div>
                ) : null}
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    {caseStudy.industry && (
                      <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-industry-${caseStudy.id}`}>{caseStudy.industry}</Badge>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 shrink-0" />
                        {caseStudy.viewCount}
                      </span>
                      {caseStudy.pdfUrl && (
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3 shrink-0" />
                          {caseStudy.downloadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base sm:text-xl" data-testid={`title-case-study-${caseStudy.id}`}>{caseStudy.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm" data-testid={`company-${caseStudy.id}`}>{caseStudy.customerCompany}</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3" data-testid={`summary-${caseStudy.id}`}>
                    {caseStudy.subtitle || caseStudy.challenge.substring(0, 150)}...
                  </p>
                  {caseStudy.metrics && Object.keys(caseStudy.metrics).length > 0 && (
                    <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-primary/5 rounded-md border border-primary/10">
                      <div className="text-xs font-medium text-primary mb-1">Key Results</div>
                      <div className="text-xs sm:text-sm font-semibold" data-testid={`metrics-${caseStudy.id}`}>
                        {Object.entries(caseStudy.metrics)[0][1] as string}
                      </div>
                    </div>
                  )}
                  <Link href={`/case-studies/${caseStudy.slug}`}>
                    <Button variant="ghost" size="sm" className="w-full text-xs sm:text-sm" data-testid={`button-read-more-${caseStudy.id}`}>
                      Read Full Story
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2 shrink-0" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground">No case studies found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
