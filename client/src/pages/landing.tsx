import { apiRequest as fetch } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle, Layers, Lock, Shield, Users, ArrowRight, Star, Clock, TrendingUp, FileText, Camera, Ruler, Wrench, Sparkles, DollarSign, MapPin, PackageSearch, Workflow, Settings, Key, Clipboard, ClipboardCheck, BarChart3, BookOpen, Play, Zap, CreditCard, TrendingUp as Pipeline, Cable, Quote, Award, Target, Scan, ScanLine, Lightbulb, MessageSquare, HelpCircle, Rocket, ThumbsUp, Building, Factory, Database, FileSpreadsheet, Globe, Package, ShoppingCart, Truck, Receipt, Calculator, FileCheck, Webhook, Wand2, BookMarked, FileBarChart, Network, Brain, Eye, Search, Gauge, PieChart, LineChart, Tablet, Cpu, Box, Route, Activity } from "lucide-react";
import { SiApple, SiHubspot, SiQuickbooks, SiPostgresql, SiOpenai } from "react-icons/si";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import logoIconImage from "@assets/logo-icon-only.png";
import logoWithTextImage from "@assets/logo-with-text.png";
import promoVideo from "@assets/text-to-video-c8d461c9_1764474356047.mp4";
import heroVideo1 from "@assets/generated_videos/lidar_door_scan_hero_shot.mp4";
import heroVideo2 from "@assets/generated_videos/lidar_point_cloud_formation.mp4";
import heroVideo3 from "@assets/generated_videos/door_hardware_detection_macro.mp4";
import heroVideo4 from "@assets/generated_videos/ui_cards_assembling_package.mp4";
import heroVideo5 from "@assets/generated_videos/quote_pdf_generation_animation.mp4";
import heroVideo6 from "@assets/generated_videos/tablet_dashboard_showcase.mp4";
import ipadLidarImage from "@assets/generated_images/ipad_pro_lidar_door_scanning.png";
import pointCloudImage from "@assets/generated_images/lidar_point_cloud_visualization.png";
import doorHardwareImage from "@assets/generated_images/commercial_door_hardware_system.png";
import arComparisonImage from "@assets/generated_images/traditional_vs_ar_survey_comparison.png";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { trackProjectEvent } from "@/lib/project-analytics";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DemoShowcase from "@/components/DemoShowcase";
import SEOHead from "@/components/SEOHead";
import { getOrganizationSchema, getSoftwareApplicationSchema, SEO_PAGES } from "@/lib/seo";
import { COMPANY_EMAILS } from "@shared/emails";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const heroVideoScenes = [
  { video: heroVideo1, overlay: "Survey Smarter.", duration: 6000 },
  { video: heroVideo2, overlay: "Millimeter Accuracy.", duration: 4000 },
  { video: heroVideo3, overlay: "Instant Hardware Detection.", duration: 4000 },
  { video: heroVideo4, overlay: "Complete Openings. Built Automatically.", duration: 4000 },
  { video: heroVideo5, overlay: "Instant Quotes.", duration: 4000 },
  { video: heroVideo6, overlay: "DoorSurveyPro.com", duration: 6000 },
];

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
};

