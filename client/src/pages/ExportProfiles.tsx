import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  getExportProfiles,
  createExportProfile,
  updateExportProfile,
  deleteExportProfile,
  type ExportProfile,
} from "@/lib/api/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Pencil, Trash2, FileText, Star, AlertTriangle } from "lucide-react";

const TEMPLATE_TYPES = [
  { value: "proposal", label: "Proposal" },
  { value: "installer_packet", label: "Installer Packet" },
  { value: "submittal", label: "Submittal" },
  { value: "summary_quote", label: "Summary Quote" },
  { value: "cut_sheet", label: "Cut Sheet" },
  { value: "change_order", label: "Change Order" },
];

const SCOPE_OPTIONS = [
  { value: "internal", label: "Internal Only" },
  { value: "client", label: "Client Facing" },
  { value: "both", label: "Both" },
];

const GROUP_BY_OPTIONS = [
  { value: "none", label: "No Grouping" },
  { value: "door", label: "By Door" },
  { value: "location", label: "By Location" },
  { value: "type", label: "By Type" },
];

const TAX_MODE_OPTIONS = [
  { value: "include_tax", label: "Include Tax" },
  { value: "exclude_tax", label: "Exclude Tax" },
  { value: "show_separately", label: "Show Separately" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr-CA", label: "French (Canada)" },
];

type ProfileFormData = Partial<ExportProfile>;

export default function ExportProfiles() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ExportProfile | null>(null);

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ["/api/export-profiles"],
    queryFn: getExportProfiles,
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<ProfileFormData>({
    defaultValues: {
      name: "",
      description: "",
      scope: "both",
      templateType: "proposal",
      language: "en",
      isDefaultForTenant: false,
      showLineItems: true,
      showLineItemPrices: true,
      showLineItemQuantities: true,
      showLineItemTotals: true,
      showSummaryTotals: true,
      groupItemsBy: "none",
      showMaterialBreakdown: true,
      showLaborBreakdown: true,
      taxMode: "include_tax",
      showTaxRate: true,
      showInternalNotes: false,
      showCostBreakdown: true,
      showMarginOrMarkup: false,
      includeImages: false,
      includeDoorIcons: false,
      includeScanSnapshots: false,
      includeComplianceSummary: false,
      includeInstallTimeline: false,
      includeCutSheetSection: false,
      includeCostCharts: false,
      goodBetterBestMode: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: createExportProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-profiles"] });
      toast({ title: "Profile created successfully" });
      setDialogOpen(false);
      reset();
    },
    onError: () => {
      toast({
        title: "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExportProfile> }) =>
      updateExportProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-profiles"] });
      toast({ title: "Profile updated successfully" });
      setDialogOpen(false);
      setEditingProfile(null);
      reset();
    },
    onError: () => {
      toast({
        title: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExportProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-profiles"] });
      toast({ title: "Profile deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete profile",
        variant: "destructive",
      });
    },
  });

  const openCreateDialog = () => {
    setEditingProfile(null);
    reset();
    setDialogOpen(true);
  };

  const openEditDialog = (profile: ExportProfile) => {
    setEditingProfile(profile);
    reset(profile);
    setDialogOpen(true);
  };

  const onSubmit = (data: ProfileFormData) => {
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this profile?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Export Profiles</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure reusable templates for project exports
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-profile" size="sm" className="text-xs sm:text-sm w-full sm:w-auto shrink-0">
          <Plus className="mr-2 h-4 w-4 shrink-0" />
          New Profile
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            Configured Profiles
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Manage export profiles with custom configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          ) : profiles && profiles.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Template Type</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Scope</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Default</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id} data-testid={`row-profile-${profile.id}`}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {profile.isDefaultForTenant && <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 shrink-0" />}
                          <span className="truncate">{profile.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden mt-0.5">
                          {TEMPLATE_TYPES.find((t) => t.value === profile.templateType)?.label || profile.templateType}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        {TEMPLATE_TYPES.find((t) => t.value === profile.templateType)?.label || profile.templateType}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                        {SCOPE_OPTIONS.find((s) => s.value === profile.scope)?.label || profile.scope}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{profile.isDefaultForTenant ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(profile)}
                            aria-label="Edit export profile"
                            data-testid={`button-edit-${profile.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(profile.id)}
                            disabled={deleteMutation.isPending}
                            aria-label="Delete export profile"
                            data-testid={`button-delete-${profile.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
              No export profiles configured. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingProfile ? "Edit Export Profile" : "Create Export Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Configure export settings and included content
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm">Profile Name</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Standard Proposal"
                    data-testid="input-profile-name"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="templateType" className="text-xs sm:text-sm">Template Type</Label>
                  <Select
                    value={watch("templateType") || "proposal"}
                    onValueChange={(value) => setValue("templateType", value)}
                  >
                    <SelectTrigger id="templateType" data-testid="select-template-type" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-sm">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="scope" className="text-xs sm:text-sm">Scope</Label>
                  <Select
                    value={watch("scope") || "both"}
                    onValueChange={(value) => setValue("scope", value)}
                  >
                    <SelectTrigger id="scope" data-testid="select-scope" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCOPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="language" className="text-xs sm:text-sm">Language</Label>
                  <Select
                    value={watch("language") || "en"}
                    onValueChange={(value) => setValue("language", value)}
                  >
                    <SelectTrigger id="language" data-testid="select-language" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Optional description"
                  data-testid="input-profile-description"
                  className="text-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefaultForTenant"
                  checked={watch("isDefaultForTenant") || false}
                  onCheckedChange={(checked) => setValue("isDefaultForTenant", checked)}
                  data-testid="switch-is-default"
                />
                <Label htmlFor="isDefaultForTenant" className="text-xs sm:text-sm">Set as default profile</Label>
              </div>
            </div>

            <Tabs defaultValue="visibility" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="visibility" className="text-xs sm:text-sm">Visibility</TabsTrigger>
                <TabsTrigger value="grouping" className="text-xs sm:text-sm">Grouping</TabsTrigger>
                <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="visibility" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { key: "showLineItems", label: "Show Line Items" },
                    { key: "showLineItemPrices", label: "Show Prices" },
                    { key: "showLineItemQuantities", label: "Show Quantities" },
                    { key: "showLineItemTotals", label: "Show Line Totals" },
                    { key: "showSummaryTotals", label: "Show Summary Totals" },
                    { key: "showMaterialBreakdown", label: "Show Materials" },
                    { key: "showLaborBreakdown", label: "Show Labor" },
                    { key: "showTaxRate", label: "Show Tax Rate" },
                    { key: "showInternalNotes", label: "Show Internal Notes" },
                    { key: "showCostBreakdown", label: "Show Cost Breakdown" },
                    { key: "showMarginOrMarkup", label: "Show Margin/Markup" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        id={key}
                        checked={(watch(key as keyof ProfileFormData) as boolean) || false}
                        onCheckedChange={(checked) => setValue(key as keyof ProfileFormData, checked)}
                      />
                      <Label htmlFor={key} className="text-xs sm:text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="grouping" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="groupItemsBy" className="text-xs sm:text-sm">Group Items By</Label>
                    <Select
                      value={watch("groupItemsBy") || "none"}
                      onValueChange={(value) => setValue("groupItemsBy", value)}
                    >
                      <SelectTrigger id="groupItemsBy" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_BY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="taxMode" className="text-xs sm:text-sm">Tax Mode</Label>
                    <Select
                      value={watch("taxMode") || "include_tax"}
                      onValueChange={(value) => setValue("taxMode", value)}
                    >
                      <SelectTrigger id="taxMode" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_MODE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="defaultAlternativeLabel" className="text-xs sm:text-sm">Default Alternative Label</Label>
                    <Input
                      id="defaultAlternativeLabel"
                      {...register("defaultAlternativeLabel")}
                      placeholder="e.g., Option A"
                      className="text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { key: "includeImages", label: "Include Images" },
                    { key: "includeDoorIcons", label: "Include Door Icons" },
                    { key: "includeScanSnapshots", label: "Include Scan Snapshots" },
                    { key: "includeComplianceSummary", label: "Include Compliance Summary" },
                    { key: "includeInstallTimeline", label: "Include Install Timeline" },
                    { key: "includeCutSheetSection", label: "Include Cut Sheet Section" },
                    { key: "includeCostCharts", label: "Include Cost Charts" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        id={key}
                        checked={(watch(key as keyof ProfileFormData) as boolean) || false}
                        onCheckedChange={(checked) => setValue(key as keyof ProfileFormData, checked)}
                      />
                      <Label htmlFor={key} className="text-xs sm:text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="goodBetterBestMode"
                      checked={watch("goodBetterBestMode") || false}
                      onCheckedChange={(checked) => setValue("goodBetterBestMode", checked)}
                    />
                    <Label htmlFor="goodBetterBestMode" className="text-xs sm:text-sm">Enable Good/Better/Best Mode</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="button-cancel"
                size="sm"
                className="text-xs sm:text-sm w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-profile"
                size="sm"
                className="text-xs sm:text-sm w-full sm:w-auto"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
