import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Edit, Trash2, Eye, ExternalLink, Copy, TrendingUp, Users, MousePointerClick, BarChart3, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type MarketingLandingPage = {
  id: string;
  slug: string;
  title: string;
  headline: string;
  subheadline: string | null;
  heroImageUrl: string | null;
  content: string | null;
  targetAudience: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  views: number | null;
  leads: number | null;
  conversionRate: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  organizationId: string | null;
};

export default function Marketing() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("landing-pages");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<MarketingLandingPage | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    headline: "",
    subheadline: "",
    heroImageUrl: "",
    content: "",
    targetAudience: "",
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
  });

  // Analytics date range state
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch landing pages
  const { data: landingPages = [], isLoading } = useQuery<MarketingLandingPage[]>({
    queryKey: ["/api/marketing/landing-pages"],
  });

  // Fetch analytics summary
  const { data: analyticsSummary, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/marketing/analytics/summary", dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from,
        endDate: dateRange.to,
      });
      const res = await fetch(`/api/marketing/analytics/summary?${params}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Create landing page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/marketing/landing-pages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/landing-pages"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Landing page created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update landing page mutation
  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/marketing/landing-pages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/landing-pages"] });
      setEditingPage(null);
      resetForm();
      toast({
        title: "Success",
        description: "Landing page updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete landing page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/marketing/landing-pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/landing-pages"] });
      toast({
        title: "Success",
        description: "Landing page deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      slug: "",
      title: "",
      headline: "",
      subheadline: "",
      heroImageUrl: "",
      content: "",
      targetAudience: "",
      status: "draft",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPage) {
      updatePageMutation.mutate({ id: editingPage.id, data: formData });
    } else {
      createPageMutation.mutate(formData);
    }
  };

  const handleEdit = (page: MarketingLandingPage) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      headline: page.headline,
      subheadline: page.subheadline || "",
      heroImageUrl: page.heroImageUrl || "",
      content: page.content || "",
      targetAudience: page.targetAudience || "",
      status: page.status,
      seoTitle: page.seoTitle || "",
      seoDescription: page.seoDescription || "",
      seoKeywords: page.seoKeywords || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this landing page?")) {
      deletePageMutation.mutate(id);
    }
  };

  const copyLandingPageUrl = (slug: string) => {
    const url = `${window.location.origin}/l/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Landing page URL copied to clipboard",
    });
  };

  const togglePublishStatus = (page: MarketingLandingPage) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    updatePageMutation.mutate({
      id: page.id,
      data: { status: newStatus },
    });
  };

  // Calculate total stats
  const totalViews = landingPages.reduce((sum, page) => sum + (page.views || 0), 0);
  const totalLeads = landingPages.reduce((sum, page) => sum + (page.leads || 0), 0);
  const avgConversionRate = landingPages.length > 0
    ? landingPages.reduce((sum, page) => sum + (page.conversionRate || 0), 0) / landingPages.length
    : 0;

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto" data-testid="page-marketing">
      <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="text-page-title">Marketing & Lead Generation</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1" data-testid="text-page-description">
            Manage landing pages, capture leads, and track campaign performance
          </p>
        </div>

        <Dialog open={isCreateDialogOpen || !!editingPage} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingPage(null);
            resetForm();
          } else {
            setIsCreateDialogOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs sm:text-sm" data-testid="button-create-landing-page">
              <Plus className="mr-1 sm:mr-2 h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">New Landing Page</span>
              <span className="sm:hidden">New Page</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingPage ? "Edit Landing Page" : "Create Landing Page"}
              </DialogTitle>
              <DialogDescription>
                {editingPage
                  ? "Update the landing page details below"
                  : "Create a new public landing page to capture leads"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="seo">SEO & Content</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="join-our-sales-team"
                      required
                      data-testid="input-slug"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Will be accessible at: /l/{formData.slug || "your-slug"}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="title">Page Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Join Our Door Sales Team"
                      required
                      data-testid="input-title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="headline">Main Headline *</Label>
                    <Input
                      id="headline"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      placeholder="Become a Top-Earning Door Sales Professional"
                      required
                      data-testid="input-headline"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subheadline">Subheadline</Label>
                    <Input
                      id="subheadline"
                      value={formData.subheadline}
                      onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })}
                      placeholder="Competitive commissions, comprehensive training, and unlimited earning potential"
                      data-testid="input-subheadline"
                    />
                  </div>

                  <div>
                    <Label htmlFor="heroImageUrl">Hero Image URL</Label>
                    <Input
                      id="heroImageUrl"
                      value={formData.heroImageUrl}
                      onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                      placeholder="https://example.com/hero-image.jpg"
                      data-testid="input-hero-image"
                    />
                  </div>

                  <div>
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Select
                      value={formData.targetAudience}
                      onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                    >
                      <SelectTrigger data-testid="select-target-audience">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="independent-sales-reps">Independent Sales Reps</SelectItem>
                        <SelectItem value="distribution-partners">Distribution Partners</SelectItem>
                        <SelectItem value="manufacturer-reps">Manufacturer Reps</SelectItem>
                        <SelectItem value="regional-sales-managers">Regional Sales Managers</SelectItem>
                        <SelectItem value="new-sales-recruits">New Sales Recruits</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="seoTitle">SEO Title</Label>
                    <Input
                      id="seoTitle"
                      value={formData.seoTitle}
                      onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                      placeholder="Join Our Door Sales Team | Top Commissions & Training"
                      data-testid="input-seo-title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="seoDescription">SEO Description</Label>
                    <Textarea
                      id="seoDescription"
                      value={formData.seoDescription}
                      onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                      placeholder="Become a door sales professional with industry-leading commissions, comprehensive training, and unlimited growth potential. Join our winning team today."
                      rows={3}
                      data-testid="input-seo-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="seoKeywords">SEO Keywords (comma-separated)</Label>
                    <Input
                      id="seoKeywords"
                      value={formData.seoKeywords}
                      onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                      placeholder="door sales jobs, commercial door sales, sales representative, commission-based sales"
                      data-testid="input-seo-keywords"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Page Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Additional content text goes here. Supports basic formatting with line breaks."
                      rows={10}
                      data-testid="input-content"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Plain text only. HTML tags will be displayed as text for security.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingPage(null);
                    resetForm();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPageMutation.isPending || updatePageMutation.isPending}
                  data-testid="button-save"
                >
                  {(createPageMutation.isPending || updatePageMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPage ? "Update" : "Create"} Landing Page
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card data-testid="card-stats-views">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-views">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all landing pages</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-leads">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-leads">{totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Marketing leads captured</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-conversion">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg. Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold" data-testid="text-avg-conversion">
              {(avgConversionRate * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Views to leads</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="landing-pages" data-testid="tab-landing-pages">Landing Pages</TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="landing-pages" className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" data-testid="spinner-loading" />
            </div>
          ) : landingPages.length === 0 ? (
            <Card>
              <CardContent className="p-4 sm:p-6 text-center py-8 sm:py-12">
                <MousePointerClick className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2" data-testid="text-empty-title">No Landing Pages Yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6" data-testid="text-empty-description">
                  Create your first landing page to start capturing leads
                </p>
                <Button size="sm" className="text-xs sm:text-sm" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
                  <Plus className="mr-1 sm:mr-2 h-4 w-4 shrink-0" />
                  Create Landing Page
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {landingPages.map((page) => (
                <Card key={page.id} className="hover-elevate" data-testid={`card-landing-page-${page.id}`}>
                  <CardHeader className="p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <CardTitle className="text-base sm:text-xl" data-testid={`text-page-title-${page.id}`}>{page.title}</CardTitle>
                          <Badge
                            variant={page.status === "published" ? "default" : "secondary"}
                            className="shrink-0"
                            data-testid={`badge-status-${page.id}`}
                          >
                            {page.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs sm:text-sm" data-testid={`text-page-headline-${page.id}`}>{page.headline}</CardDescription>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                          <span className="font-mono bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs" data-testid={`text-slug-${page.id}`}>
                            /l/{page.slug}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(page)}
                          data-testid={`button-edit-${page.id}`}
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLandingPageUrl(page.slug)}
                          data-testid={`button-copy-url-${page.id}`}
                        >
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          data-testid={`button-view-${page.id}`}
                        >
                          <a href={`/l/${page.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant={page.status === "published" ? "secondary" : "default"}
                          onClick={() => togglePublishStatus(page)}
                          data-testid={`button-toggle-publish-${page.id}`}
                        >
                          {page.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(page.id)}
                          disabled={deletePageMutation.isPending}
                          data-testid={`button-delete-${page.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Views</p>
                        <p className="font-semibold text-lg" data-testid={`text-views-${page.id}`}>
                          {(page.views || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Leads</p>
                        <p className="font-semibold text-lg" data-testid={`text-leads-${page.id}`}>
                          {(page.leads || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversion</p>
                        <p className="font-semibold text-lg" data-testid={`text-conversion-${page.id}`}>
                          {((page.conversionRate || 0) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    {page.createdAt && (
                      <p className="text-xs text-muted-foreground mt-4">
                        Created {formatDistanceToNow(new Date(page.createdAt))} ago
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Marketing Leads</h3>
              <p className="text-muted-foreground">
                Lead management interface coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            {/* Date Range Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="date-from">From</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="date-to">To</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                      data-testid="input-date-to"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDateRange({
                        from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                        to: format(new Date(), 'yyyy-MM-dd'),
                      })}
                      data-testid="button-last-7-days"
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDateRange({
                        from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                        to: format(new Date(), 'yyyy-MM-dd'),
                      })}
                      data-testid="button-last-30-days"
                    >
                      Last 30 Days
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoadingAnalytics ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="spinner-loading-analytics" />
              </div>
            ) : analyticsSummary ? (
              <>
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-total-views">
                        {(analyticsSummary.totalPageViews || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across all landing pages
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-total-leads">
                        {(analyticsSummary.totalLeads || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Captured via forms
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-conversion-rate">
                        {((analyticsSummary.conversionRate || 0) * 100).toFixed(2)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leads per view
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Form Submissions</CardTitle>
                      <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-form-submissions">
                        {(analyticsSummary.totalFormSubmissions || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total form attempts
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                {analyticsSummary.dailyTrends && analyticsSummary.dailyTrends.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Daily Trends
                      </CardTitle>
                      <CardDescription>Page views and leads over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsSummary.dailyTrends}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => format(new Date(value), 'MMM d')}
                              className="text-xs"
                            />
                            <YAxis className="text-xs" />
                            <Tooltip
                              labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="views"
                              stroke="hsl(var(--primary))"
                              name="Page Views"
                              strokeWidth={2}
                            />
                            <Line
                              type="monotone"
                              dataKey="leads"
                              stroke="hsl(var(--chart-2))"
                              name="Leads"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Landing Page Performance */}
                {analyticsSummary.landingPageBreakdown && analyticsSummary.landingPageBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Landing Page Performance</CardTitle>
                      <CardDescription>Performance by landing page</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsSummary.landingPageBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="slug" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
                            <Bar dataKey="leads" fill="hsl(var(--chart-2))" name="Leads" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Traffic Sources */}
                {analyticsSummary.trafficSources && Object.keys(analyticsSummary.trafficSources).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Traffic Sources</CardTitle>
                      <CardDescription>Where your visitors are coming from</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analyticsSummary.trafficSources)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .map(([source, count]: [string, any]) => {
                            const total = Object.values(analyticsSummary.trafficSources).reduce((a: any, b: any) => a + b, 0) as number;
                            const percentage = ((count / total) * 100).toFixed(1);
                            
                            return (
                              <div key={source} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm" data-testid={`traffic-source-${source.toLowerCase()}`}>
                                      {source}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {count} ({percentage}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Campaign ROI */}
                {analyticsSummary.campaigns && analyticsSummary.campaigns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Campaign ROI</CardTitle>
                      <CardDescription>Return on investment for marketing campaigns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold" data-testid="metric-campaign-spend">
                              ${(analyticsSummary.totalCampaignSpend || 0).toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold" data-testid="metric-campaign-revenue">
                              ${(analyticsSummary.totalCampaignRevenue || 0).toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Average ROI</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600" data-testid="metric-average-roi">
                              {(analyticsSummary.averageCampaignROI || 0).toFixed(0)}%
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        {analyticsSummary.campaigns.map((campaign: any, index: number) => (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold" data-testid={`campaign-name-${index}`}>
                                  {campaign.name}
                                </h4>
                                <Badge
                                  variant={campaign.roi > 100 ? "default" : "secondary"}
                                  data-testid={`campaign-roi-badge-${index}`}
                                >
                                  ROI: {campaign.roi}%
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Spent</p>
                                  <p className="font-semibold" data-testid={`campaign-spent-${index}`}>
                                    ${campaign.spent.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Revenue</p>
                                  <p className="font-semibold" data-testid={`campaign-revenue-${index}`}>
                                    ${campaign.revenue.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Profit</p>
                                  <p className="font-semibold text-green-600" data-testid={`campaign-profit-${index}`}>
                                    ${(campaign.revenue - campaign.spent).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Leads</p>
                                  <p className="font-semibold" data-testid={`campaign-leads-${index}`}>
                                    {campaign.leads}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                  <p className="text-muted-foreground">
                    No analytics data available for the selected date range
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
