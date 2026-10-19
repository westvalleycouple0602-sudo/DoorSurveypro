import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, Plug, CreditCard, Shield, Building2, Key
} from "lucide-react";

const settingsCategories = [
  {
    title: "Profile",
    description: "Manage your personal information and preferences",
    icon: User,
    href: "/profile",
    testId: "link-settings-profile",
  },
  {
    title: "Organization",
    description: "Configure company details and branding",
    icon: Building2,
    href: "/branding",
    testId: "link-settings-branding",
  },
  {
    title: "Integrations",
    description: "Connect HubSpot and other tools",
    icon: Plug,
    href: "/integrations",
    testId: "link-settings-integrations",
  },
  {
    title: "Plan & Usage",
    description: "View your plan and usage",
    icon: CreditCard,
    href: "/billing",
    testId: "link-settings-billing",
  },
  {
    title: "Security",
    description: "Password, two-factor authentication, and sessions",
    icon: Shield,
    href: "/profile",
    testId: "link-settings-security",
  },
  {
    title: "API Keys",
    description: "Generate and manage API access tokens",
    icon: Key,
    href: "/api-keys",
    testId: "link-settings-api-keys",
  },
];

export default function AccountSettings() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account, integrations, and preferences</p>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.href + category.title} href={category.href} data-testid={category.testId}>
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{category.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{category.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
