import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Key, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Search,
  Loader2,
  Building2,
  FileText,
  KeyRound,
  Lock,
  ChevronRight,
  Settings,
  Users,
  TreePine,
  Factory,
  EyeOff,
  DoorOpen,
  Crown,
  Sparkles,
  ArrowRight,
  Upload,
  FileUp,
} from "lucide-react";
import {
  MASTER_KEY_MANUFACTURERS,
  KEY_LEVEL_TYPES,
  type MasterKeySystem,
  type MasterKeySystemData,
  type HardwareItem,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Link } from "wouter";

const KEY_BLANK_MANUFACTURERS = [
  "Schlage",
  "Kwikset",
  "Yale",
  "Medeco",
  "Best",
  "Corbin Russwin",
  "Sargent",
  "Assa Abloy",
  "Mul-T-Lock",
  "Primus",
  "Arrow",
  "Kaba",
  "Other",
] as const;

const KEY_BLANK_TYPES = [
  "Schlage C",
  "Schlage E",
  "Kwikset KW1",
  "Kwikset KW10",
  "Best A2",
  "Best IC",
  "Yale 8",
  "Yale GA",
  "Medeco M3",
  "Medeco Biaxial",
  "Corbin L4",
  "Sargent LA",
  "Other",
] as const;

const CYLINDER_TYPES = [
  "Mortise",
  "Rim",
  "Key-in-Knob (KIK)",
  "Key-in-Lever (KIL)",
  "Interchangeable Core (IC)",
  "Removable Core (SFIC/LFIC)",
  "Padlock",
  "Other",
] as const;

const keyRecordFormSchema = z.object({
  doorLabel: z.string().min(1, "Door identifier is required"),
  location: z.string().optional(),
  keyBlank: z.string().optional(),
  keyBlankManufacturer: z.string().optional(),
  bittingCode: z.string().optional(),
  keySymbol: z.string().optional(),
  pinning: z.string().optional(),
  cylinderType: z.string().optional(),
  cylinderBrand: z.string().optional(),
  constructionKeyQty: z.coerce.number().optional(),
  permanentKeyQty: z.coerce.number().optional(),
  keyingRemarks: z.string().optional(),
});

type KeyRecordFormValues = z.infer<typeof keyRecordFormSchema>;

interface KeyRecord {
  id: string;
  doorLabel: string;
  location?: string;
  keyBlank?: string;
  keyBlankManufacturer?: string;
  bittingCode?: string;
  keySymbol?: string;
  pinning?: string;
  cylinderType?: string;
  cylinderBrand?: string;
  constructionKeyQty?: number;
  permanentKeyQty?: number;
  keyingRemarks?: string;
  createdAt: string;
}

