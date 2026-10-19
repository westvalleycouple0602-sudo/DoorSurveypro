import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search, BookOpen, HelpCircle, MessageSquare, Video,
  FileText, Lightbulb, Zap, DoorOpen, Camera, Key,
  FileSpreadsheet, Users, Shield, Building2, Calculator,
  BarChart3, Settings, Mail, ArrowRight, ExternalLink,
  Rocket, Target, TrendingUp, CheckCircle2, Clock
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface ArticleItem {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  href: string;
  icon: React.ReactNode;
  featured?: boolean;
}

const faqCategories = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "projects", label: "Projects & Surveys", icon: DoorOpen },
  { id: "hardware", label: "Hardware Catalog", icon: Key },
  { id: "compliance", label: "Compliance & Codes", icon: Shield },
  { id: "reports", label: "Reports & Export", icon: FileSpreadsheet },
  { id: "billing", label: "Billing & Plans", icon: Calculator },
  { id: "team", label: "Team & Collaboration", icon: Users },
  { id: "integrations", label: "Integrations", icon: Settings },
];

const faqs: FAQItem[] = [
  {
    id: "faq-1",
    question: "How do I create my first door survey project?",
    answer: "To create your first project, click the 'New Project' button on your dashboard or navigate to Projects > New Project. Enter the project name, select the customer, add the building address, and specify the building type (hospital, office, hotel, etc.). You can then start adding door openings to your project using our guided survey wizard.",
    category: "getting-started",
    tags: ["project", "new", "start", "create"],
  },
  {
    id: "faq-2",
    question: "What information do I need to capture for each door opening?",
    answer: "For each door opening, you'll typically capture: door dimensions (width, height, thickness), frame type and material, fire rating (if applicable), hardware requirements (locksets, closers, hinges, etc.), ADA compliance status, existing conditions, and photos. Our survey wizard guides you through each step to ensure nothing is missed.",
    category: "projects",
    tags: ["door", "survey", "opening", "data", "capture"],
  },
  {
    id: "faq-3",
    question: "How does the AI-powered compliance validation work?",
    answer: "Our compliance engine automatically validates your door specifications against building codes including IBC, NFPA, and ADA requirements. As you enter door data, the system checks for compliance issues in real-time and provides specific code citations when problems are detected. You'll see green checkmarks for compliant specs and warnings for any issues that need attention.",
    category: "compliance",
    tags: ["ai", "compliance", "validation", "codes", "ada", "ibc", "nfpa"],
  },
  {
    id: "faq-4",
    question: "Can I import my existing hardware catalog?",
    answer: "Yes! DoorSurvey Pro supports importing hardware catalogs from Excel/CSV files. Navigate to Catalog > Import and upload your file. Map your columns to our standard fields, and the system will import your products with pricing, specifications, and compatibility data. We also provide pre-loaded catalogs from major manufacturers.",
    category: "hardware",
    tags: ["import", "catalog", "excel", "csv", "hardware"],
  },
  {
    id: "faq-5",
    question: "How do I generate a hardware schedule for my project?",
    answer: "Once you've completed your door surveys, go to Reports > Hardware Schedule. Select the project and choose your output format (Excel, PDF, or both). You can customize which columns to include, group doors by floor or area, and add your company branding. The schedule includes all hardware items with quantities, pricing, and specifications.",
    category: "reports",
    tags: ["report", "schedule", "hardware", "export", "excel", "pdf"],
  },
  {
    id: "faq-6",
    question: "What's included in each subscription plan?",
    answer: "We offer three plans: Starter (up to 3 users, 25 projects), Professional (up to 10 users, unlimited projects, advanced features), and Enterprise (unlimited users, custom integrations, dedicated support). All plans include the core survey features, hardware catalog, and basic reports. See our pricing page for detailed feature comparison.",
    category: "billing",
    tags: ["pricing", "plan", "subscription", "features"],
  },
  {
    id: "faq-7",
    question: "How do I invite team members to my organization?",
    answer: "Go to Settings > Team and click 'Invite Member'. Enter their email address and select their role (Admin, Project Manager, Surveyor, or Viewer). They'll receive an email invitation to join your organization. You can manage permissions and remove members from the same page.",
    category: "team",
    tags: ["team", "invite", "members", "collaboration", "permissions"],
  },
  {
    id: "faq-8",
    question: "Can I use DoorSurvey Pro offline in the field?",
    answer: "Yes! Our mobile app supports offline mode for field surveys. Download the project data before going on-site, capture door information and photos offline, and sync when you're back online. All data is stored locally and automatically uploaded when connectivity is restored.",
    category: "projects",
    tags: ["offline", "mobile", "field", "sync"],
  },
  {
    id: "faq-9",
    question: "How does the master key system module work?",
    answer: "Our master key system module allows you to design hierarchical keying systems (GMK, MK, SMK, Change keys). Create a key hierarchy, assign keys to doors, and visualize the entire system. The module includes manufacturer presets for Schlage, Kwikset, Sargent, and others, with automatic bitting code validation.",
    category: "hardware",
    tags: ["master key", "keying", "hierarchy", "gmk", "mk"],
  },
  {
    id: "faq-10",
    question: "What integrations are available?",
    answer: "DoorSurvey Pro integrates with popular tools including HubSpot CRM for customer management, Stripe for payments, DocuSign for electronic signatures, and Google/Microsoft calendars for scheduling. We also offer webhook support for custom integrations with your existing systems.",
    category: "integrations",
    tags: ["integration", "hubspot", "stripe", "docusign", "api", "webhook"],
  },
  {
    id: "faq-11",
    question: "How do I handle fire-rated door requirements?",
    answer: "When surveying a fire-rated opening, select the appropriate fire rating (20, 45, 60, or 90 minutes) in the survey wizard. The system automatically validates that all specified hardware is fire-rated compatible and meets the required standards. Fire-rated doors are flagged in reports with their rating and certification requirements.",
    category: "compliance",
    tags: ["fire rated", "fire door", "certification", "rating"],
  },
  {
    id: "faq-12",
    question: "Can I customize the quote templates?",
    answer: "Yes! Go to Settings > Templates to customize your quote appearance. Add your company logo, adjust colors to match your branding, configure which fields to display, and set up custom terms and conditions. You can create multiple templates for different project types or customers.",
    category: "reports",
    tags: ["template", "quote", "branding", "customize"],
  },
  {
    id: "faq-13",
    question: "How do I track project changes and revisions?",
    answer: "DoorSurvey Pro automatically tracks all changes to projects, quotes, and door specifications. View the revision history from any project or quote page. You can compare versions side-by-side, see who made changes and when, and restore previous versions if needed.",
    category: "projects",
    tags: ["revision", "history", "changes", "version", "track"],
  },
  {
    id: "faq-14",
    question: "What photo annotation features are available?",
    answer: "Our photo annotation tool lets you mark up images with measurement lines, text labels, arrows, and shapes. Highlight hardware locations, note existing conditions, or document deficiencies. Annotated photos are saved with door records and included in reports.",
    category: "projects",
    tags: ["photo", "annotation", "image", "markup", "documentation"],
  },
  {
    id: "faq-15",
    question: "How does the procurement workflow work?",
    answer: "After a quote is approved, convert it to a purchase order with one click. The system generates manufacturer-specific order forms, tracks shipment status, and manages receiving. You can configure vendor accounts with pricing tiers and preferred supplier rankings.",
    category: "hardware",
    tags: ["procurement", "purchase order", "vendor", "order"],
  },
  {
    id: "faq-16",
    question: "Can I set up automated email notifications?",
    answer: "Yes! Configure notifications in Settings > Notifications. Choose which events trigger emails: quote approvals, project milestones, assignment changes, etc. Set up different notification preferences for each team member and customer communications.",
    category: "team",
    tags: ["notification", "email", "automation", "alerts"],
  },
  {
    id: "faq-17",
    question: "How do I use the AR measurement feature?",
    answer: "Open the AR Measurements tool on a compatible mobile device. Point your camera at the door and the system uses LiDAR (if available) or computer vision to capture dimensions. Measurements are automatically added to the door record with high accuracy for most standard openings.",
    category: "projects",
    tags: ["ar", "measurement", "lidar", "mobile", "dimensions"],
  },
  {
    id: "faq-18",
    question: "What reporting options are available for analytics?",
    answer: "Our analytics dashboard provides insights on quote conversion rates, project timelines, hardware trends, and team performance. Export reports in Excel or PDF format. Schedule automatic report generation and delivery to stakeholders on a daily, weekly, or monthly basis.",
    category: "reports",
    tags: ["analytics", "dashboard", "metrics", "performance"],
  },
  {
    id: "faq-19",
    question: "How do I cancel or change my subscription?",
    answer: "Go to Settings > Billing to manage your subscription. You can upgrade, downgrade, or cancel at any time. Changes take effect at the next billing cycle. If you cancel, you'll retain access until the end of your current billing period and can export all your data.",
    category: "billing",
    tags: ["cancel", "subscription", "billing", "change plan"],
  },
  {
    id: "faq-20",
    question: "Is my data secure and backed up?",
    answer: "Yes! All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We perform automated backups every hour and store them in geographically distributed data centers. You also have access to database rollback features and can export your complete data at any time.",
    category: "getting-started",
    tags: ["security", "backup", "data", "privacy", "encryption"],
  },
];