const pulseAnimation = {
  scale: [1, 1.02, 1],
  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const { toast } = useToast();
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [demoFormOpen, setDemoFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [leadForm, setLeadForm] = useState({
    contactName: "",
    email: "",
    phone: "",
    companyName: "",
    jobTitle: "",
    companySize: "",
    industry: "",
    interestedIn: "",
    notes: "",
  });

  // Fetch nonce when forms open (bot/spam prevention)
  useEffect(() => {
    const fetchNonce = async () => {
      if (leadFormOpen || demoFormOpen) {
        trackProjectEvent("lead_form_opened", {
          form_type: demoFormOpen ? "demo_request" : "contact",
          location: "landing",
        });
        try {
          const response = await fetch("/api/nonce");
          if (response.ok) {
            const data = await response.json();
            setNonce(data.nonce);
          }
        } catch (error) {
          // handled
        }
      }
    };
    
    fetchNonce();
  }, [leadFormOpen, demoFormOpen]);

  // Video carousel auto-advancement
  useEffect(() => {
    const currentScene = heroVideoScenes[currentVideoIndex];
    const timer = setTimeout(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % heroVideoScenes.length);
    }, currentScene.duration);
    
    return () => clearTimeout(timer);
  }, [currentVideoIndex]);

  const handleLogin = () => {
    trackProjectEvent("landing_sign_in_clicked", { location: "landing" });
    window.location.href = "/sign-in";
  };

  const handleLeadSubmit = async (e: React.FormEvent, isDemoRequest: boolean = false) => {
    e.preventDefault();
    
    // Verify nonce is available (bot/spam prevention)
    if (!nonce) {
      toast({
        title: "Verification required",
        description: "Please close and reopen the form to try again",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);

    try {
      const res = await apiRequest("POST", "/api/leads", {
        ...leadForm,
        source: isDemoRequest ? "demo-request" : "contact-form",
        _nonce: nonce, // Include verification token for bot/spam prevention
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Submission failed");
      }

      trackProjectEvent("lead_submitted", {
        form_type: isDemoRequest ? "demo_request" : "contact",
        location: "landing",
      });
      toast({
        title: isDemoRequest ? "Demo request received" : "Thank you for your interest",
        description: isDemoRequest 
          ? "We'll contact you within 24 hours to schedule your personalized demo"
          : "We'll be in touch shortly to discuss how DoorSurvey Pro can help your business",
      });

      setLeadFormOpen(false);
      setDemoFormOpen(false);
      setNonce(null); // Clear nonce after successful submission
      setLeadForm({
        contactName: "",
        email: "",
        phone: "",
        companyName: "",
        jobTitle: "",
        companySize: "",
        industry: "",
        interestedIn: "",
        notes: "",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to submit request",
        description: errorMessage.includes("verification") || errorMessage.includes("token")
          ? "Security verification failed. Please refresh the page and try again"
          : errorMessage.includes("email") || errorMessage.includes("invalid")
          ? "Please check your email address and try again"
          : errorMessage.includes("duplicate") || errorMessage.includes("already")
          ? "You've already submitted a request. We'll be in touch soon"
          : errorMessage.includes("network") || errorMessage.includes("connection")
          ? "Network error. Please check your connection and try again"
          : errorMessage || `Unable to submit request. Please try again or contact ${COMPANY_EMAILS.support}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Combine Organization and SoftwareApplication schemas
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(),
      getSoftwareApplicationSchema()
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SEOHead
        title={SEO_PAGES.landing.title}
        description={SEO_PAGES.landing.description}
        keywords={SEO_PAGES.landing.keywords}
        ogType="website"
        structuredData={structuredData}
      />
      
      {/* Coming Soon Banner */}
      <div className="bg-primary text-primary-foreground py-3 px-4 text-center">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-sm md:text-base">
          <Rocket className="h-4 w-4 md:h-5 md:w-5" />
          <span className="font-semibold">Coming Soon — Full Launch 2026</span>
          <span className="hidden sm:inline text-primary-foreground/80">|</span>
          <span className="text-primary-foreground/80">Currently in private beta</span>
        </div>
      </div>
      
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoWithTextImage} 
              alt="DoorSurvey Pro" 
              className="h-14 md:h-20 object-contain"
              data-testid="img-header-logo"
            />
            <span className="text-xl md:text-2xl font-bold">DoorSurvey Pro</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
              Features
            </a>
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">
              Pricing
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-testimonials">
              Testimonials
            </a>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLeadFormOpen(true)} className="hidden sm:inline-flex" data-testid="button-contact-sales">
              Contact Sales
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogin} data-testid="button-login">
              Beta Tester Login
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-20 text-center">
          <motion.div 
            className="max-w-4xl mx-auto space-y-6 md:space-y-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-2 md:mb-4"
            >
              <Star className="h-3 w-3 md:h-4 md:w-4" />
              For Commercial Door & Access Control Teams
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight px-2"
            >
              Survey Doors in Minutes,
              <span className="block text-primary mt-2">Not Hours</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4"
            >
              Triple-scan LiDAR + AI analysis + instant code compliance. One platform that takes you from field survey to approved quote—faster than ever.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-xs md:text-sm font-medium px-4"
            >
              <Badge variant="secondary" className="px-2 md:px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Cut survey time by 80%
              </Badge>
              <Badge variant="secondary" className="px-2 md:px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Catch code issues before they cost you
              </Badge>
              <Badge variant="secondary" className="px-2 md:px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Quote same-day
              </Badge>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center px-4"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={() => setDemoFormOpen(true)} size="lg" className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8" data-testid="button-request-demo">
                  Request Early Access
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={handleLogin} size="lg" variant="outline" className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8" data-testid="button-get-started">
                  Beta Tester Login
                </Button>
              </motion.div>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 md:gap-8 pt-6 md:pt-8 text-xs md:text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Full Launch 2026
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Private Beta Active
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Join the Waitlist
              </div>
            </motion.div>
          </motion.div>
        </section>
        
        {/* Technology Partners & Integrations */}
        <section className="border-y bg-muted/30 py-8 md:py-12">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-6 md:mb-8"
            >
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Powered by Industry-Leading Technology
              </p>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16"
            >
              <motion.div variants={scaleIn} className="flex flex-col items-center gap-2 group">
                <div className="p-3 rounded-xl bg-background border shadow-sm group-hover:shadow-md transition-shadow">
                  <SiApple className="h-8 w-8 md:h-10 md:w-10 text-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground">Apple LiDAR</span>
              </motion.div>
              
              <motion.div variants={scaleIn} className="flex flex-col items-center gap-2 group">
                <div className="p-3 rounded-xl bg-background border shadow-sm group-hover:shadow-md transition-shadow">
                  <SiOpenai className="h-8 w-8 md:h-10 md:w-10 text-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground">OpenAI GPT-4</span>
              </motion.div>
              
              <motion.div variants={scaleIn} className="flex flex-col items-center gap-2 group">
                <div className="p-3 rounded-xl bg-background border shadow-sm group-hover:shadow-md transition-shadow">
                  <SiHubspot className="h-8 w-8 md:h-10 md:w-10 text-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground">HubSpot CRM</span>
              </motion.div>
              
              <motion.div variants={scaleIn} className="flex flex-col items-center gap-2 group">
                <div className="p-3 rounded-xl bg-background border shadow-sm group-hover:shadow-md transition-shadow">
                  <SiQuickbooks className="h-8 w-8 md:h-10 md:w-10 text-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground">QuickBooks</span>
              </motion.div>
              
              <motion.div variants={scaleIn} className="flex flex-col items-center gap-2 group">
                <div className="p-3 rounded-xl bg-background border shadow-sm group-hover:shadow-md transition-shadow">
                  <SiPostgresql className="h-8 w-8 md:h-10 md:w-10 text-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground">PostgreSQL</span>
              </motion.div>
              
              <motion.div variants={scaleIn} className="flex flex-col items-center gap-2 group">
                <div className="p-3 rounded-xl bg-background border shadow-sm group-hover:shadow-md transition-shadow">
                  <Globe className="h-8 w-8 md:h-10 md:w-10 text-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground">WebXR AR</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Cinematic Video Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Play className="h-3 w-3 md:h-4 md:w-4" />
                See It In Action
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-4">
                The Future of Door Surveys
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                From LiDAR scan to compliant quote—experience the complete workflow
              </p>
            </div>

            {/* Cinematic Video Carousel */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border-2 border-border shadow-2xl">
              {heroVideoScenes.map((scene, index) => (
                <video
                  key={index}
                  ref={index === currentVideoIndex ? videoRef : null}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    index === currentVideoIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                  autoPlay
                  muted
                  playsInline
                  data-testid={`video-scene-${index + 1}`}
                >
                  <source src={scene.video} type="video/mp4" />
                </video>
              ))}
              
              {/* Overlay Text */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-black/30">
                <motion.h3
                  key={currentVideoIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center px-4 drop-shadow-lg"
                  data-testid="text-video-overlay"
                >
                  {heroVideoScenes[currentVideoIndex].overlay}
                </motion.h3>
              </div>
              
              {/* Scene Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {heroVideoScenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVideoIndex(index)}
                    className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                      index === currentVideoIndex 
                        ? 'bg-white scale-125' 
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    data-testid={`button-scene-${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Video Benefits */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 mb-2 md:mb-3">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Survey More Jobs</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Complete 5x more surveys per day with LiDAR + barcode scanning
                </p>
              </div>
              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 mb-2 md:mb-3">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Eliminate Rework</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Auto-check 19 building codes before you leave the site
                </p>
              </div>
              <div className="text-center p-4 sm:col-span-2 md:col-span-1">
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 mb-2 md:mb-3">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Win More Bids</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Deliver professional quotes same-day while competitors take a week
                </p>
              </div>
            </div>

            {/* CTA After Video */}
            <div className="text-center mt-8 md:mt-12 px-4">
              <Button onClick={() => setDemoFormOpen(true)} size="lg" className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8" data-testid="button-video-cta">
                Request Early Access
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
                Full launch 2026 • Private beta active • Join the waitlist
              </p>
            </div>
          </div>
        </section>

        {/* Statistics Bar */}
        <section className="border-y bg-muted/50 py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2" data-testid="text-building-codes">95+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Compliance Rules</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2" data-testid="text-ai-features">35+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Building Codes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2" data-testid="text-role-types">10K+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Hardware Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2" data-testid="text-features">80%</div>
                <div className="text-xs md:text-sm text-muted-foreground">Time Savings</div>
              </div>
            </div>
          </div>
        </section>

        {/* Division 28 Opportunity Engine - NEW SECTION */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
                New: Division 28 Opportunity Engine
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-4">
                Turn Every Opening Into a Security Opportunity
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                Automatically score electronic security potential during door surveys. Identify high-value upsell opportunities before you leave the site.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8">
              <Card className="hover-elevate text-center">
                <CardHeader>
                  <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Opportunity Scoring</CardTitle>
                  <CardDescription>
                    AI-powered 0-100 scoring system identifies which openings have the highest electronic security potential
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate text-center">
                <CardHeader>
                  <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Security Assessment</CardTitle>
                  <CardDescription>
                    Evaluate access control, surveillance, intrusion detection, and lockdown requirements per opening
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate text-center">
                <CardHeader>
                  <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Proposal Generation</CardTitle>
                  <CardDescription>
                    Instantly generate professional security upgrade proposals with tier-based recommendations
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="p-6 md:p-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-full bg-primary/20">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-bold mb-2">
                    Capture $50K+ in Security Upgrades Per Project
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Stop leaving money on the table. Our Div28 engine identifies access control, video surveillance, and integrated security opportunities during every survey.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={() => setDemoFormOpen(true)} size="lg" data-testid="button-div28-cta">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us - Value Proposition */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Zap className="h-3 w-3 md:h-4 md:w-4" />
                Why Teams Switch to DoorSurvey Pro
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-4">
                Stop Losing Time & Money on Manual Processes
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                Your competitors are still using tape measures and spreadsheets. Here's what you get instead:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">5x Faster Surveys</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Triple-scan LiDAR captures every angle</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Scan barcode, hardware auto-populates</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Status dashboard tracks scan completion</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Zero Code Violations</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Auto-check ADA, NFPA, IBC, ANSI compliance</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Flag issues before you leave the job site</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Eliminate expensive callbacks and rework</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Same-Day Quotes</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Survey in the morning, quote by lunch</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Beat competitors who take a week</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Professional PDFs with your branding</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Team Visibility</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> See all projects and status in real-time</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Assign techs, track progress, manage workload</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Works from office, field, or home</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="mt-8 md:mt-12 p-6 md:p-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Cable className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-bold mb-2">
                    Works for Every Door Type
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Hollow metal, wood, aluminum, fire-rated, access control, electrified hardware—one platform handles it all.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={() => setDemoFormOpen(true)} size="lg" data-testid="button-division-cta">
                    Get Early Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo Showcase */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/10">
          <DemoShowcase 
            ctaMode="link"
            ctaHref="/login"
            ctaText="Request Early Access"
          />
        </section>

        {/* Team Collaboration & Role-Based Access */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                For Teams of All Sizes
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-4">
                Everyone Stays in Sync
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                Field techs, office staff, and managers all see the same data in real-time. No more chasing down updates.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Right Access for Each Role</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Techs see their jobs, not your margins</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Managers approve quotes and track workload</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Owners get full visibility and control</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Workflow className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Less Micromanaging</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Dashboards show who's doing what</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Auto-notifications when work is done</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Stop asking "where are we on this?"</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Multi-Location Ready</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Each branch has its own workspace</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Separate projects, users, and catalogs</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Data stays private between locations</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg md:text-xl">Pay for What You Use</CardTitle>
                  </div>
                  <CardDescription className="text-sm md:text-base">
                    <ul className="space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Start small, add features as you grow</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Optional add-ons: AI, offline mode, etc.</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Month-to-month or annual discounts</li>
                    </ul>
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="text-center">
              <Button onClick={() => setDemoFormOpen(true)} size="lg" data-testid="button-team-cta">
                See How Teams Use It
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Comprehensive Features Section */}
        <section className="bg-muted/30 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                Powerful Features
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-4">AI Does the Heavy Lifting</h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                Let automation handle the tedious work so your team can focus on what matters
              </p>
            </div>

            {/* AI-Powered Features */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Smart Automation</h3>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <Eye className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Photo Analysis</CardTitle>
                    <CardDescription>
                      Snap a photo, AI identifies the hardware, spots damage, and suggests replacements. No more guessing what you're looking at.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Search className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Document Reading</CardTitle>
                    <CardDescription>
                      Upload specs, cut sheets, or drawings—AI extracts the data and fills in your project. Stop typing what's already written.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <FileCheck className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Code Compliance</CardTitle>
                    <CardDescription>
                      Auto-check against ADA, NFPA, IBC, ANSI. Issues flagged instantly with suggested fixes. Never miss a requirement again.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Lightbulb className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Smart Suggestions</CardTitle>
                    <CardDescription>
                      AI recommends hardware based on door type, codes, and budget. Better specs, fewer change orders.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Gauge className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Error Prevention</CardTitle>
                    <CardDescription>
                      Measurements validated against industry standards. Catch mistakes before they become expensive problems.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Target className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Performance Insights</CardTitle>
                    <CardDescription>
                      See which quotes win, where costs run high, and how to improve. Data-driven decisions, not guesswork.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* iPad Pro LiDAR - Featured Section with Image */}
            <AnimatedSection className="mb-8 md:mb-16">
              <motion.div variants={fadeInUp} className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Tablet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">iPad Pro LiDAR Scanning</h3>
                <motion.div animate={pulseAnimation}>
                  <Badge variant="secondary" className="ml-2">New</Badge>
                </motion.div>
              </motion.div>
              
              <div className="grid lg:grid-cols-2 gap-6 md:gap-8 mb-8">
                <motion.div variants={fadeInLeft} className="relative rounded-xl overflow-hidden shadow-lg">
                  <motion.img 
                    src={ipadLidarImage} 
                    alt="iPad Pro LiDAR scanning a commercial door frame with AR measurement overlays" 
                    className="w-full h-auto object-cover"
                    data-testid="img-ipad-lidar-hero"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6">
                    <p className="text-white text-sm md:text-base font-medium">
                      Point, scan, done. Measurements captured in seconds.
                    </p>
                  </div>
                </motion.div>
                
                <motion.div variants={fadeInRight} className="space-y-4">
                  <motion.div 
                    className="p-4 rounded-lg bg-muted/50 border"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <SiApple className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Triple-Scan Enforcement</h4>
                        <p className="text-sm text-muted-foreground">
                          Three scans required per opening: door open (both sides), closed Side A, closed Side B. No missed hardware, no return trips.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="p-4 rounded-lg bg-muted/50 border"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Route className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Auto-Detect Conduit Paths</h4>
                        <p className="text-sm text-muted-foreground">
                          Plan access control wiring without crawling around. The scan shows exactly where conduit can run.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="p-4 rounded-lg bg-muted/50 border"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Scan Status Dashboard</h4>
                        <p className="text-sm text-muted-foreground">
                          Real-time progress tracking shows which of the three scans are complete. Know exactly what's left before you leave the site.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="p-4 rounded-lg bg-muted/50 border"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Box className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Scans Saved Forever</h4>
                        <p className="text-sm text-muted-foreground">
                          3D scans stored securely in the cloud. Reference them months later when questions come up.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </AnimatedSection>

            {/* AR Measurements & Advanced Field Technology */}
            <AnimatedSection className="mb-8 md:mb-16">
              <motion.div variants={fadeInUp} className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Ruler className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">AR Measurements & Field Technology</h3>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="mb-8 rounded-xl overflow-hidden shadow-lg">
                <motion.img 
                  src={arComparisonImage} 
                  alt="Side-by-side comparison of traditional tape measure survey vs AR measurement technology" 
                  className="w-full h-auto object-cover"
                  data-testid="img-ar-comparison"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
              
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
              >
                <motion.div variants={fadeInUp}>
                  <Card className="hover-elevate h-full">
                    <CardHeader>
                      <Ruler className="h-10 w-10 text-primary mb-2" />
                      <CardTitle>WebXR Augmented Reality</CardTitle>
                      <CardDescription>
                        Browser-based AR measurements using WebXR technology. No app downloads required—works directly in Safari (iOS/ARKit) and Chrome (Android/ARCore) for instant field measurements.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Card className="hover-elevate h-full">
                    <CardHeader>
                      <ScanLine className="h-10 w-10 text-primary mb-2" />
                      <CardTitle>LiDAR Precision Scanning</CardTitle>
                      <CardDescription>
                        iPhone 12 Pro+ and iPad Pro 2020+ LiDAR support with ±0.1" accuracy. Captures door heights, widths, frame depths, and clear openings with confidence scoring and verification workflow.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Card className="hover-elevate h-full">
                    <CardHeader>
                      <Camera className="h-10 w-10 text-primary mb-2" />
                      <CardTitle>Camera-Based AR</CardTitle>
                      <CardDescription>
                        Standard smartphone cameras with ±0.5" accuracy on devices without LiDAR. Democratizes AR measurements across all field technicians regardless of device.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
                
                <motion.div variants={fadeInUp}>
                  <Card className="hover-elevate h-full">
                    <CardHeader>
                      <Cpu className="h-10 w-10 text-primary mb-2" />
                      <CardTitle>Hardware Detection AI</CardTitle>
                      <CardDescription>
                        Machine learning identifies hinges, closers, locks, and exit devices from LiDAR point clouds. Automatically classifies hardware types and suggests compatible replacements.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
                
                <motion.div variants={fadeInUp}>
                  <Card className="hover-elevate h-full">
                    <CardHeader>
                      <Activity className="h-10 w-10 text-primary mb-2" />
                      <CardTitle>8-Zone Coverage Analysis</CardTitle>
                      <CardDescription>
                        Real-time coverage heatmap divides door frame into 8 zones (2x4 grid). Visual feedback ensures complete scan coverage before technicians leave the job site.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
                
                <motion.div variants={fadeInUp}>
                  <Card className="hover-elevate h-full">
                    <CardHeader>
                      <Box className="h-10 w-10 text-primary mb-2" />
                      <CardTitle>Point Cloud Processing</CardTitle>
                      <CardDescription>
                        Processes PLY, OBJ, and JSON formats with automatic plane detection (RANSAC algorithm), noise filtering, and precise measurement extraction from 3D scan data.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatedSection>

            {/* Field Operations */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Camera className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Field Operations & Data Capture</h3>
              </div>
              
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg bg-slate-900">
                <img 
                  src={pointCloudImage} 
                  alt="3D point cloud visualization showing door frame scan with conduit pathways and measurements" 
                  className="w-full h-auto object-cover max-h-72"
                  data-testid="img-point-cloud"
                />
              </div>
              
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <ScanLine className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Triple-Scan LiDAR Protocol</CardTitle>
                    <CardDescription>
                      Three required scans per opening: door open (both sides), door closed Side A, and door closed Side B. Ensures complete hardware identification and condition assessment from every angle before generating quotes.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Camera className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Photo Capture & OCR</CardTitle>
                    <CardDescription>
                      Capture photos with automatic text extraction using Tesseract.js. Annotate and measure directly on photos in the field.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Scan className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Barcode Scanning</CardTitle>
                    <CardDescription>
                      Instant hardware identification via QR codes, Code 128, Data Matrix, UPC/EAN. Browser-based scanning with intelligent parsing.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <MapPin className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Door Opening Surveys</CardTitle>
                    <CardDescription>
                      Comprehensive opening data collection with measurements, swing direction, materials, hardware prep, and custom fields.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Ruler className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Door/Frame Options Catalog</CardTitle>
                    <CardDescription>
                      38 catalog options with hierarchical dropdown selectors. Real-time cross-field validation for fire ratings, ADA compliance, and electrified hardware.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Wand2 className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>AI-Powered Analysis</CardTitle>
                    <CardDescription>
                      AI integration for photo analysis, measurement validation, specification extraction, and automated compliance checking.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Project & Data Management */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Project & Data Management</h3>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <Building2 className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Multi-Tenant SaaS</CardTitle>
                    <CardDescription>
                      Complete organization-level data isolation with PostgreSQL. Role-based access control (Owner, Admin, Member, Viewer) with permission boundaries.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <BarChart3 className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Project Dashboards</CardTitle>
                    <CardDescription>
                      Real-time project status tracking with compliance metrics, cost summaries, team activity, and customizable widgets.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Users className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Team Collaboration</CardTitle>
                    <CardDescription>
                      Multi-user workflows, project sharing, assignment tracking, activity logs, and seamless team coordination across field and office.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Database className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Product Catalog</CardTitle>
                    <CardDescription>
                      Organization-specific product libraries with manufacturers, pricing tiers, lead times, finishes, and custom specifications.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Excel & CSV Export</CardTitle>
                    <CardDescription>
                      Generate formatted Excel exports with ExcelJS. Hardware schedules, opening reports, cost summaries, and custom templates.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <BookMarked className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Code Reference Library</CardTitle>
                    <CardDescription>
                      Searchable building codes database (IBC, NFPA, ADA, BHMA, UL) with quick reference for compliance requirements and resolutions.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Hardware & Specifications */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Hardware & Specifications</h3>
              </div>
              
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={doorHardwareImage} 
                  alt="Commercial door hardware system with electronic access control and door closer" 
                  className="w-full h-auto object-cover max-h-80"
                  data-testid="img-door-hardware"
                />
              </div>
              
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <Wrench className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Hardware Management</CardTitle>
                    <CardDescription>
                      Comprehensive hardware specs with locksets, hinges, closers, exit devices. Track finishes, pricing, lead times, and installation details.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Key className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Keying Systems</CardTitle>
                    <CardDescription>
                      Master keying, construction keying, grand master systems. Track key types, bitting codes, and cylinder configurations with security protocols.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Clipboard className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Hardware Schedules</CardTitle>
                    <CardDescription>
                      Professional door hardware schedules with automated PDF generation. Group by opening, function, or manufacturer with detailed specifications.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Cable className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Access Control Wiring</CardTitle>
                    <CardDescription>
                      Wiring diagrams for electrified hardware, card readers, REX devices, strikes, and power transfer with system integration requirements.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <FileCheck className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Compliance Tracking</CardTitle>
                    <CardDescription>
                      Automatic violation detection across 19 building codes (ADA, IBC, NFPA 80/101, BHMA, UL) with resolution workflows and audit trails.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <MessageSquare className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Customer Preferences</CardTitle>
                    <CardDescription>
                      Track customer-specific preferences for finishes, manufacturers, hardware types, and standard configurations for consistent estimating.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Master Key System Module */}
            <div className="mb-8 md:mb-16" id="master-key-system">
              <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold" data-testid="text-masterkey-heading">Master Key System Module</h3>
                <Badge variant="secondary" className="ml-2">Beta</Badge>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate" data-testid="card-masterkey-hierarchy">
                  <CardHeader>
                    <Network className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Hierarchical Key Structure</CardTitle>
                    <CardDescription>
                      Complete GMK → MK → SMK → CHANGE key hierarchy visualization. Design master key systems with 4 levels of access control, automatic bitting assignment, and visual tree diagrams.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-masterkey-matrix">
                  <CardHeader>
                    <Layers className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Door-Key Matrix</CardTitle>
                    <CardDescription>
                      Interactive matrix showing which keys operate which doors. Color-coded access levels, bulk assignment tools, and one-click verification for entire buildings or floors.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-masterkey-presets">
                  <CardHeader>
                    <Factory className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Manufacturer Presets</CardTitle>
                    <CardDescription>
                      Pre-configured keyway systems for Schlage, Kwikset, Sargent, Yale, Corbin-Russwin, and Best. Automatic bitting code validation per manufacturer specifications.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-masterkey-tree">
                  <CardHeader>
                    <Eye className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Visual Key Tree</CardTitle>
                    <CardDescription>
                      Interactive hierarchical tree visualization of your keying system. Expand/collapse levels, hover for door assignments, and one-click navigation to any key or door.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-masterkey-export">
                  <CardHeader>
                    <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Secure Export with Redaction</CardTitle>
                    <CardDescription>
                      Export key schedules to Excel with configurable redaction levels. Hide bitting codes for customer copies while maintaining full data for internal records.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-masterkey-construction">
                  <CardHeader>
                    <Lock className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Construction Keying</CardTitle>
                    <CardDescription>
                      Manage temporary construction keys that auto-expire on project completion. Track key distribution with chain-of-custody logging and automatic lockout protocols.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Project Management & Sales Integration */}
            <div className="mb-8 md:mb-16" id="project-management">
              <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Workflow className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold" data-testid="text-pm-heading">Project Management & Sales Integration</h3>
                <Badge variant="default" className="ml-2">New</Badge>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate border-primary/30" data-testid="card-pm-board">
                  <CardHeader>
                    <Layers className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>PM Board with Kanban Tracking</CardTitle>
                    <CardDescription>
                      Visual kanban-style task board with 7 project phases from Pre-Contract to Closeout. 27+ task templates covering Division 8 and Division 28 scopes with real-time status tracking.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-pm-oversight">
                  <CardHeader>
                    <Users className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>PM/Manager Oversight</CardTitle>
                    <CardDescription>
                      Dedicated project manager dashboards with real-time status tracking. Monitor all active projects, team assignments, deadlines, and resource allocation from a single view.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-pm-pipeline">
                  <CardHeader>
                    <Pipeline className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Sales Pipeline Flow</CardTitle>
                    <CardDescription>
                      Visual kanban-style pipeline from lead to close. Track opportunities through Survey → Quote → Approval → PO → Install stages with conversion analytics and forecasting.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-pm-notifications">
                  <CardHeader>
                    <Zap className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Milestone Notifications</CardTitle>
                    <CardDescription>
                      Automated email alerts for critical project milestones. Quote expiration warnings, PO acknowledgment confirmations, delivery date updates, and installation scheduling reminders.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-pm-approvals">
                  <CardHeader>
                    <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Approval Workflows</CardTitle>
                    <CardDescription>
                      Configurable approval chains for quotes, change orders, and procurement. Multi-level sign-off with role-based permissions and automatic escalation timers.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-pm-activity">
                  <CardHeader>
                    <Activity className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Team Activity Feed</CardTitle>
                    <CardDescription>
                      Real-time activity stream showing quote updates, survey completions, customer responses, and team notes. Filter by project, user, or activity type.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-pm-metrics">
                  <CardHeader>
                    <Target className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Track individual and team KPIs: quotes generated, win rates, average deal size, response times, and customer satisfaction scores with trend analysis.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Procurement & Order Management */}
            <div className="mb-8 md:mb-16" id="procurement">
              <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold" data-testid="text-procurement-heading">Procurement & Order Management</h3>
                <Badge variant="default" className="ml-2">New</Badge>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate border-primary/30" data-testid="card-procurement-redflags">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Procurement Red-Flag System</CardTitle>
                    <CardDescription>
                      Automatic validation catches missing specs before you order. 8 validation checks for catalog numbers, voltage, finish, fire rating, and handing—reducing manufacturer order errors by 80%+.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-procurement-vendors">
                  <CardHeader>
                    <Factory className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Vendor Account Management</CardTitle>
                    <CardDescription>
                      Manage distributor and manufacturer accounts with pricing tiers, discount schedules, and preferred supplier rankings. Track account status and credit terms.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-procurement-orderforms">
                  <CardHeader>
                    <FileText className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Manufacturer Order Forms</CardTitle>
                    <CardDescription>
                      Auto-generate manufacturer-specific PO forms with correct product codes, pricing, and specifications. Template library for Allegion, ASSA ABLOY, dormakaba, and more.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-procurement-tracking">
                  <CardHeader>
                    <Truck className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Shipment Tracking</CardTitle>
                    <CardDescription>
                      Track orders through the procurement lifecycle: PO Sent → Acknowledged → Partial Ship → Complete. Automatic status updates and delivery date notifications.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-procurement-discounts">
                  <CardHeader>
                    <Receipt className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Discount Management</CardTitle>
                    <CardDescription>
                      Configure manufacturer-specific discount structures with multiplier tiers, special pricing agreements, and automatic cost-to-net calculations per product line.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-procurement-inventory">
                  <CardHeader>
                    <Package className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Inventory Optimization</CardTitle>
                    <CardDescription>
                      Suggested reorder points based on historical usage. Lead time tracking per manufacturer and automatic alerts when stock levels hit thresholds.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate" data-testid="card-procurement-webhooks">
                  <CardHeader>
                    <Webhook className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Integration Webhooks</CardTitle>
                    <CardDescription>
                      Real-time webhook delivery for procurement events. HMAC-SHA256 signed payloads integrate with your ERP, accounting, or inventory management systems.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Quote Analytics & Business Intelligence */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Quote Analytics & Business Intelligence</h3>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <PieChart className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>KPI Dashboard</CardTitle>
                    <CardDescription>
                      Track closing ratios, profit margins, quote aging, and win rates. Real-time metrics help identify opportunities and optimize pricing strategies for maximum profitability.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <LineChart className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Comprehensive Search & Filters</CardTitle>
                    <CardDescription>
                      Search quotes by customer name, product type, or project details. Advanced filtering with date ranges, status filters, and custom criteria for instant data access.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Award className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Quote Versioning & History</CardTitle>
                    <CardDescription>
                      Complete version control with snapshot and restore capabilities. Track all changes, compare versions, and maintain audit trails for every quote modification.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <TrendingUp className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Project Duplication</CardTitle>
                    <CardDescription>
                      Duplicate successful projects for new customers instantly. Maintain pricing templates and standard configurations to accelerate quote generation.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <DollarSign className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Cost Update Management</CardTitle>
                    <CardDescription>
                      Refresh pricing on outdated quotes with current material costs. Track cost changes over time and maintain competitive pricing accuracy.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Workflow className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Quote Classification</CardTitle>
                    <CardDescription>
                      Categorize projects by type: aftermarket, tenant improvement, new construction, hardware only, automation only, repair, or ROM for better tracking and reporting.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Advanced Estimation & Cost Management */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Calculator className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Advanced Estimation & Cost Management</h3>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <Calculator className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Modular Estimation System</CardTitle>
                    <CardDescription>
                      Production-ready calculator architecture with 4 specialized modules: LaborCalculator (installation time, complexity, rush handling), FreightCalculator (weight/distance tiers), MaterialCalculator (list-to-net pricing), and InstallationCalculator (opening-specific prep time). ProjectEstimator orchestrates comprehensive breakdowns with configurable rate cards.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Database className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Hardware Catalog Database</CardTitle>
                    <CardDescription>
                      Comprehensive reference database with 39 hardware items across 18 categories (locks, hinges, closers, exit devices, strikes, access control), 7 BHMA finishes, 4 lock functions, 39 brand-specific function codes, and 6 code compliance rules. Accessible to all authenticated users for rapid specification.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Package className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>BOM Templates (Bill of Materials)</CardTitle>
                    <CardDescription>
                      Pre-configured hardware sets for instant application: exit device pairs, automatic operators, glazing seals, and storefront accessories. Each template includes complete specifications (manufacturer, model, quantity, finish, handing, fire rating, installation notes) for intelligent BOM generation.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <LineChart className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Cost Breakdown Analytics</CardTitle>
                    <CardDescription>
                      Detailed project estimates with materials (list/net pricing, markups), labor (hours, days, technicians), freight (weight-based tiers), subtotals, profit margins, discounts, and total cost. All calculations use merged labor rates from configuration with rush multipliers and tier-based pricing.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Professional Export Integration</CardTitle>
                    <CardDescription>
                      Hardware schedule PDF/Excel exports automatically calculate net prices from list price and discount percentages, build keying summaries from key blank and symbol fields, and apply proper schema alignment for accurate documentation.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Gauge className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Dynamic Pricing Configuration</CardTitle>
                    <CardDescription>
                      No more hard-coded rates. All pricing pulled from configurable rate cards with support for custom labor rates, markup percentages, profit margins, and tier-based freight costs. Update pricing globally without code changes.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Quoting & Procurement */}
            <div className="mb-8 md:mb-16">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Quoting & Procurement</h3>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <FileText className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Manufacturer Quotes</CardTitle>
                    <CardDescription>
                      Generate professional quote requests with automated PDF generation, email delivery to manufacturers, and response tracking with attachments.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Network className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Partner Pricing Comparison</CardTitle>
                    <CardDescription>
                      Multi-partner price comparison with automatic code conversion, cached pricing (30-min TTL), and unmapped code tracking for distributors and fabricators.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <ShoppingCart className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Purchase Order Management</CardTitle>
                    <CardDescription>
                      Create and track POs with line items, delivery dates, vendor management, approval workflows, and receiving documentation.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Calculator className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Landed Cost Calculator</CardTitle>
                    <CardDescription>
                      International trade calculations with import duties, tariff rates, anti-dumping duties, freight allocation, customs brokerage, and per-unit cost breakdowns.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <DollarSign className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Cost Tracking</CardTitle>
                    <CardDescription>
                      Comprehensive project cost tracking with custom shipping cost overrides, labor estimates, material costs, and profit margin analysis.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Globe className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>International Trade</CardTitle>
                    <CardDescription>
                      HS code classification, country of origin tracking, Incoterms support, customs documentation, and landed cost calculations for global procurement.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <FileBarChart className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Scope of Work</CardTitle>
                    <CardDescription>
                      Define project scope, deliverables, exclusions, and terms with templates. Generate professional SOW documents with line-item pricing.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Receipt className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Sales Funnel</CardTitle>
                    <CardDescription>
                      Lead capture, opportunity tracking, quote conversion pipeline, win/loss analysis, and sales performance metrics with CRM sync.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            {/* Platform & Security */}
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 px-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Platform & Security</h3>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <Lock className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Secure Sign-In</CardTitle>
                    <CardDescription>
                      OpenID Connect authentication with session-based security, Google Login support, and PostgreSQL session storage with automatic cleanup.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Enterprise Security</CardTitle>
                    <CardDescription>
                      CSRF protection, rate limiting, webhook signature verification, audit logging, and timing-safe comparison for all external integrations.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Workflow className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Health Monitoring</CardTitle>
                    <CardDescription>
                      Production-ready health checks (liveness, readiness, metrics) with Real User Monitoring (RUM) via Web Vitals tracking and error reporting.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <BookOpen className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Audit Logging</CardTitle>
                    <CardDescription>
                      Winston-based structured logging with JSON output. Comprehensive audit trails for critical operations, security events, and user actions.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Webhook className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Webhook Integration</CardTitle>
                    <CardDescription>
                      Secure webhook endpoints for GitHub and external integrations with signature verification and rate limiting (100 req/15min).
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <Zap className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Demo/Sandbox Environment</CardTitle>
                    <CardDescription>
                      Comprehensive demo environment for sales demonstrations with realistic data, automated seeding, and easy reset capabilities for clean presentations.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Social Proof / Stats */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-2">Trusted by Industry Leaders</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                Join hundreds of commercial door professionals who have transformed their workflow
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 text-center mb-10 md:mb-16">
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-1 md:mb-2" data-testid="stat-projects">1,000+</div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Projects Completed</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-1 md:mb-2" data-testid="stat-openings">50,000+</div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Door Openings Surveyed</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-1 md:mb-2" data-testid="stat-compliance">99%</div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Compliance Rate</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-1 md:mb-2" data-testid="stat-rating">
                  4.9
                  <Star className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 fill-primary shrink-0" />
                </div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Average Rating</div>
              </div>
            </div>

            {/* Customer Logos */}
            <div className="border-t pt-8 md:pt-12">
              <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6 md:mb-8">Trusted by leading contractors and service providers</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 items-center justify-items-center max-w-4xl mx-auto">
                <div className="text-center" data-testid="customer-logo-1">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground/40 mx-auto mb-1.5 md:mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Metro Security Solutions</p>
                </div>
                <div className="text-center" data-testid="customer-logo-2">
                  <Shield className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground/40 mx-auto mb-1.5 md:mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Premier Access Systems</p>
                </div>
                <div className="text-center" data-testid="customer-logo-3">
                  <Key className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground/40 mx-auto mb-1.5 md:mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Keystone Locksmith Co.</p>
                </div>
                <div className="text-center" data-testid="customer-logo-4">
                  <Wrench className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground/40 mx-auto mb-1.5 md:mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">BuildRight Hardware</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Testimonials */}
        <section className="py-12 md:py-20 bg-muted/30" id="testimonials">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="text-center mb-10 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Award className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Customer Success Stories
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-2">What Our Customers Say</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                Real feedback from professionals using DoorSurvey Pro every day
              </p>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
              {/* Testimonial 1 - Locksmith */}
              <Card className="hover-elevate" data-testid="testimonial-locksmith">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Key className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">Mike Rodriguez</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Master Locksmith, Metro Security</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-primary text-primary shrink-0" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground italic">
                    "The master keying system tracking is a game changer. I can manage construction keys and permanent keys for 20+ buildings without spreadsheets. The hardware schedules are professional-grade and save me hours every week."
                  </p>
                </CardContent>
              </Card>

              {/* Testimonial 2 - Field Technician */}
              <Card className="hover-elevate" data-testid="testimonial-technician">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">Sarah Chen</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Field Technician, Premier Access</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-primary text-primary shrink-0" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground italic">
                    "Photo annotation and OCR on mobile are incredible. I complete surveys 60% faster now. The AI measurement validation catches my mistakes before I leave the site. Best tool I've used in 15 years."
                  </p>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-12 md:py-20" id="pricing">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Simple, Transparent Pricing
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-2">Choose the Right Plan for Your Team</h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                Full launch 2026. Request early access to join our private beta program.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
              {/* Free Tier */}
              <Card className="relative hover-elevate" data-testid="card-pricing-free">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl">Free</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">For trying out the platform</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">$0</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>3 projects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>1 user</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>5 barcode scans/day</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Basic survey tools</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Mobile data collection</span>
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full text-sm sm:text-base" onClick={handleLogin} data-testid="button-pricing-free">
                    Join Waitlist
                  </Button>
                </CardContent>
              </Card>

              {/* Starter Tier */}
              <Card className="relative hover-elevate" data-testid="card-pricing-starter">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl">Starter / Solo</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">For independent professionals</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">$39</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/month</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-green-600 mt-1">Save 33% annually ($26/mo)</p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>5 projects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>1 user</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>10 barcode scans/day</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Photo OCR & annotation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Quote generation</span>
                    </li>
                  </ul>
                  <Button className="w-full text-sm sm:text-base" onClick={handleLogin} data-testid="button-pricing-starter">
                    Request Early Access
                  </Button>
                </CardContent>
              </Card>

              {/* Professional Tier - Popular */}
              <Card className="relative border-primary shadow-lg sm:scale-105 hover-elevate" data-testid="card-pricing-professional">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm shrink-0">Most Popular</Badge>
                </div>
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl">Professional / Team</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">For small to mid-size teams</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">$129</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/month</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-green-600 mt-1">Save 33% annually ($86/mo)</p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="font-medium">Unlimited projects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Up to 10 users</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="font-medium">Unlimited barcode scans</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Custom catalogs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Advanced reporting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Manufacturer auto-docs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <Button className="w-full text-sm sm:text-base" onClick={handleLogin} data-testid="button-pricing-professional">
                    Request Early Access
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise Tier */}
              <Card className="relative hover-elevate" data-testid="card-pricing-enterprise">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Enterprise</CardTitle>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  </div>
                  <CardDescription className="text-xs sm:text-sm">For large organizations</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">$399</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/month</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-green-600 mt-1">Save 33% annually ($266/mo)</p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="font-medium">Everything in Professional</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="font-medium">Unlimited users</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>AI-powered audits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>API access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>CRM sync (HubSpot)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Dedicated success manager</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span>Engineering review workflow</span>
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full text-sm sm:text-base" onClick={() => setLeadFormOpen(true)} data-testid="button-pricing-enterprise">
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Add-ons Section */}
            <div className="mt-10 sm:mt-12 max-w-4xl mx-auto">
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Optional Add-ons</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Extend your plan with powerful integrations</p>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-lg border bg-card text-center">
                  <Database className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm">Manufacturer DB</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Extended barcode & hardware data</p>
                  <p className="text-base sm:text-lg font-bold">$49<span className="text-[10px] sm:text-xs font-normal">/mo</span></p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg border bg-card text-center">
                  <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm">AI Diagnostics</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Advanced analytics & health signals</p>
                  <p className="text-base sm:text-lg font-bold">$79<span className="text-[10px] sm:text-xs font-normal">/mo</span></p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg border bg-card text-center">
                  <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm">Offline Sync Pack</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Add 5 more field devices</p>
                  <p className="text-base sm:text-lg font-bold">$20<span className="text-[10px] sm:text-xs font-normal">/mo</span></p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg border bg-card text-center">
                  <ClipboardCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm">Engineering Review</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Professional quote workflow</p>
                  <p className="text-base sm:text-lg font-bold">$99<span className="text-[10px] sm:text-xs font-normal">/mo</span></p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="text-center mb-10 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <HelpCircle className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 px-2">Common Questions</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                Everything you need to know about DoorSurvey Pro
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
              <Card className="hover-elevate" data-testid="card-faq-multitenant">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg" data-testid="text-faq-multitenant-question">How does multi-tenant data isolation work?</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-faq-multitenant-answer">
                    DoorSurvey Pro uses organization-based data isolation with PostgreSQL. Every project, opening, photo, and quote is strictly associated with your organization ID. Our backend enforces these boundaries at the database level, ensuring your data is never visible to other organizations.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-faq-lidar">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg" data-testid="text-faq-lidar-question">Can I use my own iPhone for LiDAR scanning?</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-faq-lidar-answer">
                    Yes! Any iPhone or iPad with LiDAR capability (iPhone 12 Pro and newer, iPad Pro) works with our platform. Our triple-scan protocol requires three scans per opening: door open (both sides visible), door closed from Side A, and door closed from Side B. Upload PLY, OBJ, or JSON scan files via the web interface. The system tracks scan completion status and processes point clouds with automatic measurement extraction.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-faq-codes">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg" data-testid="text-faq-codes-question">Which building codes are supported for compliance checking?</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-faq-codes-answer">
                    We support 19 major building codes including IBC (International Building Code), NFPA 80/101 (fire doors and life safety), ADA (accessibility), ANSI/BHMA (hardware standards), UL listings, and more. The system automatically flags violations and provides resolution workflows.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-faq-barcode">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg" data-testid="text-faq-barcode-question">How does barcode scanning identify hardware?</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-faq-barcode-answer">
                    Our browser-based barcode scanner uses @zxing/library to read QR codes, Code 128, Data Matrix, UPC, and EAN barcodes directly from your camera or uploaded images. The system intelligently parses manufacturer SKUs, model numbers, and finish codes to auto-populate hardware specifications.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-faq-catalog">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg" data-testid="text-faq-catalog-question">What is the door/frame options catalog?</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-faq-catalog-answer">
                    The catalog includes 38 pre-configured options (30 door + 8 frame) organized hierarchically by market, material, core type, finishes, fire ratings, glazing, and dimensions. The system validates cross-field dependencies in real-time, ensuring fire-rated doors have proper glazing, electrified hardware has power transfer, and ADA clear width requirements are met.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-faq-pricing">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg" data-testid="text-faq-pricing-question">How does partner pricing comparison work?</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-faq-pricing-answer">
                    The partner pricing system converts your internal door/frame codes to partner-specific codes, queries multiple distributors and fabricators simultaneously, caches results for 30 minutes, and displays sorted pricing with availability. It supports both organization-specific and system-wide code mappings for flexibility.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 md:py-20 bg-gradient-to-br from-primary/10 via-background to-muted/20">
          <div className="container mx-auto px-3 sm:px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-2 md:mb-4">
                <Rocket className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Ready for the Future?
              </div>
              
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2">
                Transform Your Door Survey Workflow Today
              </h2>
              
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-2">
                Join hundreds of commercial door professionals who trust DoorSurvey Pro to streamline their operations, ensure compliance, and grow their business.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center pt-2 md:pt-4 px-4">
                <Button onClick={() => setDemoFormOpen(true)} size="lg" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto" data-testid="button-cta-demo">
                  Schedule a Demo
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                </Button>
                <Button onClick={handleLogin} size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto" data-testid="button-cta-trial">
                  Beta Tester Login
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 pt-4 md:pt-6 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                  Full Launch 2026
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                  Private Beta Active
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                  Enterprise-grade security
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 md:py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-6 md:mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center mb-3 md:mb-4">
                <img src={logoWithTextImage} alt="DoorSurvey Pro" className="h-10 md:h-12 object-contain" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                The complete platform for commercial door surveying, estimation, and procurement.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Product</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => setDemoFormOpen(true)} className="hover:text-foreground transition-colors">Request Demo</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Pricing</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Security</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Company</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                <li><button onClick={() => setLeadFormOpen(true)} className="hover:text-foreground transition-colors">Contact</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">About</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Blog</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Careers</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Support</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Documentation</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">Help Center</button></li>
                <li><button onClick={handleLogin} className="hover:text-foreground transition-colors">API Reference</button></li>
                <li><button onClick={() => setLeadFormOpen(true)} className="hover:text-foreground transition-colors">Contact Support</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Contact</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                <li><a href={`mailto:${COMPANY_EMAILS.sales}`} className="hover:text-foreground transition-colors">Sales</a></li>
                <li><a href={`mailto:${COMPANY_EMAILS.support}`} className="hover:text-foreground transition-colors">Support</a></li>
                <li><a href={`mailto:${COMPANY_EMAILS.partnerships}`} className="hover:text-foreground transition-colors">Partnerships</a></li>
                <li><a href={`mailto:${COMPANY_EMAILS.contact}`} className="hover:text-foreground transition-colors">General Inquiries</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-6 md:pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs md:text-sm text-muted-foreground">
            <p>&copy; 2025 DoorSurvey Pro. All rights reserved.</p>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <a href={`mailto:${COMPANY_EMAILS.privacy}`} className="hover:text-foreground transition-colors">Privacy</a>
              <a href={`mailto:${COMPANY_EMAILS.legal}`} className="hover:text-foreground transition-colors">Legal</a>
              <a href={`mailto:${COMPANY_EMAILS.contact}`} className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Form Dialog */}
      <Dialog open={leadFormOpen} onOpenChange={setLeadFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Sales</DialogTitle>
            <DialogDescription>
              Fill out the form below and our team will get back to you within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleLeadSubmit(e, false)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name *</Label>
                <Input
                  id="contact-name"
                  data-testid="input-contact-name"
                  required
                  value={leadForm.contactName}
                  onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email *</Label>
                <Input
                  id="contact-email"
                  data-testid="input-contact-email"
                  type="email"
                  required
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  data-testid="input-contact-phone"
                  type="tel"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-company">Company Name *</Label>
                <Input
                  id="contact-company"
                  data-testid="input-contact-company"
                  required
                  value={leadForm.companyName}
                  onChange={(e) => setLeadForm({ ...leadForm, companyName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-title">Job Title</Label>
                <Input
                  id="contact-title"
                  data-testid="input-contact-title"
                  value={leadForm.jobTitle}
                  onChange={(e) => setLeadForm({ ...leadForm, jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-company-size">Company Size</Label>
                <Select
                  value={leadForm.companySize}
                  onValueChange={(value) => setLeadForm({ ...leadForm, companySize: value })}
                >
                  <SelectTrigger id="contact-company-size" data-testid="select-company-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501+">501+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-interested">What are you interested in?</Label>
              <Select
                value={leadForm.interestedIn}
                onValueChange={(value) => setLeadForm({ ...leadForm, interestedIn: value })}
              >
                <SelectTrigger id="contact-interested" data-testid="select-interested-in">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field-surveys">Field Surveys & Data Capture</SelectItem>
                  <SelectItem value="compliance-tracking">Compliance Tracking</SelectItem>
                  <SelectItem value="hardware-management">Hardware Management</SelectItem>
                  <SelectItem value="quoting-procurement">Quoting & Procurement</SelectItem>
                  <SelectItem value="team-collaboration">Team Collaboration</SelectItem>
                  <SelectItem value="full-platform">Full Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-notes">Additional Information</Label>
              <Textarea
                id="contact-notes"
                data-testid="textarea-contact-notes"
                rows={4}
                placeholder="Tell us about your needs..."
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeadFormOpen(false)}
                data-testid="button-cancel-contact"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="button-submit-contact"
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Demo Request Dialog */}
      <Dialog open={demoFormOpen} onOpenChange={setDemoFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a Demo</DialogTitle>
            <DialogDescription>
              See DoorSurvey Pro in action. We'll schedule a personalized demo for your team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleLeadSubmit(e, true)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-name">Name *</Label>
                <Input
                  id="demo-name"
                  data-testid="input-demo-name"
                  required
                  value={leadForm.contactName}
                  onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-email">Email *</Label>
                <Input
                  id="demo-email"
                  data-testid="input-demo-email"
                  type="email"
                  required
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-phone">Phone *</Label>
                <Input
                  id="demo-phone"
                  data-testid="input-demo-phone"
                  type="tel"
                  required
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-company">Company Name *</Label>
                <Input
                  id="demo-company"
                  data-testid="input-demo-company"
                  required
                  value={leadForm.companyName}
                  onChange={(e) => setLeadForm({ ...leadForm, companyName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-title">Job Title</Label>
              <Input
                id="demo-title"
                data-testid="input-demo-title"
                value={leadForm.jobTitle}
                onChange={(e) => setLeadForm({ ...leadForm, jobTitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-notes">What would you like to see in the demo?</Label>
              <Textarea
                id="demo-notes"
                data-testid="textarea-demo-notes"
                rows={4}
                placeholder="Tell us about your specific needs or use cases..."
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDemoFormOpen(false)}
                data-testid="button-cancel-demo"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="button-submit-demo"
              >
                {submitting ? "Submitting..." : "Request Demo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