const keyLevelColors: Record<string, string> = {
  GMK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  MK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  SMK: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CHANGE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CONSTRUCTION: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VENDOR: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  SPECIAL: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export default function KeyingSystems() {
  const { toast } = useToast();
  const { hasFeatureAccess, currentTier } = useFeatureAccess();
  const hasMasterKeying = hasFeatureAccess("masterKeying");
  const [activeTab, setActiveTab] = useState<string>("key-records");

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-keying-systems">
            <Key className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            Keying Systems
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage door key information and master keying systems
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md h-auto">
          <TabsTrigger value="key-records" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-key-records">
            <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Key Records</span>
            <span className="sm:hidden">Records</span>
          </TabsTrigger>
          <TabsTrigger value="master-keying" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-master-keying">
            <KeyRound className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Master Key System</span>
            <span className="sm:hidden">Master</span>
            {!hasMasterKeying && (
              <Crown className="h-3 w-3 ml-1 text-amber-500 shrink-0" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="key-records" className="mt-4">
          <KeyRecordsSection />
        </TabsContent>

        <TabsContent value="master-keying" className="mt-4">
          {hasMasterKeying ? (
            <MasterKeyingSection />
          ) : (
            <MasterKeyingPaywall currentTier={currentTier} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KeyRecordsSection() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KeyRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: keyRecords = [], isLoading, isError, error, refetch } = useQuery<KeyRecord[]>({
    queryKey: ["/api/key-records"],
  });

  const form = useForm<KeyRecordFormValues>({
    resolver: zodResolver(keyRecordFormSchema),
    defaultValues: {
      doorLabel: "",
      location: "",
      keyBlank: "",
      keyBlankManufacturer: "",
      bittingCode: "",
      keySymbol: "",
      pinning: "",
      cylinderType: "",
      cylinderBrand: "",
      constructionKeyQty: undefined,
      permanentKeyQty: undefined,
      keyingRemarks: "",
    },
  });

  const createRecord = useMutation({
    mutationFn: async (values: KeyRecordFormValues) => {
      const res = await apiRequest("POST", "/api/key-records", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-records"] });
      toast({
        title: "Success",
        description: "Key record created successfully.",
      });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create record",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: KeyRecordFormValues }) => {
      const res = await apiRequest("PATCH", `/api/key-records/${id}`, values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-records"] });
      toast({
        title: "Success",
        description: "Key record updated successfully.",
      });
      setEditingRecord(null);
      form.reset();
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update record",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/key-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-records"] });
      toast({
        title: "Success",
        description: "Key record deleted successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to delete record",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: KeyRecordFormValues) => {
    if (editingRecord) {
      updateRecord.mutate({ id: editingRecord.id, values });
    } else {
      createRecord.mutate(values);
    }
  };

  const handleEdit = (record: KeyRecord) => {
    setEditingRecord(record);
    form.reset({
      doorLabel: record.doorLabel,
      location: record.location || "",
      keyBlank: record.keyBlank || "",
      keyBlankManufacturer: record.keyBlankManufacturer || "",
      bittingCode: record.bittingCode || "",
      keySymbol: record.keySymbol || "",
      pinning: record.pinning || "",
      cylinderType: record.cylinderType || "",
      cylinderBrand: record.cylinderBrand || "",
      constructionKeyQty: record.constructionKeyQty,
      permanentKeyQty: record.permanentKeyQty,
      keyingRemarks: record.keyingRemarks || "",
    });
  };

  const filteredRecords = useMemo(() => {
    if (!debouncedSearch) return keyRecords;
    const search = debouncedSearch.toLowerCase();
    return keyRecords.filter(
      (r) =>
        r.doorLabel.toLowerCase().includes(search) ||
        r.location?.toLowerCase().includes(search) ||
        r.keySymbol?.toLowerCase().includes(search) ||
        r.bittingCode?.toLowerCase().includes(search)
    );
  }, [keyRecords, debouncedSearch]);

  if (isError) {
    return (
      <ErrorState
        title="Failed to load key records"
        message={error instanceof Error ? error.message : "Unable to fetch data."}
        error={error as Error}
        onRetry={refetch}
        testId="error-key-records"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DoorOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                Individual Door Key Records
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Track key bitting, blanks, and cylinder information for individual doors
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen || !!editingRecord} onOpenChange={(open) => {
              if (!open) {
                setAddDialogOpen(false);
                setEditingRecord(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-key-record">
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Add Record</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">
                    {editingRecord ? "Edit Key Record" : "Add Key Record"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Enter key bitting and blank information for a single door
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="doorLabel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Door Identifier *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., Room 101, Main Entry"
                                className="text-sm"
                                data-testid="input-door-label"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Location</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 3rd Floor, Building A"
                                className="text-sm"
                                data-testid="input-location"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="text-sm font-medium">Key Blank Information</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="keyBlankManufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Key Blank Manufacturer</FormLabel>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-key-manufacturer" className="text-sm">
                                  <SelectValue placeholder="Select manufacturer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {KEY_BLANK_MANUFACTURERS.map((mfr) => (
                                  <SelectItem key={mfr} value={mfr}>{mfr}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="keyBlank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Key Blank Type</FormLabel>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-key-blank" className="text-sm">
                                  <SelectValue placeholder="Select blank type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {KEY_BLANK_TYPES.map((blank) => (
                                  <SelectItem key={blank} value={blank}>{blank}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="text-sm font-medium">Bitting & Key Details</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="bittingCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Bitting Code</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 35246"
                                className="text-sm font-mono"
                                data-testid="input-bitting"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">Key cut pattern</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="keySymbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Key Symbol</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., AA-1"
                                className="text-sm font-mono"
                                data-testid="input-key-symbol"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">Stamped on key</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pinning"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Pinning</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 5-pin"
                                className="text-sm"
                                data-testid="input-pinning"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">Pin depths</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="text-sm font-medium">Cylinder Information</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="cylinderType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Cylinder Type</FormLabel>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-cylinder-type" className="text-sm">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CYLINDER_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cylinderBrand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Cylinder Brand</FormLabel>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-cylinder-brand" className="text-sm">
                                  <SelectValue placeholder="Select brand" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {KEY_BLANK_MANUFACTURERS.map((brand) => (
                                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="text-sm font-medium">Key Quantities</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="constructionKeyQty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Construction Keys</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                placeholder="0"
                                className="text-sm"
                                data-testid="input-construction-keys"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">Temporary keys</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="permanentKeyQty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Permanent Keys</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                placeholder="0"
                                className="text-sm"
                                data-testid="input-permanent-keys"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">Final keys</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="keyingRemarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Keying Remarks</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Special keying instructions..."
                              rows={2}
                              className="text-sm"
                              data-testid="input-keying-remarks"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setAddDialogOpen(false);
                          setEditingRecord(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={createRecord.isPending || updateRecord.isPending}
                        data-testid="button-save-key-record"
                      >
                        {(createRecord.isPending || updateRecord.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingRecord ? "Update Record" : "Create Record"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search by door, location, or key symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
              data-testid="input-search-key-records"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={`skel-${i}`} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No matching key records found" : "No key records yet"}
              </p>
              {!searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setAddDialogOpen(true)}
                  data-testid="button-add-first-record"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add First Record
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredRecords.map((record) => (
                  <Card key={record.id} className="hover-elevate" data-testid={`card-key-record-${record.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{record.doorLabel}</span>
                            {record.location && (
                              <Badge variant="secondary" className="text-xs">
                                {record.location}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {record.keyBlank && (
                              <span>Blank: <span className="font-mono">{record.keyBlank}</span></span>
                            )}
                            {record.bittingCode && (
                              <span>Bitting: <span className="font-mono">{record.bittingCode}</span></span>
                            )}
                            {record.keySymbol && (
                              <span>Symbol: <span className="font-mono">{record.keySymbol}</span></span>
                            )}
                            {record.cylinderType && (
                              <span>Cylinder: {record.cylinderType}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(record)}
                            aria-label="Edit key record"
                            data-testid={`button-edit-record-${record.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (confirm("Delete this key record?")) {
                                deleteRecord.mutate(record.id);
                              }
                            }}
                            aria-label="Delete key record"
                            data-testid={`button-delete-record-${record.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm sm:text-base">Need to manage complex keying hierarchies?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Upgrade to Professional to access Master Key System with hierarchical keying (GMK → MK → SMK → CHANGE), 
                manufacturer presets, key-door assignment matrix, and more.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" data-testid="button-view-master-keying">
              <span className="text-xs sm:text-sm">View Master Key System</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MasterKeyingPaywall({ currentTier }: { currentTier: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-xl opacity-20" />
        <div className="relative p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full">
          <KeyRound className="h-12 w-12 sm:h-16 sm:w-16 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-2">Master Key System</h2>
      <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-6">
        Professional locksmith facility management for complex keying hierarchies
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mb-6">
        <Card className="text-left">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <TreePine className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Hierarchical Keying</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  GMK → MK → SMK → CHANGE key structures with visual hierarchy builder
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Factory className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Manufacturer Presets</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Allegion, ASSA ABLOY, dormakaba, Medeco, Best and more
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DoorOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Key-Door Assignment</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Interactive matrix for managing which keys open which doors
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Import & Export</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Import existing systems, export internal or customer-redacted views
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link href="/billing">
          <Button data-testid="button-upgrade-master-keying">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Professional
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground">
          Current plan: <Badge variant="secondary">{currentTier}</Badge>
        </p>
      </div>
    </div>
  );
}

function MasterKeyingSection() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<MasterKeySystem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [activeTab, setActiveTab] = useState("overview");

  const { 
    data: systems = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<MasterKeySystem[]>({
    queryKey: ["/api/master-keying/systems"],
  });

  const { data: manufacturers } = useQuery<{
    manufacturers: string[];
    presets: Record<string, { keyways: { name: string; notes: string }[] }>;
  }>({
    queryKey: ["/api/master-keying/manufacturers"],
  });

  const { data: keyLevels } = useQuery<{
    levels: { type: string; name: string; description: string }[];
  }>({
    queryKey: ["/api/master-keying/key-levels"],
  });

  const createSystemSchema = z.object({
    name: z.string().min(1, "System name is required"),
    facilityName: z.string().min(1, "Facility name is required"),
    manufacturer: z.enum(["Allegion", "ASSA ABLOY", "dormakaba", "Medeco", "Best", "Other"]).nullable().optional(),
    projectId: z.string().optional().nullable(),
  });

  type CreateSystemFormValues = z.infer<typeof createSystemSchema>;

  const createForm = useForm<CreateSystemFormValues>({
    resolver: zodResolver(createSystemSchema),
    defaultValues: {
      name: "",
      facilityName: "",
      manufacturer: null,
      projectId: null,
    },
  });

  const createSystem = useMutation({
    mutationFn: async (values: CreateSystemFormValues) => {
      const now = new Date().toISOString();
      const payload = {
        ...values,
        organizationId: "", 
        data: {
          keyways: [],
          nodes: [],
          doorOpenings: [],
          assignments: [],
          brand: undefined,
          createdAt: now,
          updatedAt: now,
        },
      };
      const res = await apiRequest("POST", "/api/master-keying/systems", payload);
      return await res.json();
    },
    onSuccess: (newSystem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-keying/systems"] });
      toast({
        title: "Success",
        description: "Master key system created successfully.",
      });
      setCreateDialogOpen(false);
      createForm.reset();
      setSelectedSystem(newSystem);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create system",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteSystem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/master-keying/systems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-keying/systems"] });
      toast({
        title: "Success",
        description: "Master key system deleted successfully.",
      });
      if (selectedSystem) {
        setSelectedSystem(null);
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to delete system",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateSystem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MasterKeySystem> }) => {
      const res = await apiRequest("PATCH", `/api/master-keying/systems/${id}`, updates);
      return await res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-keying/systems"] });
      setSelectedSystem(updated);
      toast({
        title: "Success",
        description: "System updated successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update system",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (values: CreateSystemFormValues) => {
    createSystem.mutate(values);
  };

  const filteredSystems = useMemo(() => {
    if (!debouncedSearch) return systems;
    const search = debouncedSearch.toLowerCase();
    return systems.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.facilityName.toLowerCase().includes(search) ||
        s.manufacturer?.toLowerCase().includes(search)
    );
  }, [systems, debouncedSearch]);

  const handleExport = async (systemId: string, view: "internal" | "customer") => {
    try {
      const res = await fetch(`/api/master-keying/systems/${systemId}/export?view=${view}`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `master-key-system-${view}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: `${view === "customer" ? "Customer" : "Internal"} view exported successfully.`,
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Unable to export system data.",
        variant: "destructive",
      });
    }
  };

  if (isError) {
    return (
      <ErrorState
        title="Failed to load master key systems"
        message={error instanceof Error ? error.message : "Unable to fetch data."}
        error={error as Error}
        onRetry={refetch}
        testId="error-master-keying"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={`skel-${i}`} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const selectedData = selectedSystem?.data as MasterKeySystemData | undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Master Key Systems
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Design and manage hierarchical keying systems for commercial facilities
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0" data-testid="button-create-master-system">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="text-xs sm:text-sm">New System</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Master Key System</DialogTitle>
              <DialogDescription>
                Set up a new hierarchical keying system for a facility
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Building A Master System"
                          data-testid="input-system-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="facilityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Corporate Headquarters"
                          data-testid="input-facility-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(val) => field.onChange(val || null)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-manufacturer">
                            <SelectValue placeholder="Select manufacturer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(MASTER_KEY_MANUFACTURERS).map((mfr) => (
                            <SelectItem key={mfr} value={mfr}>
                              {mfr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSystem.isPending}>
                    {createSystem.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create System
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
              data-testid="input-search-systems"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-2 pr-4">
              {filteredSystems.length === 0 ? (
                <Card className="p-4 sm:p-6 text-center">
                  <KeyRound className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {searchTerm ? "No matching systems found" : "No master key systems yet"}
                  </p>
                  {!searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 sm:mt-4"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      <span className="text-xs sm:text-sm">Create First System</span>
                    </Button>
                  )}
                </Card>
              ) : (
                filteredSystems.map((system) => {
                  const data = system.data as MasterKeySystemData | undefined;
                  const nodeCount = data?.nodes?.length || 0;
                  const keywayCount = data?.keyways?.length || 0;
                  
                  return (
                    <Card
                      key={system.id}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedSystem?.id === system.id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedSystem(system)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSystem(system); }}
                      tabIndex={0}
                      role="button"
                      data-testid={`card-system-${system.id}`}
                    >
                      <CardHeader className="p-3 sm:p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-base truncate">
                              {system.name}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm truncate">
                              {system.facilityName}
                            </CardDescription>
                          </div>
                          {system.manufacturer && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {system.manufacturer}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0 pb-3">
                        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 min-w-0">
                            <TreePine className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>{nodeCount} keys</span>
                          </span>
                          <span className="flex items-center gap-1 min-w-0">
                            <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>{keywayCount} keyways</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="lg:col-span-2">
          {selectedSystem ? (
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                      <span className="truncate">{selectedSystem.name}</span>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs sm:text-sm">
                      <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate">{selectedSystem.facilityName}</span>
                      {selectedSystem.manufacturer && (
                        <>
                          <span className="text-muted-foreground shrink-0">·</span>
                          <Factory className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span>{selectedSystem.manufacturer}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(selectedSystem.id, "internal")}
                      data-testid="button-export-internal"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Internal</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(selectedSystem.id, "customer")}
                      data-testid="button-export-customer"
                    >
                      <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Customer</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this master key system?")) {
                          deleteSystem.mutate(selectedSystem.id);
                        }
                      }}
                      aria-label="Delete master key system"
                      data-testid="button-delete-system"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-overview">
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Overview</span>
                      <span className="sm:hidden">View</span>
                    </TabsTrigger>
                    <TabsTrigger value="hierarchy" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-hierarchy">
                      <TreePine className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Hierarchy</span>
                      <span className="sm:hidden">Keys</span>
                    </TabsTrigger>
                    <TabsTrigger value="keyways" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-keyways">
                      <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Keyways</span>
                      <span className="sm:hidden">Ways</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-settings">
                      <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Settings</span>
                      <span className="sm:hidden">Set</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <SystemOverview 
                      system={selectedSystem} 
                      data={selectedData}
                    />
                  </TabsContent>

                  <TabsContent value="hierarchy" className="mt-4">
                    <HierarchyBuilder
                      system={selectedSystem}
                      data={selectedData}
                      onUpdate={(updates) => 
                        updateSystem.mutate({ id: selectedSystem.id, updates })
                      }
                      isPending={updateSystem.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="keyways" className="mt-4">
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Keyways editor - manage keyway configurations for this system
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-4">
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Brand settings - customize export views and customer-facing options
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-6 sm:p-8 lg:p-12">
              <div className="text-center">
                <KeyRound className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Select a System</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                  Choose a master key system from the list to view and edit its
                  hierarchy, keyways, and configuration settings.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemOverview({ 
  system, 
  data,
}: { 
  system: MasterKeySystem; 
  data?: MasterKeySystemData;
}) {
  const nodesByLevel = useMemo(() => {
    if (!data?.nodes) return {};
    return data.nodes.reduce((acc, node) => {
      const level = node.levelType || "UNKNOWN";
      if (!acc[level]) acc[level] = [];
      acc[level].push(node);
      return acc;
    }, {} as Record<string, typeof data.nodes>);
  }, [data?.nodes]);

  const stats = useMemo(() => ({
    totalKeys: data?.nodes?.length || 0,
    keyways: data?.keyways?.length || 0,
    doorOpenings: data?.doorOpenings?.length || 0,
    assignments: data?.assignments?.length || 0,
  }), [data]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Total Keys</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.totalKeys}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Keyways</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.keyways}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Door Openings</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.doorOpenings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Assignments</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.assignments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold">Key Hierarchy</h3>
        {Object.keys(nodesByLevel).length === 0 ? (
          <p className="text-muted-foreground text-xs sm:text-sm">
            No keys defined yet. Use the Hierarchy tab to build your keying structure.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {Object.entries(KEY_LEVEL_TYPES).map(([key, value]) => {
              const nodes = nodesByLevel[value] || [];
              if (nodes.length === 0) return null;
              
              return (
                <Card key={key}>
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`shrink-0 text-xs ${keyLevelColors[value] || "bg-gray-100"}`}>
                        {value}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {nodes.length} key{nodes.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="space-y-1">
                      {nodes.slice(0, 5).map((node) => (
                        <div
                          key={node.id}
                          className="text-xs sm:text-sm flex items-center gap-2 min-w-0"
                        >
                          <span className="font-mono shrink-0">{node.code}</span>
                          <span className="text-muted-foreground truncate">
                            {node.fullName}
                          </span>
                        </div>
                      ))}
                      {nodes.length > 5 && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          +{nodes.length - 5} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HierarchyBuilder({
  system,
  data,
  onUpdate,
  isPending,
}: {
  system: MasterKeySystem;
  data?: MasterKeySystemData;
  onUpdate: (updates: Partial<MasterKeySystem>) => void;
  isPending: boolean;
}) {
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [newNode, setNewNode] = useState({
    code: "",
    fullName: "",
    levelType: "CHANGE" as string,
    parentId: "",
    bitting: "",
    notes: "",
  });

  const handleAddNode = () => {
    if (!newNode.code || !newNode.fullName) return;

    const nodeId = `node-${Date.now()}`;
    const existingNodes = data?.nodes || [];
    
    const node = {
      id: nodeId,
      systemId: system.id,
      code: newNode.code,
      fullName: newNode.fullName,
      levelType: newNode.levelType,
      parentId: newNode.parentId || undefined,
      childrenIds: [] as string[],
      bitting: newNode.bitting || undefined,
      notes: newNode.notes || undefined,
    };

    const updatedNodes = [...existingNodes, node];

    if (newNode.parentId) {
      const parentIndex = updatedNodes.findIndex((n) => n.id === newNode.parentId);
      if (parentIndex >= 0) {
        updatedNodes[parentIndex] = {
          ...updatedNodes[parentIndex],
          childrenIds: [...(updatedNodes[parentIndex].childrenIds || []), nodeId],
        };
      }
    }

    onUpdate({
      data: {
        ...(data || {
          keyways: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        nodes: updatedNodes,
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });

    setNewNode({
      code: "",
      fullName: "",
      levelType: "CHANGE",
      parentId: "",
      bitting: "",
      notes: "",
    });
    setAddNodeOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    const existingNodes = data?.nodes || [];
    const updatedNodes = existingNodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        childrenIds: n.childrenIds.filter((id) => id !== nodeId),
      }));

    onUpdate({
      data: {
        ...(data || {
          keyways: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        nodes: updatedNodes,
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });
  };

  const rootNodes = useMemo(() => {
    return (data?.nodes || []).filter((n) => !n.parentId);
  }, [data?.nodes]);

  const getChildren = (parentId: string) => {
    return (data?.nodes || []).filter((n) => n.parentId === parentId);
  };

  const renderNode = (node: NonNullable<MasterKeySystemData["nodes"]>[number], depth = 0) => {
    const children = getChildren(node.id);
    
    return (
      <div key={node.id} style={{ marginLeft: depth * 16 }} className="sm:ml-0" data-depth={depth}>
        <div className="flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md hover:bg-accent/50 min-w-0" style={{ marginLeft: depth * 8 }}>
          {children.length > 0 && (
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          )}
          <Badge className={`shrink-0 text-xs ${keyLevelColors[node.levelType] || "bg-gray-100"}`}>
            {node.levelType}
          </Badge>
          <span className="font-mono text-xs sm:text-sm shrink-0">{node.code}</span>
          <span className="text-xs sm:text-sm text-muted-foreground truncate flex-1 min-w-0">
            {node.fullName}
          </span>
          {node.bitting && (
            <span className="text-xs font-mono text-muted-foreground shrink-0 hidden sm:inline">
              [{node.bitting}]
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => handleDeleteNode(node.id)}
            aria-label="Delete key"
            data-testid={`button-delete-key-${node.id}`}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
        {children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold">Key Hierarchy</h3>
        <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-key">
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Add Key</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Add Key to Hierarchy</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Create a new key in the master key system hierarchy
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium">Key Code</label>
                  <Input
                    value={newNode.code}
                    onChange={(e) =>
                      setNewNode({ ...newNode, code: e.target.value })
                    }
                    placeholder="e.g., GMK-1, MK-A"
                    className="text-sm"
                    data-testid="input-key-code"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium">Level Type</label>
                  <Select
                    value={newNode.levelType}
                    onValueChange={(val) =>
                      setNewNode({ ...newNode, levelType: val })
                    }
                  >
                    <SelectTrigger data-testid="select-level-type" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(KEY_LEVEL_TYPES).map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Full Name</label>
                <Input
                  value={newNode.fullName}
                  onChange={(e) =>
                    setNewNode({ ...newNode, fullName: e.target.value })
                  }
                  placeholder="e.g., Grand Master Key - Main Building"
                  className="text-sm"
                  data-testid="input-key-full-name"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Parent Key</label>
                <Select
                  value={newNode.parentId}
                  onValueChange={(val) =>
                    setNewNode({ ...newNode, parentId: val })
                  }
                >
                  <SelectTrigger data-testid="select-parent-key" className="text-sm">
                    <SelectValue placeholder="None (Root Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Root Level)</SelectItem>
                    {(data?.nodes || []).map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.code} - {n.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Bitting (Optional)</label>
                <Input
                  value={newNode.bitting}
                  onChange={(e) =>
                    setNewNode({ ...newNode, bitting: e.target.value })
                  }
                  placeholder="e.g., 123456"
                  className="text-sm"
                  data-testid="input-bitting-code"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Notes</label>
                <Textarea
                  value={newNode.notes}
                  onChange={(e) =>
                    setNewNode({ ...newNode, notes: e.target.value })
                  }
                  placeholder="Optional notes..."
                  rows={2}
                  className="text-sm"
                  data-testid="input-key-notes"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setAddNodeOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNode}
                disabled={isPending || !newNode.code || !newNode.fullName}
                data-testid="button-save-key"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rootNodes.length === 0 ? (
        <Card className="p-6 text-center">
          <TreePine className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No keys in hierarchy yet. Add your first key to get started.
          </p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <ScrollArea className="h-[300px]">
              {rootNodes.map((node) => renderNode(node))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
