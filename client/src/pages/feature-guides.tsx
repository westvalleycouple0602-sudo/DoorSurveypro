import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DoorOpen, Camera, Key, Shield, FileSpreadsheet, 
  Users, BarChart3, Zap, Building2, Target,
  Clock, CheckCircle2, ArrowRight, Lightbulb,
  TrendingUp, DollarSign, Timer, Award, Sparkles,
  Layers, Network, Factory, Calculator
} from "lucide-react";

interface FeatureGuide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  benefits: {
    title: string;
    description: string;
    metric?: string;
  }[];
  useCases: {
    title: string;
    scenario: string;
    outcome: string;
  }[];
  tips: string[];
  href: string;
}

const categories = [
  { id: "all", label: "All Features" },
  { id: "survey", label: "Survey & Data Capture" },
  { id: "hardware", label: "Hardware & Catalog" },
  { id: "compliance", label: "Compliance" },
  { id: "reporting", label: "Reports & Analytics" },
  { id: "collaboration", label: "Team & Workflow" },
];

const featureGuides: FeatureGuide[] = [
  {
    id: "door-survey-wizard",
    title: "Door Survey Wizard",
    subtitle: "Guided 9-Step Data Capture",
    description: "Our intelligent survey wizard walks you through capturing all required door specifications systematically. From dimensions to fire ratings, hardware to ADA compliance—nothing gets missed.",
    icon: <DoorOpen className="h-6 w-6" />,
    category: "survey",
    benefits: [
      {
        title: "Eliminate Missed Details",
        description: "Structured workflow ensures every specification is captured the first time.",
        metric: "99% data completeness",
      },
      {
        title: "Faster Surveys",
        description: "Pre-populated defaults and smart suggestions speed up data entry.",
        metric: "40% faster than paper forms",
      },
      {
        title: "Consistent Quality",
        description: "Every surveyor follows the same process, ensuring consistent data quality.",
        metric: "Standardized across teams",
      },
    ],
    useCases: [
      {
        title: "Hospital Door Assessment",
        scenario: "Surveying 500+ doors in a hospital renovation project with strict fire-rating and accessibility requirements.",
        outcome: "Completed survey in 3 days instead of 2 weeks, with zero compliance gaps identified during engineering review.",
      },
      {
        title: "Multi-Building Office Campus",
        scenario: "Documenting door conditions across 12 buildings for a facilities management client.",
        outcome: "Created comprehensive door inventory with photos, enabling proactive maintenance planning.",
      },
    ],
    tips: [
      "Use the quick-capture mode for simple interior doors to save time",
      "Take photos at the start of each room to provide context",
      "Enable offline mode before entering areas with poor connectivity",
      "Use voice-to-text for notes when your hands are full",
    ],
    href: "/door-survey",
  },
  {
    id: "photo-annotation",
    title: "Photo Annotation",
    subtitle: "Visual Documentation Made Easy",
    description: "Capture photos during surveys and annotate them with measurements, condition notes, and hardware callouts. Photos are automatically organized by door and included in reports.",
    icon: <Camera className="h-6 w-6" />,
    category: "survey",
    benefits: [
      {
        title: "Clear Communication",
        description: "Annotated photos eliminate ambiguity when communicating with clients and installers.",
        metric: "80% fewer clarification calls",
      },
      {
        title: "Complete Documentation",
        description: "Visual evidence of existing conditions protects against disputes.",
        metric: "Reduced liability exposure",
      },
      {
        title: "Professional Proposals",
        description: "Include annotated photos in quotes to justify recommendations.",
        metric: "Higher quote acceptance rates",
      },
    ],
    useCases: [
      {
        title: "Retrofit Hardware Upgrade",
        scenario: "Documenting existing hardware conditions for an access control upgrade project.",
        outcome: "Clear photos with annotations helped identify incompatible hardware before ordering, avoiding costly returns.",
      },
      {
        title: "Insurance Claim Documentation",
        scenario: "Documenting damage to doors and frames after a building incident.",
        outcome: "Detailed annotated photos supported the insurance claim and expedited the payout.",
      },
    ],
    tips: [
      "Take overview shots first, then detailed close-ups",
      "Use consistent annotation colors: red for issues, green for compliant items",
      "Include a reference object (like a tape measure) for scale",
      "Annotate in real-time while on-site for the most accurate notes",
    ],
    href: "/ar-measurements",
  },
  {
    id: "hardware-catalog",
    title: "Hardware Catalog",
    subtitle: "Comprehensive Product Database",
    description: "Access a searchable database of thousands of door hardware products with specifications, pricing, and compatibility information. Import your own catalog or use our pre-loaded manufacturer data.",
    icon: <Key className="h-6 w-6" />,
    category: "hardware",
    benefits: [
      {
        title: "Accurate Pricing",
        description: "Up-to-date pricing from distributors ensures accurate quotes.",
        metric: "Real-time price updates",
      },
      {
        title: "Compatibility Checking",
        description: "System flags incompatible hardware combinations before quoting.",
        metric: "Zero compatibility errors",
      },
      {
        title: "Fast Product Selection",
        description: "Search and filter to find the right product in seconds.",
        metric: "90% faster than paper catalogs",
      },
    ],
    useCases: [
      {
        title: "Quick Quote Generation",
        scenario: "Client needs a quote for a 50-door renovation project within 24 hours.",
        outcome: "Used catalog's quick-select feature to specify all hardware and generate quote in under 2 hours.",
      },
      {
        title: "Product Substitution",
        scenario: "Specified product is discontinued; need to find equivalent replacement.",
        outcome: "Cross-reference feature identified compatible alternatives with matching specifications.",
      },
    ],
    tips: [
      "Set up favorite products for items you specify frequently",
      "Use the comparison feature to evaluate similar products side-by-side",
      "Import distributor price lists quarterly to keep pricing current",
      "Create product bundles for common door configurations",
    ],
    href: "/catalog",
  },
  {
    id: "master-keying",
    title: "Master Key System Design",
    subtitle: "Hierarchical Keying Visualization",
    description: "Design complex master key systems with our visual hierarchy builder. Create GMK, MK, SMK, and change key levels, assign doors, and generate key schedules with manufacturer-specific bitting codes.",
    icon: <Network className="h-6 w-6" />,
    category: "hardware",
    benefits: [
      {
        title: "Visual Planning",
        description: "Interactive tree visualization makes complex systems easy to understand.",
        metric: "50% fewer design errors",
      },
      {
        title: "Manufacturer Compliance",
        description: "Pre-loaded keyway rules ensure valid bitting assignments.",
        metric: "Automatic validation",
      },
      {
        title: "Secure Documentation",
        description: "Export with configurable redaction for customer vs. internal copies.",
        metric: "Security-conscious exports",
      },
    ],
    useCases: [
      {
        title: "University Campus Re-Key",
        scenario: "Designing a new master key system for 15 buildings with multiple access levels.",
        outcome: "Created hierarchical system with department-level sub-masters, reducing key count by 60%.",
      },
      {
        title: "Construction Key Management",
        scenario: "Managing temporary construction keys that must be defeated at project completion.",
        outcome: "Tracked all construction keys and generated defeat schedule for turnover.",
      },
    ],
    tips: [
      "Start with the highest level (GMK) and work down",
      "Group doors by access requirement, not physical location",
      "Use the door-key matrix to verify all assignments before ordering",
      "Export redacted schedules for building managers, full schedules for locksmith records",
    ],
    href: "/master-keying",
  },
  {
    id: "compliance-validation",
    title: "AI Compliance Validation",
    subtitle: "Automatic Code Verification",
    description: "Our AI engine validates door specifications against IBC, NFPA, and ADA requirements in real-time. Get instant feedback on compliance issues with specific code citations.",
    icon: <Shield className="h-6 w-6" />,
    category: "compliance",
    benefits: [
      {
        title: "Reduce Liability",
        description: "Catch compliance issues before installation prevents costly rework.",
        metric: "95% fewer code violations",
      },
      {
        title: "Build Confidence",
        description: "Automatic validation gives clients confidence in your specifications.",
        metric: "Backed by 95+ rules",
      },
      {
        title: "Stay Current",
        description: "Rules updated as codes change, so you're always compliant.",
        metric: "IBC, NFPA, ADA coverage",
      },
    ],
    useCases: [
      {
        title: "Fire-Rated Opening Verification",
        scenario: "Specifying hardware for a corridor with fire-rated door requirements.",
        outcome: "System flagged non-rated closer initially specified, preventing a code violation.",
      },
      {
        title: "ADA Accessibility Audit",
        scenario: "Reviewing existing doors for ADA compliance in an older building.",
        outcome: "Identified 23 doors requiring hardware modifications to meet current accessibility standards.",
      },
    ],
    tips: [
      "Run compliance checks before finalizing quotes",
      "Review the jurisdiction-specific overlays for your project location",
      "Use the explanation feature to understand why something is flagged",
      "Include compliance summaries in your proposals",
    ],
    href: "/compliance-validation",
  },
  {
    id: "reports-export",
    title: "Professional Reports",
    subtitle: "Customizable Export Options",
    description: "Generate polished hardware schedules, quotes, and project documentation. Export to Excel, PDF, or Word with your company branding and customizable layouts.",
    icon: <FileSpreadsheet className="h-6 w-6" />,
    category: "reporting",
    benefits: [
      {
        title: "Professional Presentation",
        description: "Branded reports that reflect your company's quality standards.",
        metric: "Custom logo & colors",
      },
      {
        title: "Client-Ready Deliverables",
        description: "Export directly to the format clients prefer.",
        metric: "Excel, PDF, Word support",
      },
      {
        title: "Consistent Formatting",
        description: "Templates ensure every report meets your standards.",
        metric: "Reusable templates",
      },
    ],
    useCases: [
      {
        title: "Bid Package Preparation",
        scenario: "Submitting a hardware bid for a $2M renovation project.",
        outcome: "Generated complete hardware schedule with alternates and allowances in under 30 minutes.",
      },
      {
        title: "Closeout Documentation",
        scenario: "Preparing O&M documentation for project turnover.",
        outcome: "Exported comprehensive door schedule with warranty information and maintenance notes.",
      },
    ],
    tips: [
      "Create separate templates for bids vs. submittals",
      "Use the alternate feature for good/better/best options",
      "Include photos in reports for high-value projects",
      "Set up automatic report scheduling for recurring deliverables",
    ],
    href: "/reports",
  },
  {
    id: "analytics-dashboard",
    title: "Business Analytics",
    subtitle: "Data-Driven Insights",
    description: "Track project metrics, quote conversion rates, and team performance. Visualize trends and identify opportunities to improve your business.",
    icon: <BarChart3 className="h-6 w-6" />,
    category: "reporting",
    benefits: [
      {
        title: "Quote Performance",
        description: "Track conversion rates to optimize your pricing and proposals.",
        metric: "Win rate tracking",
      },
      {
        title: "Team Productivity",
        description: "Monitor survey completion times and identify training opportunities.",
        metric: "Individual KPIs",
      },
      {
        title: "Revenue Insights",
        description: "Understand which project types and customers drive the most value.",
        metric: "Revenue by segment",
      },
    ],
    useCases: [
      {
        title: "Sales Pipeline Optimization",
        scenario: "Analyzing why quote conversion rates dropped last quarter.",
        outcome: "Identified that response time was the key factor; implemented 24-hour quote guarantee.",
      },
      {
        title: "Resource Planning",
        scenario: "Forecasting surveyor capacity for upcoming busy season.",
        outcome: "Historical data showed need for 2 additional surveyors during spring months.",
      },
    ],
    tips: [
      "Review dashboard weekly to catch trends early",
      "Set up alerts for key metrics falling outside targets",
      "Export monthly reports for stakeholder reviews",
      "Use comparative views to benchmark against prior periods",
    ],
    href: "/analytics",
  },
  {
    id: "team-collaboration",
    title: "Team Collaboration",
    subtitle: "Work Together Seamlessly",
    description: "Invite team members, assign roles, and collaborate on projects in real-time. Activity feeds keep everyone informed of changes and updates.",
    icon: <Users className="h-6 w-6" />,
    category: "collaboration",
    benefits: [
      {
        title: "Role-Based Access",
        description: "Control who can view, edit, and approve at each stage.",
        metric: "4 permission levels",
      },
      {
        title: "Real-Time Updates",
        description: "Changes sync instantly so everyone works with current data.",
        metric: "Live collaboration",
      },
      {
        title: "Activity Tracking",
        description: "See who made changes, when, and why for full accountability.",
        metric: "Complete audit trail",
      },
    ],
    useCases: [
      {
        title: "Distributed Survey Team",
        scenario: "Managing 5 surveyors working across different locations.",
        outcome: "Real-time visibility into survey progress; ability to reassign work as needed.",
      },
      {
        title: "PM-Estimator Workflow",
        scenario: "Project manager hands off completed surveys to estimating team.",
        outcome: "Automated notifications alert estimators when surveys are ready for pricing.",
      },
    ],
    tips: [
      "Use the assignment feature to prevent duplicate work",
      "Enable notifications for key project milestones",
      "Create project-specific channels for focused discussions",
      "Review activity logs during project retrospectives",
    ],
    href: "/team",
  },
];

