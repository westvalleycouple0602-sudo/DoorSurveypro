import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  DoorOpen, 
  Building2, 
  ClipboardCheck, 
  FileText,
  ShoppingCart,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";

export default function Demo() {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      // First, seed the demo data
      const response = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to seed demo data");
      }

      toast({
        title: "Demo environment ready!",
        description: "Redirecting to login with your demo account...",
      });

      // Redirect to login (session flag is set server-side)
      setTimeout(() => {
        window.location.href = "/sign-in?demo=1";
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to initialize demo",
        description: errorMessage.includes("database") || errorMessage.includes("seed")
          ? "Unable to set up demo environment. Please try again or contact support if this persists"
          : errorMessage.includes("organization") || errorMessage.includes("user")
          ? "Unable to create demo account. Please try again"
          : errorMessage || "Failed to load demo data. Please refresh and try again",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const features = [
    {
      icon: <DoorOpen className="h-8 w-8 text-blue-600" />,
      title: "11-Step Survey Wizard",
      description: "Guided workflow with LiDAR scanning, AR measurements, and AI-powered photo analysis for complete door specifications",
    },
    {
      icon: <Building2 className="h-8 w-8 text-blue-600" />,
      title: "95+ Compliance Rules",
      description: "Auto-validate against ADA, IBC, NFPA, ANSI/BHMA, and 35 building codes with AI-powered code interpretation",
    },
    {
      icon: <ClipboardCheck className="h-8 w-8 text-blue-600" />,
      title: "Hardware Catalog (10K+ Products)",
      description: "Searchable database with master key systems, compatibility rules, and manufacturer pricing tiers",
    },
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: "Quote & Proposal System",
      description: "Multi-channel delivery (email, portal, DocuSign), version control, and interactive customer approval",
    },
    {
      icon: <ShoppingCart className="h-8 w-8 text-blue-600" />,
      title: "Procurement & Vendors",
      description: "Distributor management, automated PO generation, and multi-vendor pricing comparison",
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-blue-600" />,
      title: "Sales & Analytics",
      description: "Pipeline tracking, win rate analysis, revenue forecasting, and team performance metrics",
    },
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Team & HR Management",
      description: "10 role levels, employee onboarding plans, quick invites, and 35+ email templates for communication",
    },
  ];

  const demoData = [
    "3 Sample Projects (Hospital, Hotel, Office Building)",
    "25+ Door Openings with LiDAR Measurements",
    "Hardware Items from 10K+ Product Catalog",
    "Multi-Stage Quote Workflow with DocuSign",
    "Purchase Orders with Vendor Pricing",
    "Sales Pipeline with Analytics Dashboard",
    "HR Onboarding Plans & Employee Invites",
    "35+ Email Templates Across 14 Categories",
    "95+ Compliance Rules (ADA, IBC, NFPA, ANSI)",
    "HubSpot Integrations Ready",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-2">
            <DoorOpen className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            <h1 className="text-lg md:text-2xl font-bold">DoorSurvey Pro</h1>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="hidden sm:inline">Sales </span>Demo
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight px-2" data-testid="heading-demo">
            Commercial Door Survey & Estimation Platform
          </h1>
          <p className="text-base md:text-xl text-muted-foreground px-4">
            A comprehensive SaaS solution for door surveying professionals, combining field survey tools,
            hardware management, compliance tracking, and procurement workflows.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4 px-4">
            <Button 
              size="lg" 
              onClick={handleSeedDemo}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSeedDemo(); }}
              disabled={isSeeding}
              className="w-full sm:w-auto"
              data-testid="button-start-demo"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 mr-2 animate-spin" />
                  Loading Demo...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Start Interactive Demo
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/sign-in?demo=1">
                Sign In
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="text-center mb-8 md:mb-12 px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Platform Features</h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage commercial door projects from field survey to procurement
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate">
              <CardHeader>
                <div className="mb-3 md:mb-4">{feature.icon}</div>
                <CardTitle className="text-base md:text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Demo Data Section */}
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl md:rounded-2xl p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 md:mb-12 px-2">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">What's Included in the Demo</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Explore a fully populated system with realistic commercial door project data
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {demoData.map((item, index) => (
                <div key={index} className="flex items-start gap-2 md:gap-3 bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Instructions */}
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl">How to Use the Demo</CardTitle>
            <CardDescription className="text-sm">Quick start guide to explore DoorSurvey Pro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Click "Start Interactive Demo"</h3>
                <p className="text-sm text-muted-foreground">
                  This will create a demo organization with sample data including projects, door openings, hardware, quotes, and sales leads.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Log in with Demo Account</h3>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to sign in and access the demo organization with full owner permissions.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Explore All Features</h3>
                <p className="text-sm text-muted-foreground">
                  Navigate through projects, review engineer approvals, manage purchase orders, track sales leads, and explore the complete platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-8 md:mt-16 py-6 md:py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6 text-center text-xs md:text-sm text-muted-foreground">
          <p>DoorSurvey Pro - Professional Commercial Door Survey & Estimation Platform</p>
          <p className="mt-1.5 md:mt-2">
            Demo Environment • All data is sample and resets periodically
          </p>
        </div>
      </footer>
    </div>
  );
}
