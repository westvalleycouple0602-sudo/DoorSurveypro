import { apiRequest as fetch } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, CheckCircle2, Mail, Phone, Building2, CheckCircle, Sparkles, Scan, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Progressive profiling: Multi-step form with field stages tailored for door salesmen
const FORM_STEPS = [
  { fields: ['name', 'email', 'phone'], title: 'Contact Information', description: 'Let us know who you are' },
  { fields: ['territory', 'experience', 'currentAffiliation'], title: 'Sales Background', description: 'Tell us about your sales territory' },
  { fields: ['salesVolume', 'productSpecialization', 'lookingFor'], title: 'Sales Details', description: 'Help us understand your needs' },
];

type FormField = 'name' | 'email' | 'phone' | 'territory' | 'experience' | 'currentAffiliation' | 'salesVolume' | 'productSpecialization' | 'lookingFor';

// Complete form schema (for final submission)
const completeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  territory: z.string().min(2, "Territory is required"),
  experience: z.string().min(1, "Please select your experience level"),
  currentAffiliation: z.string().optional(),
  salesVolume: z.string().optional(),
  productSpecialization: z.string().optional(),
  lookingFor: z.string().optional(),
});

type LeadFormValues = z.infer<typeof completeFormSchema>;

export default function PublicLandingPage() {
  const [, params] = useRoute("/l/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["/api/public/landing-pages", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/landing-pages/${slug}`);
      if (!res.ok) throw new Error("Landing page not found");
      return res.json();
    },
    enabled: !!slug,
  });

  // Initialize form
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(completeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      territory: "",
      experience: "",
      currentAffiliation: "",
      salesVolume: "",
      productSpecialization: "",
      lookingFor: "",
    },
  });

  // Lead submission mutation
  const submitLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      return await apiRequest(
        "POST",
        `/api/public/landing-pages/${page.id}/leads`,
        {
          ...values,
          landingPageId: page.id,
          source: "landing_page",
          metadata: {
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            landingPageSlug: slug,
            profileSteps: FORM_STEPS.length,
          },
        }
      );
    },
    onSuccess: () => {
      setFormSubmitted(true);
      setCurrentStep(0);
      form.reset();
      toast({
        title: "Thank you!",
        description: "We've received your information and will be in touch shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Handle step progression
  const handleNext = async () => {
    const currentStepFields = FORM_STEPS[currentStep].fields;
    const isValid = await form.trigger(currentStepFields as any);
    
    if (isValid) {
      if (currentStep < FORM_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Last step - submit the form
        form.handleSubmit((values) => submitLeadMutation.mutate(values))();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Update page meta tags for SEO
  useEffect(() => {
    if (page) {
      document.title = page.seoTitle || page.title || "DoorSurvey Pro";
      
      // Update or create meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', page.seoDescription || page.headline || '');
      
      // Update or create Open Graph tags
      const ogTags = [
        { property: 'og:title', content: page.seoTitle || page.title || '' },
        { property: 'og:description', content: page.seoDescription || page.headline || '' },
        { property: 'og:image', content: page.heroImageUrl || '' },
        { property: 'og:type', content: 'website' },
      ];
      
      ogTags.forEach(({ property, content }) => {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      });
    }
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="spinner-loading" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">Page Not Found</h1>
            <p className="text-muted-foreground mb-6" data-testid="text-error-message">
              The landing page you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild data-testid="button-back-home">
              <a href="/">Go to Homepage</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scrollToForm = () => {
    const formElement = document.getElementById('lead-capture-form');
    formElement?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-landing">
      {/* Hero Section */}
      <section 
        className="relative min-h-[600px] flex items-center justify-center px-4 py-20"
        style={{
          backgroundImage: page.heroImageUrl ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${page.heroImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        data-testid="section-hero"
      >
        <div className="max-w-4xl w-full text-center">
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ color: page.heroImageUrl ? '#ffffff' : undefined }}
            data-testid="text-headline"
          >
            {page.headline}
          </h1>
          
          {page.subheadline && (
            <p 
              className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto"
              style={{ color: page.heroImageUrl ? '#e5e5e5' : undefined }}
              data-testid="text-subheadline"
            >
              {page.subheadline}
            </p>
          )}
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={scrollToForm}
              className={page.heroImageUrl ? "bg-primary hover-elevate active-elevate-2" : ""}
              data-testid="button-get-started"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              onClick={scrollToForm}
              className={page.heroImageUrl ? "backdrop-blur-sm bg-background/10 border-white/30 text-white hover-elevate active-elevate-2" : ""}
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      {page.content && (
        <section className="py-16 px-4" data-testid="section-content">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap" data-testid="content-text">
                  {page.content}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Features/Benefits Section - Salesman Focused */}
      <section className="py-16 px-4 bg-muted/30" data-testid="section-features">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4" data-testid="text-features-title">
            Cutting-Edge Technology That Wins Deals
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
            DoorSurvey Pro gives you AI-powered tools, AR measurement technology, and advanced estimation capabilities that help you close deals faster, increase accuracy, and impress customers.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover-elevate" data-testid="card-feature-1">
              <CardContent className="pt-6">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">6 AI-Powered Features</h3>
                <p className="text-muted-foreground mb-4">
                  Computer vision extracts measurements from photos. Automated compliance checking validates against 19 building codes (ADA, IBC, NFPA). AI recommendations suggest optimal hardware. Measurement validation, damage detection, and predictive analytics complete the suite.
                </p>
                <p className="text-sm font-medium text-primary">
                  Close deals 40% faster with AI automation
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover-elevate" data-testid="card-feature-2">
              <CardContent className="pt-6">
                <Scan className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">AR + LiDAR Measurements</h3>
                <p className="text-muted-foreground mb-4">
                  WebXR-powered AR with LiDAR precision: ±0.1" accuracy on iPhone 12 Pro+ and iPad Pro. Camera-based AR on standard devices with ±0.5" accuracy. Instant measurements for door heights, widths, frame depths, and clear openings. Barcode scanning for hardware ID.
                </p>
                <p className="text-sm font-medium text-primary">
                  Eliminate measurement errors completely
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover-elevate" data-testid="card-feature-3">
              <CardContent className="pt-6">
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Advanced Estimation System</h3>
                <p className="text-muted-foreground mb-4">
                  Modular calculator architecture with 4 specialized modules: Labor, Freight, Material, and Installation. Dynamic pricing with configurable rate cards. Comprehensive cost breakdowns show materials, labor, freight, profit margins, and total costs. No hard-coded rates—update pricing globally.
                </p>
                <p className="text-sm font-medium text-primary">
                  Generate accurate quotes in minutes
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Technology Showcase Section */}
      <section className="py-16 px-4" data-testid="section-technology">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            The Most Advanced Platform in the Industry
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card data-testid="card-tech-ai">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-semibold mb-4">🤖 AI-Powered Automation</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Computer Vision OCR:</strong> Automatically extract measurements, hardware specs, and door schedules from photos
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Compliance Validation:</strong> Instant ADA, NFPA, IBC code checking with detailed violation reports
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Smart Recommendations:</strong> AI suggests hardware based on door specs, building codes, and customer preferences
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Damage Detection:</strong> Identify scratches, dents, and wear patterns in uploaded photos
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card data-testid="card-tech-ar">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-semibold mb-4">📱 AR Field Technology</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">WebXR Integration:</strong> Works on iOS (Safari/ARKit) and Android (Chrome/ARCore) without app downloads
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">LiDAR Precision:</strong> ±0.1" accuracy on iPhone 12 Pro+, iPad Pro 2020+ with depth sensors
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Camera-Based AR:</strong> ±0.5" accuracy on standard smartphones for reliable measurements
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Instant Measurements:</strong> Capture door heights, widths, frame depths, and clear openings in seconds
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Lead Capture Form Section */}
      <section className="py-16 px-4" id="lead-capture-form" data-testid="section-form">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-3xl font-bold text-center mb-4" data-testid="text-form-title">
                Join Our Sales Network
              </h2>
              <p className="text-center text-muted-foreground mb-8" data-testid="text-form-description">
                Complete the form below and our sales team will contact you within 24 hours to discuss partnership opportunities.
              </p>
              
              {formSubmitted ? (
                <div className="text-center py-12" data-testid="form-success-message">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-2">Thank You!</h3>
                  <p className="text-muted-foreground mb-6">
                    We've received your information and will be in touch shortly.
                  </p>
                  <Button 
                    onClick={() => {
                      setFormSubmitted(false);
                      setCurrentStep(0);
                    }}
                    variant="outline"
                    data-testid="button-submit-another"
                  >
                    Submit Another Request
                  </Button>
                </div>
              ) : (
                <div>
                  {/* Step Indicator */}
                  <div className="mb-8">
                    <div className="flex justify-between mb-2" data-testid="step-indicator">
                      {FORM_STEPS.map((step, index) => (
                        <div 
                          key={index}
                          className={`flex-1 ${index !== FORM_STEPS.length - 1 ? 'mr-2' : ''}`}
                        >
                          <div 
                            className={`h-2 rounded-full transition-colors ${
                              index <= currentStep ? 'bg-primary' : 'bg-muted'
                            }`}
                            data-testid={`step-${index}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg" data-testid="step-title">
                        {FORM_STEPS[currentStep].title}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="step-description">
                        {FORM_STEPS[currentStep].description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1" data-testid="step-count">
                        Step {currentStep + 1} of {FORM_STEPS.length}
                      </p>
                    </div>
                  </div>

                  <Form {...form}>
                    <form className="space-y-6" data-testid="form-lead-capture">
                      {/* Render fields for current step */}
                      {FORM_STEPS[currentStep].fields.includes('name') && (
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="John Smith" data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('email') && (
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} placeholder="john.smith@example.com" data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('phone') && (
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input type="tel" {...field} placeholder="(555) 123-4567" data-testid="input-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('territory') && (
                        <FormField
                          control={form.control}
                          name="territory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sales Territory / Region *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Northeast US, California, etc." data-testid="input-territory" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('experience') && (
                        <FormField
                          control={form.control}
                          name="experience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years of Sales Experience *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., 5 years, 10+ years" data-testid="input-experience" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('currentAffiliation') && (
                        <FormField
                          control={form.control}
                          name="currentAffiliation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Employer / Affiliation (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Independent, ABC Distribution, etc." data-testid="input-affiliation" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('salesVolume') && (
                        <FormField
                          control={form.control}
                          name="salesVolume"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Average Monthly Sales Volume (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="$50K, $100K+, etc." data-testid="input-sales-volume" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('productSpecialization') && (
                        <FormField
                          control={form.control}
                          name="productSpecialization"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Specialization (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Commercial doors, hardware, automation, etc." data-testid="input-specialization" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {FORM_STEPS[currentStep].fields.includes('lookingFor') && (
                        <FormField
                          control={form.control}
                          name="lookingFor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What Are You Looking For? (Optional)</FormLabel>
                              <FormControl>
                                <Textarea rows={3} {...field} placeholder="Product training, commission info, partnership opportunities, etc." data-testid="input-looking-for" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Navigation Buttons */}
                      <div className="flex gap-4">
                        {currentStep > 0 && (
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            className="flex-1"
                            data-testid="button-back"
                          >
                            Back
                          </Button>
                        )}
                        <Button 
                          type="button"
                          onClick={handleNext}
                          size="lg" 
                          className="flex-1"
                          disabled={submitLeadMutation.isPending}
                          data-testid={currentStep === FORM_STEPS.length - 1 ? "button-submit-form" : "button-next"}
                        >
                          {submitLeadMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Submitting...
                            </>
                          ) : currentStep === FORM_STEPS.length - 1 ? (
                            <>
                              <Phone className="mr-2 h-5 w-5" />
                              Join Our Team
                            </>
                          ) : (
                            <>
                              Next
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-muted/20" data-testid="footer">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p data-testid="text-copyright">&copy; 2025 DoorSurvey Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