export default function FeatureGuides() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredGuides = featureGuides.filter(
    (guide) => selectedCategory === "all" || guide.category === selectedCategory
  );

  return (
    <div className="container max-w-6xl py-8 space-y-8" data-testid="feature-guides-page">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold" data-testid="text-guides-title">Feature Guides</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to use DoorSurvey Pro's powerful features to transform your door surveying workflow. 
          Discover real-world benefits and best practices.
        </p>
      </div>

      {/* Category Tabs */}
      <ScrollArea className="w-full">
        <div className="flex items-center justify-center gap-2 pb-4">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCategory(cat.id); }}
              className="whitespace-nowrap"
              data-testid={`button-filter-${cat.id}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Feature Guides Grid */}
      <div className="space-y-12">
        {filteredGuides.map((guide) => (
          <Card key={guide.id} className="overflow-hidden" data-testid={`card-guide-${guide.id}`}>
            {/* Guide Header */}
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  {guide.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl" data-testid={`text-guide-title-${guide.id}`}>{guide.title}</CardTitle>
                    <Badge variant="secondary">{guide.subtitle}</Badge>
                  </div>
                  <CardDescription className="text-base">
                    {guide.description}
                  </CardDescription>
                </div>
                <Button asChild data-testid={`button-try-${guide.id}`}>
                  <Link href={guide.href}>
                    Try It
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <Tabs defaultValue="benefits" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="benefits" data-testid={`${guide.id}-tab-benefits`}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Benefits
                  </TabsTrigger>
                  <TabsTrigger value="use-cases" data-testid={`${guide.id}-tab-usecases`}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Use Cases
                  </TabsTrigger>
                  <TabsTrigger value="tips" data-testid={`${guide.id}-tab-tips`}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Pro Tips
                  </TabsTrigger>
                </TabsList>

                {/* Benefits Tab */}
                <TabsContent value="benefits">
                  <div className="grid sm:grid-cols-3 gap-4">
                    {guide.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border bg-card"
                        data-testid={`card-benefit-${guide.id}-${index}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <h4 className="font-semibold" data-testid={`text-benefit-${guide.id}-${index}`}>{benefit.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {benefit.description}
                        </p>
                        {benefit.metric && (
                          <Badge variant="secondary" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {benefit.metric}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Use Cases Tab */}
                <TabsContent value="use-cases">
                  <div className="grid sm:grid-cols-2 gap-6">
                    {guide.useCases.map((useCase, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border bg-card space-y-3"
                        data-testid={`card-usecase-${guide.id}-${index}`}
                      >
                        <h4 className="font-semibold flex items-center gap-2" data-testid={`text-usecase-title-${guide.id}-${index}`}>
                          <Building2 className="h-4 w-4 text-primary" />
                          {useCase.title}
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Scenario</span>
                            <p className="text-sm">{useCase.scenario}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Outcome</span>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {useCase.outcome}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Pro Tips Tab */}
                <TabsContent value="tips">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {guide.tips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        data-testid={`card-tip-${guide.id}-${index}`}
                      >
                        <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                          <Lightbulb className="h-4 w-4" />
                        </div>
                        <p className="text-sm" data-testid={`text-tip-${guide.id}-${index}`}>{tip}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Ready to Get Started?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first project and experience how DoorSurvey Pro transforms your workflow.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" asChild data-testid="button-create-project">
              <Link href="/projects/new">
                <DoorOpen className="h-5 w-5 mr-2" />
                Create First Project
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-view-help">
              <Link href="/help">
                <Lightbulb className="h-5 w-5 mr-2" />
                View Help Center
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
