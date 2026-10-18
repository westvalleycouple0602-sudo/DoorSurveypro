import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DoorOpen,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Sparkles,
  Calendar,
  Mail,
  ArrowRight,
  Building2,
  FileText,
  BarChart3,
  Loader2,
} from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  company: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function Prelaunch() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
      name: "",
      company: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      // Capture UTM parameters from URL for funnel tracking
      const urlParams = new URLSearchParams(window.location.search);
      const trackingData = {
        ...data,
        utm_source: urlParams.get('utm_source') || undefined,
        utm_medium: urlParams.get('utm_medium') || undefined,
        utm_campaign: urlParams.get('utm_campaign') || undefined,
        utm_content: urlParams.get('utm_content') || undefined,
        utm_term: urlParams.get('utm_term') || undefined,
        source: urlParams.get('source') || (document.referrer ? 'referral' : 'direct'),
      };
      return apiRequest("POST", "/api/prelaunch-signups", trackingData);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when DoorSurvey Pro launches in January 2026.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailFormData) => {
    signupMutation.mutate(data);
  };

  const features = [
    {
      icon: DoorOpen,
      title: "Comprehensive Surveying",
      description: "AR measurements, LiDAR scanning (±0.1\" accuracy), photo OCR, and barcode recognition for rapid field data collection",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Intelligence",
      description: "6 AI features: computer vision analysis, compliance checking (19 codes), hardware recommendations, measurement validation, damage detection, and predictive analytics",
    },
    {
      icon: FileText,
      title: "Advanced Estimation System",
      description: "Modular calculator architecture with 4 specialized modules: LaborCalculator, FreightCalculator, MaterialCalculator, and InstallationCalculator. Dynamic pricing configuration with no hard-coded rates",
    },
    {
      icon: Users,
      title: "Multi-Tenant SaaS",
      description: "6 role-based access levels (Owner, Admin, Manager, Engineer, Technician, Viewer) with complete data isolation and team collaboration",
    },
    {
      icon: BarChart3,
      title: "Hardware Catalog & BOM Templates",
      description: "39 hardware items across 18 categories, 7 BHMA finishes, 4 global BOM templates for instant application. Pre-configured hardware sets with complete specifications",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "CSRF protection, rate limiting, multi-tenant isolation, audit logging, and Clerk authentication with Google Login support",
    },
  ];

  const benefits = [
    "Eliminate manual data entry and reduce errors by 90% with AI-powered OCR",
    "Complete surveys 3x faster with AR measurements and LiDAR precision",
    "Generate professional quotes in minutes with modular estimation system",
    "Track costs with dynamic pricing: materials, labor, freight, profit margins",
    "Validate against 19 building codes (ADA, IBC, NFPA, ANSI/BHMA, UL)",
    "Access 39-item hardware catalog and 4 BOM templates for rapid specification",
    "6 team roles with complete multi-tenant data isolation",
    "75+ enterprise features in one unified platform",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <DoorOpen className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">DoorSurvey Pro</span>
              <span className="text-xs text-muted-foreground">DoorSurveypro.com • DoorSurvey.pro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge className="text-sm px-4 py-1.5" variant="secondary">
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Launching January 2026
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            The Future of{" "}
            <span className="text-primary">Commercial Door Surveying</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Transform your door hardware estimating workflow with AI-powered intelligence, 
            comprehensive project management, and professional documentation tools.
          </p>

          {!submitted ? (
            <Card className="max-w-2xl mx-auto mt-8">
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="text-left mb-4">
                      <h3 className="font-semibold text-lg mb-1">Get Early Access</h3>
                      <p className="text-sm text-muted-foreground">
                        Be the first to know when we launch. Join our waitlist for exclusive early access.
                      </p>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Your name"
                                data-testid="input-prelaunch-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Company name"
                                data-testid="input-prelaunch-company"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              data-testid="input-prelaunch-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={signupMutation.isPending}
                      data-testid="button-join-waitlist"
                    >
                      {signupMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Join the Waitlist
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-2xl mx-auto mt-8 border-primary/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-xl">You're on the list!</h3>
                  <p className="text-muted-foreground">
                    We'll send you an email when DoorSurvey Pro launches in January 2026.
                    Check your inbox for a confirmation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for Modern Door & Hardware Professionals
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to streamline surveys, create accurate quotes, 
              and manage commercial door projects from start to finish.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-8">
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Why Choose DoorSurvey Pro?</h2>
                <p className="text-muted-foreground">
                  Join leading contractors who are transforming their workflow
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Available at <span className="font-semibold text-foreground">DoorSurveypro.com</span> and{" "}
                  <span className="font-semibold text-foreground">DoorSurvey.pro</span>
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary">
                    <Building2 className="h-3 w-3 mr-1" />
                    Multi-Tenant
                  </Badge>
                  <Badge variant="secondary">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Subscription-Based
                  </Badge>
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    Enterprise Security
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join hundreds of professionals on the waitlist for early access to DoorSurvey Pro.
          </p>
          {!submitted && (
            <Button
              size="lg"
              onClick={() => {
                const emailInput = document.querySelector('[data-testid="input-prelaunch-email"]') as HTMLInputElement;
                emailInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                emailInput?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const emailInput = document.querySelector('[data-testid="input-prelaunch-email"]') as HTMLInputElement;
                  emailInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  emailInput?.focus();
                }
              }}
              data-testid="button-signup-cta"
            >
              Get Early Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <div className="flex items-center justify-center gap-2">
              <DoorOpen className="h-4 w-4" />
              <span className="font-semibold">DoorSurvey Pro</span>
            </div>
            <p>Launching January 2026</p>
            <p>DoorSurveypro.com • DoorSurvey.pro</p>
            <p className="text-xs">© 2025-2026 DoorSurvey Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