const articles: ArticleItem[] = [
  {
    id: "article-1",
    title: "Quick Start Guide: Your First Door Survey",
    description: "Learn how to create a project, capture door data, and generate your first hardware schedule in under 30 minutes.",
    category: "getting-started",
    readTime: "10 min",
    href: "/help/guides/quick-start",
    icon: <Rocket className="h-5 w-5" />,
    featured: true,
  },
  {
    id: "article-2",
    title: "Mastering the Survey Wizard",
    description: "Comprehensive guide to using all features of our 9-step guided survey process for efficient data capture.",
    category: "projects",
    readTime: "15 min",
    href: "/help/guides/survey-wizard",
    icon: <DoorOpen className="h-5 w-5" />,
    featured: true,
  },
  {
    id: "article-3",
    title: "Building Code Compliance Made Easy",
    description: "Understand how our AI validates ADA, IBC, and NFPA requirements automatically during surveys.",
    category: "compliance",
    readTime: "12 min",
    href: "/help/guides/compliance",
    icon: <Shield className="h-5 w-5" />,
    featured: true,
  },
  {
    id: "article-4",
    title: "Hardware Catalog Best Practices",
    description: "Tips for organizing, importing, and maintaining your hardware catalog for accurate pricing and specifications.",
    category: "hardware",
    readTime: "8 min",
    href: "/help/guides/catalog",
    icon: <Key className="h-5 w-5" />,
  },
  {
    id: "article-5",
    title: "Creating Professional Reports",
    description: "Learn to generate customized hardware schedules, quotes, and project reports that impress clients.",
    category: "reports",
    readTime: "10 min",
    href: "/help/guides/reports",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: "article-6",
    title: "Team Collaboration Workflows",
    description: "Set up efficient workflows for surveyors, project managers, and estimators working together.",
    category: "team",
    readTime: "8 min",
    href: "/help/guides/team",
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "article-7",
    title: "Master Key System Design",
    description: "Complete guide to designing and documenting master key systems with our specialized module.",
    category: "hardware",
    readTime: "20 min",
    href: "/help/guides/master-keying",
    icon: <Key className="h-5 w-5" />,
  },
  {
    id: "article-8",
    title: "Mobile Field Surveys",
    description: "Best practices for conducting efficient surveys using our mobile app, including offline mode.",
    category: "projects",
    readTime: "12 min",
    href: "/help/guides/mobile",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    id: "article-9",
    title: "Integrating with Your CRM",
    description: "Connect DoorSurvey Pro with HubSpot and other CRMs for seamless customer management.",
    category: "integrations",
    readTime: "15 min",
    href: "/help/guides/crm-integration",
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: "article-10",
    title: "Understanding Analytics & Metrics",
    description: "Leverage business intelligence features to track performance and identify growth opportunities.",
    category: "reports",
    readTime: "10 min",
    href: "/help/guides/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

const quickLinks = [
  { label: "Create New Project", href: "/projects/new", icon: <DoorOpen className="h-4 w-4" /> },
  { label: "Hardware Catalog", href: "/catalog", icon: <Key className="h-4 w-4" /> },
  { label: "Generate Report", href: "/reports", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { label: "Team Settings", href: "/team", icon: <Users className="h-4 w-4" /> },
  { label: "Billing & Plans", href: "/billing", icon: <Calculator className="h-4 w-4" /> },
  { label: "Contact Support", href: "mailto:support@doorsurvey.pro", icon: <Mail className="h-4 w-4" /> },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesSearch = searchQuery === "" || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch = searchQuery === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const featuredArticles = articles.filter(a => a.featured);

  return (
    <div className="container max-w-6xl py-8 space-y-8" data-testid="help-center-page">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold" data-testid="text-help-title">Help Center</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions, learn best practices, and get the most out of DoorSurvey Pro.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search help articles and FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
            data-testid="input-help-search"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {quickLinks.map((link) => (
          <Link key={link.label} href={link.href}>
            <Button
              variant="outline"
              className="w-full h-auto py-3 flex flex-col items-center gap-2"
              data-testid={`button-quicklink-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {link.icon}
              <span className="text-xs text-center">{link.label}</span>
            </Button>
          </Link>
        ))}
      </div>

      {/* Featured Articles */}
      {!searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Featured Guides</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredArticles.map((article) => (
              <Card key={article.id} className="hover-elevate" data-testid={`card-article-${article.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      {article.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1">{article.title}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {article.readTime} read
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{article.description}</p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={article.href}>
                      Read Guide
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="faq" data-testid="tab-faq">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="guides" data-testid="tab-guides">
            <BookOpen className="h-4 w-4 mr-2" />
            Guides & Articles
          </TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Video className="h-4 w-4 mr-2" />
            Video Tutorials
          </TabsTrigger>
          <TabsTrigger value="contact" data-testid="tab-contact">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Support
          </TabsTrigger>
        </TabsList>

        {/* Category Filter */}
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 pb-4">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCategory("all"); }}
              data-testid="button-category-all"
            >
              All Topics
            </Button>
            {faqCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCategory(cat.id); }}
                className="whitespace-nowrap"
                data-testid={`button-category-${cat.id}`}
              >
                <cat.icon className="h-4 w-4 mr-2" />
                {cat.label}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No FAQs Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem 
                  key={faq.id} 
                  value={faq.id}
                  className="border rounded-lg px-4"
                  data-testid={`accordion-faq-${index}`}
                >
                  <AccordionTrigger className="text-left hover:no-underline py-4" data-testid={`button-accordion-faq-${index}`}>
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="font-medium" data-testid={`text-faq-question-${index}`}>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="pl-8 space-y-3">
                      <p className="text-muted-foreground">{faq.answer}</p>
                      <div className="flex flex-wrap gap-1">
                        {faq.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-4">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Guides Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover-elevate" data-testid={`card-guide-${article.id}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        {article.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-1">{article.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {faqCategories.find(c => c.id === article.category)?.label || article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.readTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{article.description}</p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={article.href}>
                        Read Article
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Video Tutorials Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're creating a library of video tutorials to help you get the most out of DoorSurvey Pro.
                Subscribe to our newsletter to be notified when they're available.
              </p>
              <Button className="mt-4" variant="outline" data-testid="button-subscribe-videos">
                <Mail className="h-4 w-4 mr-2" />
                Subscribe for Updates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat with AI Assistant
                </CardTitle>
                <CardDescription>
                  Get instant answers from our AI-powered assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Our AI assistant can help with common questions, guide you through features, and troubleshoot issues.
                </p>
                <Button className="w-full" asChild data-testid="button-contact-chat">
                  <Link href="/ai-chat">
                    <Zap className="h-4 w-4 mr-2" />
                    Start Chat
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Support
                </CardTitle>
                <CardDescription>
                  Contact our support team for personalized help
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  For complex issues or account-specific questions, reach out to our support team. We typically respond within 24 hours.
                </p>
                <Button className="w-full" variant="outline" asChild data-testid="button-contact-email">
                  <a href="mailto:support@doorsurvey.pro">
                    <Mail className="h-4 w-4 mr-2" />
                    support@doorsurvey.pro
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Submit a Bug Report
                </CardTitle>
                <CardDescription>
                  Found a problem? Help us fix it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Report bugs or issues with detailed information to help our development team resolve them quickly.
                </p>
                <Button className="w-full" variant="outline" asChild data-testid="button-contact-bug">
                  <Link href="/bug-report">
                    <FileText className="h-4 w-4 mr-2" />
                    Report a Bug
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Feature Requests
                </CardTitle>
                <CardDescription>
                  Share your ideas for new features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  We love hearing from users! Share your ideas for new features or improvements on our roadmap.
                </p>
                <Button className="w-full" variant="outline" asChild data-testid="button-contact-feature">
                  <Link href="/roadmap">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    View Roadmap
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Still Need Help?</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Our team is here to help you succeed. Don't hesitate to reach out if you can't find what you're looking for.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button asChild data-testid="button-footer-chat">
              <Link href="/ai-chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat with AI
              </Link>
            </Button>
            <Button variant="outline" asChild data-testid="button-footer-email">
              <a href="mailto:support@doorsurvey.pro">
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
