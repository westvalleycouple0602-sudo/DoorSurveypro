import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight, Rocket } from "lucide-react";
import { 
  SUBSCRIPTION_TIERS, 
  formatPrice, 
  getAnnualSavingsPercent,
  type BillingInterval 
} from "@shared/subscriptions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import SEOHead from "@/components/SEOHead";
import { trackProjectEvent } from "@/lib/project-analytics";
import logoIconImage from "@assets/logo-icon-only.png";

const FEATURE_LABELS: Record<string, string> = {
  projectLimit: "Projects",
  userLimit: "Team Members",
  barcodeScanLimit: "Daily Barcode Scans",
  customCatalogs: "Custom Catalogs",
  apiAccess: "API Access",
  prioritySupport: "Priority Support",
  advancedReporting: "Advanced Reporting",
  manufacturerAutoDocs: "Manufacturer Auto-Docs",
  liveDistributorPricing: "Live Distributor Pricing",
  calendarSync: "Calendar Sync",
  aiAudits: "AI-Powered Audits",
  crmSync: "CRM Integration",
  dedicatedSuccessManager: "Dedicated Success Manager",
  engineeringReview: "Engineering Review",
};

const DISPLAY_TIERS = ["free", "starter", "professional", "enterprise"] as const;

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const annualSavings = getAnnualSavingsPercent();

  const handleGetStarted = (tier: string) => {
    trackProjectEvent("plan_selected", {
      plan: tier,
      billing_interval: billingInterval,
      location: "pricing",
    });
    if (tier === "free") {
      window.location.href = "/login";
    } else {
      window.location.href = `/login?plan=${tier}&interval=${billingInterval}`;
    }
  };

  const handleContactSales = () => {
    trackProjectEvent("sales_contact_clicked", { location: "pricing" });
    window.location.href = "/#contact";
  };

  return (
    <>
      <SEOHead 
        title="Pricing - DoorSurvey Pro"
        description="Choose the right plan for your commercial door surveying needs. Free, Starter, Professional, and Enterprise tiers available. Full launch 2026."
      />
      <div className="min-h-screen bg-background">
        {/* Coming Soon Banner */}
        <div className="bg-primary text-primary-foreground py-3 px-4 text-center">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-sm md:text-base">
            <Rocket className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-semibold">Coming Soon — Full Launch 2026</span>
            <span className="hidden sm:inline text-primary-foreground/80">|</span>
            <span className="text-primary-foreground/80">Currently in private beta</span>
          </div>
        </div>
        
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-2 sm:gap-3 min-w-0" data-testid="link-home">
              <img src={logoIconImage} alt="DoorSurvey Pro" className="h-8 w-8 sm:h-10 sm:w-10 object-contain shrink-0" />
              <span className="text-lg sm:text-xl font-semibold truncate">DoorSurvey Pro</span>
            </a>
            <div className="flex items-center gap-2 sm:gap-4">
              <a href="/" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground" data-testid="link-features">
                Features
              </a>
              <a href="/pricing" className="hidden sm:inline text-sm font-medium" data-testid="link-pricing-active">
                Pricing
              </a>
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/login"} data-testid="button-login">
                <span className="hidden sm:inline">Beta Tester Login</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2" data-testid="heading-pricing">
              Simple, Transparent Pricing
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
              Full launch 2026. Request early access to join our private beta program.
            </p>
            
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <Label htmlFor="billing-toggle" className={`text-sm sm:text-base ${billingInterval === "monthly" ? "font-semibold" : "text-muted-foreground"}`}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={billingInterval === "annual"}
                onCheckedChange={(checked) => {
                  const interval = checked ? "annual" : "monthly";
                  setBillingInterval(interval);
                  trackProjectEvent("billing_interval_changed", {
                    billing_interval: interval,
                    location: "pricing",
                  });
                }}
                data-testid="switch-billing-interval"
              />
              <Label htmlFor="billing-toggle" className={`text-sm sm:text-base ${billingInterval === "annual" ? "font-semibold" : "text-muted-foreground"}`}>
                Annual
              </Label>
              {billingInterval === "annual" && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 shrink-0" data-testid="badge-annual-savings">
                  Save {annualSavings}%
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {DISPLAY_TIERS.map((tierKey) => {
              const tier = SUBSCRIPTION_TIERS[tierKey];
              const isPopular = 'popular' in tier && tier.popular;
              const price = billingInterval === "monthly" ? tier.priceMonthly : tier.priceAnnual;
              const monthlyPrice = billingInterval === "annual" ? Math.round(tier.priceAnnual / 12) : tier.priceMonthly;

              return (
                <Card 
                  key={tierKey} 
                  className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg sm:scale-105' : ''}`}
                  data-testid={`card-tier-${tierKey}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shrink-0" data-testid="badge-popular">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl" data-testid={`text-tier-name-${tierKey}`}>
                      {tier.name}
                    </CardTitle>
                    {'description' in tier && tier.description && (
                      <CardDescription>{tier.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="mb-4 sm:mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold" data-testid={`text-price-${tierKey}`}>
                          {formatPrice(monthlyPrice)}
                        </span>
                        <span className="text-sm sm:text-base text-muted-foreground">/month</span>
                      </div>
                      {billingInterval === "annual" && price > 0 && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Billed {formatPrice(price)} annually
                        </p>
                      )}
                      {tierKey !== "free" && (
                        <p className="text-xs sm:text-sm text-primary mt-2" data-testid={`text-trial-${tierKey}`}>
                          Available at launch 2026
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 sm:space-y-3">
                      {Object.entries(tier.features).map(([feature, value]) => {
                        const label = FEATURE_LABELS[feature] || feature;
                        let displayValue: string;
                        let included = true;

                        if (typeof value === "boolean") {
                          included = value;
                          displayValue = label;
                        } else if (value === null) {
                          displayValue = `Unlimited ${label.toLowerCase()}`;
                        } else {
                          displayValue = `${value} ${label.toLowerCase()}`;
                        }

                        return (
                          <li 
                            key={feature} 
                            className={`flex items-center gap-2 text-xs sm:text-sm ${!included ? 'text-muted-foreground' : ''}`}
                          >
                            {included ? (
                              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                            ) : (
                              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                            )}
                            <span>{displayValue}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-4 sm:p-6 pt-0 sm:pt-0">
                    {tierKey === "enterprise" ? (
                      <Button 
                        variant="outline" 
                        className="w-full text-sm sm:text-base" 
                        onClick={handleContactSales}
                        data-testid="button-contact-sales"
                      >
                        Contact Sales
                      </Button>
                    ) : (
                      <Button 
                        className="w-full text-sm sm:text-base" 
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleGetStarted(tierKey)}
                        data-testid={`button-get-started-${tierKey}`}
                      >
                        {tierKey === "free" ? "Join Waitlist" : "Request Early Access"}
                        <ArrowRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 sm:mt-16 text-center px-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Questions?</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Our team is here to help you choose the right plan for your business.
            </p>
            <Button variant="outline" onClick={handleContactSales} data-testid="button-contact-questions">
              Contact Us
            </Button>
          </div>
        </main>

        <footer className="border-t py-6 sm:py-8 mt-12 sm:mt-16">
          <div className="container mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} DoorSurvey Pro. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
