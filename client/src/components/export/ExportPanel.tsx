import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  getExportProfiles,
  getExportBranding,
  getProjectAlternatives,
  generateExport,
  type ExportOptions,
} from "@/lib/api/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download, Settings, Palette, FileDown } from "lucide-react";

interface ExportPanelProps {
  projectId: string;
  projectName: string;
}

const TEMPLATE_TYPES = [
  { value: "proposal", label: "Proposal" },
  { value: "installer_packet", label: "Installer Packet" },
  { value: "submittal", label: "Submittal" },
  { value: "summary_quote", label: "Summary Quote" },
  { value: "cut_sheet", label: "Cut Sheet" },
  { value: "change_order", label: "Change Order" },
] as const;

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF Document" },
  { value: "html", label: "HTML File" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
] as const;

export function ExportPanel({ projectId, projectName }: ExportPanelProps) {
  const { toast } = useToast();

  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "html">("pdf");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("proposal");
  const [selectedProfile, setSelectedProfile] = useState<string | undefined>();
  const [selectedBranding, setSelectedBranding] = useState<string | undefined>();
  const [selectedAlternative, setSelectedAlternative] = useState<string | undefined>();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["/api/export-profiles"],
    queryFn: getExportProfiles,
  });

  const { data: branding, isLoading: loadingBranding } = useQuery({
    queryKey: ["/api/export-branding"],
    queryFn: getExportBranding,
  });

  const { data: alternatives, isLoading: loadingAlternatives } = useQuery({
    queryKey: ["/api/projects", projectId, "alternatives"],
    queryFn: () => getProjectAlternatives(projectId),
  });

  const exportMutation = useMutation({
    mutationFn: (options: ExportOptions) => generateExport(options),
    onSuccess: (blob) => {
      const extension = selectedFormat === "pdf" ? "pdf" : "html";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `${projectName.replace(/[^a-z0-9]/gi, "_")}_${timestamp}.${extension}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `${filename} has been downloaded`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "export-history"] });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Unable to generate export. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      projectId,
      format: selectedFormat,
      templateType: selectedTemplate,
      profileId: selectedProfile,
      brandingId: selectedBranding,
      alternativeId: selectedAlternative,
      language: selectedLanguage,
    });
  };

  const defaultProfile = profiles?.find((p) => p.isDefault);
  const defaultBranding = branding?.find((b) => b.isDefault);

  const isLoading = loadingProfiles || loadingBranding || loadingAlternatives;
  const isExporting = exportMutation.isPending;

  return (
    <Card data-testid="card-export-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Export Project
        </CardTitle>
        <CardDescription>
          Configure and download professional project documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" data-testid="tab-quick-export">
              Quick Export
            </TabsTrigger>
            <TabsTrigger value="advanced" data-testid="tab-advanced-export">
              Advanced Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format-quick">Format</Label>
              <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as "pdf" | "html")}>
                <SelectTrigger id="format-quick" data-testid="select-format-quick">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-quick">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template-quick" data-testid="select-template-quick">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {defaultProfile && (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Using default profile: <span className="font-medium">{defaultProfile.name}</span>
              </div>
            )}

            {defaultBranding && (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Using default branding: <span className="font-medium">{defaultBranding.name}</span>
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isLoading || isExporting}
              className="w-full"
              data-testid="button-export-quick"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Project
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format-advanced">Format</Label>
                  <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as "pdf" | "html")}>
                    <SelectTrigger id="format-advanced" data-testid="select-format-advanced">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger id="language" data-testid="select-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-advanced">Template Type</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template-advanced" data-testid="select-template-advanced">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((template) => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Export Profile
                </Label>
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger id="profile" data-testid="select-profile">
                    <SelectValue placeholder="Use default profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use default profile</SelectItem>
                    {profiles?.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                        {profile.isDefault && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branding" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Branding
                </Label>
                <Select value={selectedBranding} onValueChange={setSelectedBranding}>
                  <SelectTrigger id="branding" data-testid="select-branding">
                    <SelectValue placeholder="Use default branding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use default branding</SelectItem>
                    {branding?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                        {brand.isDefault && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {alternatives && alternatives.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="alternative" className="flex items-center gap-2">
                    <FileDown className="w-4 h-4" />
                    Pricing Alternative
                  </Label>
                  <Select value={selectedAlternative} onValueChange={setSelectedAlternative}>
                    <SelectTrigger id="alternative" data-testid="select-alternative">
                      <SelectValue placeholder="Base pricing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Base pricing</SelectItem>
                      {alternatives.map((alt) => (
                        <SelectItem key={alt.id} value={alt.id}>
                          {alt.label} - {alt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              onClick={handleExport}
              disabled={isLoading || isExporting}
              className="w-full"
              data-testid="button-export-advanced"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export with Selected Options
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
