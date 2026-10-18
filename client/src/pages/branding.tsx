import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Upload, Image, Save, Building2, FileText, Pen, Palette, Globe } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef } from "react";

const organizationProfileSchema = z.object({
  signatureName: z.string().optional(),
  signatureTitle: z.string().optional(),
  signaturePhone: z.string().optional(),
  signatureEmail: z.string().email().optional().or(z.literal("")),
  brandingColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  proposalContactName: z.string().optional(),
  proposalContactEmail: z.string().email().optional().or(z.literal("")),
  proposalContactPhone: z.string().optional(),
  proposalContactAddress: z.string().optional(),
});

type OrganizationProfileFormData = z.infer<typeof organizationProfileSchema>;

export default function Branding() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { 
    data: user, 
    isLoading: userLoading,
    isError: userError,
    error: userErrorObj,
    refetch: refetchUser
  } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { 
    data: branding, 
    isLoading: brandingLoading,
    isError: brandingError,
    error: brandingErrorObj,
    refetch: refetchBranding
  } = useQuery<any>({
    queryKey: ["/api/branding"],
    enabled: !!user,
  });

  const form = useForm<OrganizationProfileFormData>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      signatureName: "",
      signatureTitle: "",
      signaturePhone: "",
      signatureEmail: "",
      brandingColor: "",
      websiteUrl: "",
      proposalContactName: "",
      proposalContactEmail: "",
      proposalContactPhone: "",
      proposalContactAddress: "",
    },
    values: branding ? {
      signatureName: branding.signatureName || "",
      signatureTitle: branding.signatureTitle || "",
      signaturePhone: branding.signaturePhone || "",
      signatureEmail: branding.signatureEmail || "",
      brandingColor: branding.brandingColor || "",
      websiteUrl: branding.websiteUrl || "",
      proposalContactName: branding.proposalContactName || "",
      proposalContactEmail: branding.proposalContactEmail || "",
      proposalContactPhone: branding.proposalContactPhone || "",
      proposalContactAddress: branding.proposalContactAddress || "",
    } : undefined,
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: OrganizationProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/branding", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({
        title: "Settings updated successfully",
        description: "Your organization settings have been saved",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to update settings",
        description: errorMessage.includes("validation") || errorMessage.includes("invalid")
          ? "Please check your settings and try again"
          : errorMessage.includes("permission") || errorMessage.includes("unauthorized")
          ? "You don't have permission to update organization settings"
          : errorMessage || "Unable to save settings. Please try again",
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      
      const res = await fetch("/api/branding/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      setUploadingLogo(false);
      setPreviewUrl(null);
      toast({
        title: "Logo uploaded successfully",
        description: "Your organization logo has been saved and will appear on documents",
      });
    },
    onError: (error: Error) => {
      setUploadingLogo(false);
      setPreviewUrl(null);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to upload logo",
        description: errorMessage.includes("size") || errorMessage.includes("large")
          ? "Logo file is too large. Please use an image under 2MB"
          : errorMessage.includes("type") || errorMessage.includes("format")
          ? "Invalid file type. Please upload a JPEG, PNG, SVG, or WebP image"
          : errorMessage.includes("storage") || errorMessage.includes("space")
          ? "Not enough storage space. Please contact support"
          : errorMessage || "Unable to upload logo. Please try again",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only JPEG, PNG, SVG, and WebP images are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Logo must be smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    uploadLogoMutation.mutate(file);
  };

  const onSubmit = (data: OrganizationProfileFormData) => {
    updateBrandingMutation.mutate(data);
  };

  const isLoading = userLoading || brandingLoading;
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-branding">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load user profile"
          message={userErrorObj instanceof Error ? userErrorObj.message : "Unable to verify your permissions"}
          error={userErrorObj as Error}
          onRetry={refetchUser}
          testId="error-user"
        />
      </div>
    );
  }

  if (brandingError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load organization settings"
          message={brandingErrorObj instanceof Error ? brandingErrorObj.message : "Unable to fetch organization settings"}
          error={brandingErrorObj as Error}
          onRetry={refetchBranding}
          testId="error-branding"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8" data-testid="page-branding-unauthorized">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              You need admin or owner privileges to manage organization settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-branding">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2" data-testid="heading-branding">
          Organization Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your organization's profile, branding, and contact information for quotes and proposals.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* Section 1: Organization Logo */}
          <Card data-testid="card-logo-upload">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Image className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Organization Logo
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload your company logo to appear on quotes, proposals, and other documents. Recommended: PNG or SVG with transparent background, max 2MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3 sm:space-y-4">
              {(branding?.logoUrl || previewUrl) && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                  <div className="border rounded-md p-3 sm:p-4 bg-card w-full sm:w-auto">
                    <img
                      src={previewUrl || branding.logoUrl}
                      alt="Organization Logo"
                      className="max-w-full sm:max-w-[200px] max-h-[80px] sm:max-h-[100px] object-contain mx-auto sm:mx-0"
                      data-testid="img-logo-preview"
                    />
                  </div>
                  {uploadingLogo && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-logo-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  disabled={uploadingLogo}
                  className="text-xs sm:text-sm"
                  data-testid="button-upload-logo"
                >
                  <Upload className="h-4 w-4 mr-2 shrink-0" />
                  {branding?.logoUrl ? "Replace Logo" : "Upload Logo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Organization Details */}
          <Card data-testid="card-organization-details">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Organization Details
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Basic information about your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <FormLabel className="text-sm">Company Name</FormLabel>
                <Input
                  value={branding?.organizationName || user?.organization?.name || ""}
                  disabled
                  className="text-sm bg-muted"
                  data-testid="input-company-name"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Organization name is set during account creation
                </p>
              </div>

              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Website URL</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://www.example.com"
                          className="text-sm flex-1"
                          data-testid="input-website-url"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Your company website address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 3: Proposal Header Contact */}
          <Card data-testid="card-proposal-contact">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Proposal Header Contact
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                This contact information appears in the header of proposals and quotes sent to clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="proposalContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Jane Smith, Sales Manager"
                          className="text-sm"
                          data-testid="input-proposal-contact-name"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Name and title for proposal header
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposalContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="sales@company.com"
                          className="text-sm"
                          data-testid="input-proposal-contact-email"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Email for client inquiries
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="proposalContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="text-sm"
                          data-testid="input-proposal-contact-phone"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Phone number for client contact
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposalContactAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Address</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={"123 Main St\nSuite 100\nCity, State 12345"}
                          className="text-sm resize-none min-h-[80px]"
                          rows={3}
                          data-testid="input-proposal-contact-address"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Mailing address for proposal header
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Quote Signature Block */}
          <Card data-testid="card-signature">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Pen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Quote Signature Block
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                This information will appear in the signature block at the end of quotes and proposals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="signatureName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John Smith"
                          className="text-sm"
                          data-testid="input-signature-name"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Name that appears in the signature block
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signatureTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="President / Project Manager"
                          className="text-sm"
                          data-testid="input-signature-title"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Job title or role
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="signatureEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="contact@company.com"
                          className="text-sm"
                          data-testid="input-signature-email"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Contact email address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signaturePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="text-sm"
                          data-testid="input-signature-phone"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Contact phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Brand Styling */}
          <Card data-testid="card-brand-styling">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Brand Styling
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Customize the visual appearance of your documents with brand colors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              <FormField
                control={form.control}
                name="brandingColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Primary Brand Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center min-w-0">
                        <Input
                          {...field}
                          placeholder="#0066CC"
                          className="font-mono text-sm flex-1 min-w-0 max-w-[200px]"
                          data-testid="input-branding-color"
                        />
                        {field.value && /^#[0-9A-F]{6}$/i.test(field.value) && (
                          <div
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border shrink-0"
                            style={{ backgroundColor: field.value }}
                            data-testid="preview-branding-color"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Hex color code for accent elements in documents (e.g., #0066CC)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateBrandingMutation.isPending}
              className="w-full sm:w-auto text-xs sm:text-sm"
              data-testid="button-save-branding"
            >
              {updateBrandingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2 shrink-0" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
