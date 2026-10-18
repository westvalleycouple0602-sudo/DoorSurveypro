import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import {
  Search,
  Mail,
  Copy,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Users,
  Tag,
  Clock,
  FileText,
  ChevronLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  AlertTriangle
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  subject: string;
  htmlContent: string | null;
  markdownContent: string | null;
  plainTextContent: string | null;
  variables: string[] | null;
  allowedRoles: string[] | null;
  triggerType: string | null;
  lifecycleStage: string | null;
  isActive: boolean;
  isSystem: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateCategory {
  category: string;
  label: string;
  count: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  new_customer: <Users className="h-4 w-4" />,
  sales_followup: <ArrowUpRight className="h-4 w-4" />,
  scheduling: <Calendar className="h-4 w-4" />,
  proposal: <FileText className="h-4 w-4" />,
  prospecting: <Search className="h-4 w-4" />,
  reminder: <Clock className="h-4 w-4" />,
  customer_service: <Users className="h-4 w-4" />,
  procurement: <Tag className="h-4 w-4" />,
  closeout: <CheckCircle2 className="h-4 w-4" />,
  surveyor: <BarChart3 className="h-4 w-4" />,
  estimator: <FileText className="h-4 w-4" />,
  engineer: <Tag className="h-4 w-4" />,
  project_management: <Calendar className="h-4 w-4" />,
  onboarding: <Users className="h-4 w-4" />
};

const CATEGORY_COLORS: Record<string, string> = {
  new_customer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  sales_followup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  scheduling: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  proposal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  prospecting: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  reminder: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  customer_service: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  procurement: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  closeout: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  surveyor: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  estimator: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  engineer: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  project_management: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  onboarding: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400"
};

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    new_customer: "New Customer",
    sales_followup: "Sales Follow-up",
    scheduling: "Scheduling",
    proposal: "Proposals",
    prospecting: "Prospecting",
    reminder: "Reminders",
    customer_service: "Customer Service",
    procurement: "Procurement",
    closeout: "Closeout",
    surveyor: "Surveyor",
    estimator: "Estimator",
    engineer: "Engineer",
    project_management: "Project Management",
    onboarding: "Onboarding"
  };
  return labels[category] || category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function TemplateCard({ template, onPreview, onDuplicate }: {
  template: EmailTemplate;
  onPreview: (template: EmailTemplate) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <Card className="hover-elevate transition-all" data-testid={`template-card-${template.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate" data-testid={`template-name-${template.id}`}>
              {template.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {template.description || template.subject}
            </CardDescription>
          </div>
          <Badge 
            variant="secondary" 
            className={`shrink-0 ${CATEGORY_COLORS[template.category] || ""}`}
          >
            {CATEGORY_ICONS[template.category]}
            <span className="ml-1">{formatCategoryLabel(template.category)}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Subject: </span>
            <span className="truncate">{template.subject}</span>
          </div>
          
          {template.variables && template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.variables.slice(0, 4).map((variable, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {`{{${variable}}}`}
                </Badge>
              ))}
              {template.variables.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{template.variables.length - 4} more
                </Badge>
              )}
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {template.usageCount} uses
              </span>
              {template.isSystem && (
                <Badge variant="secondary" className="text-xs">System</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => onPreview(template)}
                aria-label="Preview template"
                data-testid={`button-preview-${template.id}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => onDuplicate(template.id)}
                aria-label="Duplicate template"
                data-testid={`button-duplicate-${template.id}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateListItem({ template, onPreview, onDuplicate }: {
  template: EmailTemplate;
  onPreview: (template: EmailTemplate) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div 
      className="flex items-center gap-4 p-4 border rounded-lg hover-elevate transition-all"
      data-testid={`template-row-${template.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" data-testid={`template-name-${template.id}`}>
            {template.name}
          </span>
          <Badge 
            variant="secondary" 
            className={`shrink-0 text-xs ${CATEGORY_COLORS[template.category] || ""}`}
          >
            {formatCategoryLabel(template.category)}
          </Badge>
          {template.isSystem && (
            <Badge variant="outline" className="text-xs">System</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-1">
          {template.subject}
        </p>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
        <span className="hidden sm:flex items-center gap-1">
          <Mail className="h-3.5 w-3.5" />
          {template.usageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onPreview(template)}
            aria-label="Preview template"
            data-testid={`button-preview-${template.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onDuplicate(template.id)}
            aria-label="Duplicate template"
            data-testid={`button-duplicate-${template.id}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplatePreviewDialog({ 
  template, 
  open, 
  onOpenChange 
}: { 
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {template.name}
          </DialogTitle>
          <DialogDescription>
            Template preview and details
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={CATEGORY_COLORS[template.category] || ""}>
              {CATEGORY_ICONS[template.category]}
              <span className="ml-1">{formatCategoryLabel(template.category)}</span>
            </Badge>
            {template.subcategory && (
              <Badge variant="outline">{template.subcategory}</Badge>
            )}
            {template.lifecycleStage && (
              <Badge variant="secondary">{template.lifecycleStage}</Badge>
            )}
            {template.isSystem && (
              <Badge variant="outline">System Template</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{template.subject}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Usage: </span>
              <span className="font-medium">{template.usageCount} times</span>
            </div>
          </div>

          {template.variables && template.variables.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Variables: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.variables.map((v, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {template.allowedRoles && template.allowedRoles.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Allowed Roles: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.allowedRoles.map((role, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {role.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "html" | "text")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="html" data-testid="tab-html-preview">HTML Preview</TabsTrigger>
              <TabsTrigger value="text" data-testid="tab-text-preview">Plain Text</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[300px] border rounded-lg">
                <div 
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: template.htmlContent || "" }}
                />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="text" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[300px] border rounded-lg">
                <pre className="p-4 text-sm whitespace-pre-wrap font-mono">
                  {template.markdownContent || template.plainTextContent || "No plain text content available"}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesSkeleton({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-3" />
              <div className="flex gap-1 mb-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Separator />
              <div className="flex justify-between mt-3">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="flex-1">
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-12" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading, isError: templatesIsError } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates", selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (search) {
        params.set("search", search);
      }
      params.set("activeOnly", "true");
      const res = await fetch(`/api/email-templates?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    }
  });

  // Fetch categories
  const { data: categories, isError: categoriesIsError } = useQuery<TemplateCategory[]>({
    queryKey: ["/api/email-templates/categories"]
  });

  // Usage tracking mutation
  const usageMutation = useMutation({
    mutationFn: async ({ templateId, action }: { templateId: string; action: string }) => {
      const res = await apiRequest("POST", `/api/email-templates/${templateId}/use`, {
        relatedEntityType: action,
        variablesUsed: {}
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", `/api/email-templates/${templateId}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Template duplicated",
        description: "The template has been duplicated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate template.",
        variant: "destructive"
      });
    }
  });

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
    // Track preview usage
    usageMutation.mutate({ templateId: template.id, action: "preview" });
  };

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id);
  };

  // Calculate stats
  const totalTemplates = templates?.length || 0;
  const totalUsage = templates?.reduce((sum, t) => sum + t.usageCount, 0) || 0;
  const systemTemplates = templates?.filter(t => t.isSystem).length || 0;
  const customTemplates = totalTemplates - systemTemplates;

  // Filter templates based on search
  const filteredTemplates = templates?.filter(template => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.subject.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const isError = templatesIsError || categoriesIsError;

  if (templatesLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <TemplatesSkeleton viewMode={viewMode} />
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="email-templates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage email templates for customer communication
          </p>
        </div>
        <Button data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Templates</CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-total-templates">
              {totalTemplates}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Usage</CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-total-usage">
              {totalUsage.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>System Templates</CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-system-templates">
              {systemTemplates}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Custom Templates</CardDescription>
            <CardTitle className="text-2xl" data-testid="stat-custom-templates">
              {customTemplates}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-templates"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.category} value={cat.category}>
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[cat.category]}
                  <span>{cat.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {cat.count}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label="List view"
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Templates */}
      {templatesLoading ? (
        <TemplatesSkeleton viewMode={viewMode} />
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {search || selectedCategory !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Create your first email template to get started."}
            </p>
            {!search && selectedCategory === "all" && (
              <Button className="mt-4" data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <TemplateListItem
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
