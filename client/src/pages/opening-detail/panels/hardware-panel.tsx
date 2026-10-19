import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  X,
  Plus,
  Trash2,
  Wrench,
  Edit,
  Copy,
  Scan,
  Save,
  Lock,
  Key,
  DoorOpen,
  DoorClosed,
  CircleDot,
  Loader2,
  Package,
  Search,
  Activity,
} from "lucide-react";
import type { HardwareItem, HardwareBundle, BundleItem, ManufacturerContact, QuoteRequest, MasterKeySystem, LockSet, CatalogItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { HardwareLabelScanner } from "@/components/hardware-label-scanner";
import { HardwareCatalogSelector } from "@/components/hardware-catalog-selector";
import { AdditionalItemsManager } from "@/components/additional-items-manager";
import { useOpeningDetail } from "../context";

export default function HardwarePanel() {
  const { opening, project, hardwareQuery, bundlesQuery, manufacturersQuery, quoteRequestsQuery, refetchAll } = useOpeningDetail();
  const { data: hardwareItems = [] } = hardwareQuery;
  const { data: bundles = [] } = bundlesQuery;
  const { data: manufacturers = [] } = manufacturersQuery;
  const { data: quoteRequests = [] } = quoteRequestsQuery;
  const { toast } = useToast();

  // Bundle application state
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<HardwareBundle | null>(null);

  // Hardware form state
  const [hardwareForm, setHardwareForm] = useState({
    itemType: "lock" as string,
    manufacturer: "",
    model: "",
    description: "",
    quantity: "1",
    location: "",
    condition: "new" as string,
    notes: "",
    isCustom: false,
    customManufacturerId: "",
    keyBlank: "",
    bittingCode: "",
    pinning: "",
    keySymbol: "",
    masterKeySystemId: "",
    lockSetId: "",
    // Trade compliance fields
    hsCode: "",
    countryOfOrigin: "",
    tariffRatePercent: "",
    antiDumpingPercent: "",
    otherDutiesPercent: "",
    shipFromCountry: "",
    shipFromPostal: "",
    shipToCountry: "",
    shipToPostal: "",
    incoterm: "",
    baseFreightCost: "",
    fuelSurchargePercent: "",
    accessorialsCost: "",
    insuranceCost: "",
    customsBrokerageCost: "",
    // Procurement source fields
    procurementSourceType: "manufacturer" as "manufacturer" | "distributor",
    procurementSourceId: "",
    procurementSourceSnapshot: null as any,
  });
  const [editingHardwareId, setEditingHardwareId] = useState<string | null>(null);

  // Hardware label scanner state
  const [hardwareScannerOpen, setHardwareScannerOpen] = useState(false);

  // Hardware catalog selector state
  const [catalogSelectorOpen, setCatalogSelectorOpen] = useState(false);

  // Hardware list filter state
  const [hardwareSearchQuery, setHardwareSearchQuery] = useState("");
  const debouncedHardwareSearch = useDebounce(hardwareSearchQuery, 300);
  const [hardwareTypeFilter, setHardwareTypeFilter] = useState("all");

  // Fetch bundle items for selected bundle
  const { data: bundleItems = [] } = useQuery<BundleItem[]>({
    queryKey: ["/api/bundles", selectedBundle?.id, "items"],
    enabled: !!selectedBundle?.id,
  });

  // Fetch distributors for procurement source selection
  const { data: distributors = [] } = useQuery<any[]>({
    queryKey: ['/api/distributors'],
    enabled: !!project?.organizationId,
  });

  // Fetch master key systems
  const { data: masterKeySystems = [] } = useQuery<MasterKeySystem[]>({
    queryKey: ["/api/master-key-systems"],
  });

  // Fetch lock sets
  const { data: lockSets = [] } = useQuery<LockSet[]>({
    queryKey: ["/api/lock-sets"],
    enabled: !!opening?.projectId,
  });

  // Filter hardware items based on search and type
  const filteredHardwareItems = useMemo(() => hardwareItems.filter((item) => {
    const matchesSearch =
      debouncedHardwareSearch === "" ||
      item.description.toLowerCase().includes(debouncedHardwareSearch.toLowerCase()) ||
      item.manufacturer?.toLowerCase().includes(debouncedHardwareSearch.toLowerCase()) ||
      item.model?.toLowerCase().includes(debouncedHardwareSearch.toLowerCase()) ||
      item.itemType.toLowerCase().includes(debouncedHardwareSearch.toLowerCase());

    const matchesType =
      hardwareTypeFilter === "all" || item.itemType === hardwareTypeFilter;

    return matchesSearch && matchesType;
  }), [hardwareItems, debouncedHardwareSearch, hardwareTypeFilter]);

  const applyBundle = useMutation({
    mutationFn: async (bundleId: string) => {
      const items = await fetch(`/api/bundles/${bundleId}/items`).then((r) => r.json());

      for (const item of items) {
        await apiRequest("POST", `/api/openings/${opening.id}/hardware`, {
          itemType: item.itemType,
          description: item.description,
          manufacturer: item.manufacturer || "",
          model: item.model || "",
          quantity: item.quantity || "1",
          location: item.location || "",
          condition: "new",
          notes: item.notes || "",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${opening.id}/hardware`] });
      toast({
        title: "Bundle applied",
        description: "Hardware items have been added from the bundle.",
      });
      setBundleDialogOpen(false);
      setSelectedBundle(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to apply bundle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveHardware = useMutation({
    mutationFn: async () => {
      const payload = {
        ...hardwareForm,
        isCustom: hardwareForm.isCustom ? "yes" : "no",
        // Convert numeric string fields to numbers or null
        tariffRatePercent: hardwareForm.tariffRatePercent ? parseFloat(hardwareForm.tariffRatePercent) : null,
        antiDumpingPercent: hardwareForm.antiDumpingPercent ? parseFloat(hardwareForm.antiDumpingPercent) : null,
        otherDutiesPercent: hardwareForm.otherDutiesPercent ? parseFloat(hardwareForm.otherDutiesPercent) : null,
        baseFreightCost: hardwareForm.baseFreightCost ? parseFloat(hardwareForm.baseFreightCost) : null,
        fuelSurchargePercent: hardwareForm.fuelSurchargePercent ? parseFloat(hardwareForm.fuelSurchargePercent) : null,
        accessorialsCost: hardwareForm.accessorialsCost ? parseFloat(hardwareForm.accessorialsCost) : null,
        insuranceCost: hardwareForm.insuranceCost ? parseFloat(hardwareForm.insuranceCost) : null,
        customsBrokerageCost: hardwareForm.customsBrokerageCost ? parseFloat(hardwareForm.customsBrokerageCost) : null,
        // Map procurement source fields to correct schema names
        procurementSourceType: hardwareForm.procurementSourceType || null,
        procurementSourceId: hardwareForm.procurementSourceId || null,
        procurementSourceSnapshot: hardwareForm.procurementSourceSnapshot || null,
      };
      if (editingHardwareId) {
        return await apiRequest("PATCH", `/api/hardware/${editingHardwareId}`, payload);
      } else {
        return await apiRequest("POST", `/api/openings/${opening.id}/hardware`, {
          ...payload,
        });
      }
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/openings/${opening.id}/hardware`],
        refetchType: 'active',
      });

      // Auto-create quote request if hardware is custom and has a manufacturer
      if (hardwareForm.isCustom && hardwareForm.customManufacturerId) {
        try {
          // Check if quote request already exists for this hardware
          const hardwareItemId = editingHardwareId || data.id;
          const existingQuote = quoteRequests.find(
            q => q.hardwareItemId === hardwareItemId
          );

          // Only create if no quote request exists yet
          if (!existingQuote) {
            await apiRequest("POST", "/api/quote-requests", {
              openingId: opening.id,
              projectId: opening.projectId,
              hardwareItemId,
              manufacturerId: hardwareForm.customManufacturerId,
              status: "draft",
              requestedQuantity: hardwareForm.quantity || "1",
              notes: `Custom hardware quote request for: ${hardwareForm.description}`,
            });

            toast({
              title: "Quote request created",
              description: "A quote request has been automatically created for this custom hardware.",
            });
          }
        } catch (error) {
          // handled
        }
      }

      toast({
        title: editingHardwareId ? "Hardware updated" : "Hardware added",
        description: editingHardwareId
          ? "Hardware item has been updated successfully."
          : "Hardware item has been added successfully.",
      });

      // Reset form
      setEditingHardwareId(null);
      setHardwareForm({
        itemType: "lock",
        manufacturer: "",
        model: "",
        description: "",
        quantity: "1",
        location: "",
        condition: "new",
        notes: "",
        isCustom: false,
        customManufacturerId: "",
        keyBlank: "",
        bittingCode: "",
        pinning: "",
        keySymbol: "",
        masterKeySystemId: "",
        lockSetId: "",
        hsCode: "",
        countryOfOrigin: "",
        tariffRatePercent: "",
        antiDumpingPercent: "",
        otherDutiesPercent: "",
        shipFromCountry: "",
        shipFromPostal: "",
        shipToCountry: "",
        shipToPostal: "",
        incoterm: "",
        baseFreightCost: "",
        fuelSurchargePercent: "",
        accessorialsCost: "",
        insuranceCost: "",
        customsBrokerageCost: "",
        procurementSourceType: "manufacturer",
        procurementSourceId: "",
        procurementSourceSnapshot: null as any,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save hardware. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteHardware = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/hardware/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/openings/${opening.id}/hardware`],
        refetchType: 'active',
      });
      toast({
        title: "Hardware deleted",
        description: "Hardware item has been removed.",
      });
    },
  });

  // Handle catalog item selection
  const handleCatalogItemSelect = useCallback((item: CatalogItem) => {
    setHardwareForm((prev) => ({
      ...prev,
      itemType: item.category || prev.itemType,
      manufacturer: item.manufacturer || "",
      model: item.model || "",
      description: `${item.manufacturer || ""} ${item.model}`.trim(),
      notes: item.notes || prev.notes,
    }));
    toast({
      title: "Item selected",
      description: `${item.manufacturer} ${item.model} added to form`,
    });
  }, [toast]);

  // Handle hardware item duplication
  const handleDuplicateHardware = useCallback((item: HardwareItem) => {
    setEditingHardwareId(null);
    setHardwareForm({
      itemType: item.itemType,
      manufacturer: item.manufacturer || "",
      model: item.model || "",
      description: `${item.description} (Copy)`,
      quantity: item.quantity || "1",
      location: item.location || "",
      condition: item.condition || "new",
      notes: item.notes || "",
      isCustom: item.isCustom === "yes",
      customManufacturerId: item.customManufacturerId || "",
      keyBlank: item.keyBlank || "",
      bittingCode: item.bittingCode || "",
      pinning: item.pinning || "",
      keySymbol: item.keySymbol || "",
      masterKeySystemId: item.masterKeySystemId || "",
      lockSetId: item.lockSetId || "",
      hsCode: item.hsCode || "",
      countryOfOrigin: item.countryOfOrigin || "",
      tariffRatePercent: item.tariffRatePercent?.toString() || "",
      antiDumpingPercent: item.antiDumpingPercent?.toString() || "",
      otherDutiesPercent: item.otherDutiesPercent?.toString() || "",
      shipFromCountry: item.shipFromCountry || "",
      shipFromPostal: item.shipFromPostal || "",
      shipToCountry: item.shipToCountry || "",
      shipToPostal: item.shipToPostal || "",
      incoterm: item.incoterm || "",
      baseFreightCost: item.baseFreightCost?.toString() || "",
      fuelSurchargePercent: item.fuelSurchargePercent?.toString() || "",
      accessorialsCost: item.accessorialsCost?.toString() || "",
      insuranceCost: item.insuranceCost?.toString() || "",
      customsBrokerageCost: item.customsBrokerageCost?.toString() || "",
      procurementSourceType: (item.procurementSourceType as "manufacturer" | "distributor") || "manufacturer",
      procurementSourceId: item.procurementSourceId || "",
      procurementSourceSnapshot: item.procurementSourceSnapshot || null,
    });
    toast({
      title: "Hardware duplicated",
      description: "Item copied to form. Edit and save to create a duplicate.",
    });
  }, [toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Hardware Management
          </CardTitle>
          <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-apply-bundle">
                <Plus className="mr-2 h-4 w-4" />
                Apply Bundle
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Apply Hardware Bundle</DialogTitle>
                <DialogDescription>
                  Select a bundle to add all its hardware items to this door opening
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {bundles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No bundles available. Create bundles in the Bundles page first.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Bundle</label>
                      <Select
                        value={selectedBundle?.id || ""}
                        onValueChange={(value) => {
                          const bundle = bundles.find((b) => b.id === value);
                          setSelectedBundle(bundle || null);
                        }}
                      >
                        <SelectTrigger data-testid="select-bundle">
                          <SelectValue placeholder="Choose a bundle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bundles.map((bundle) => (
                            <SelectItem key={bundle.id} value={bundle.id}>
                              {bundle.name}
                              {bundle.category && ` (${bundle.category})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedBundle && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Bundle Preview</h4>
                        {selectedBundle.description && (
                          <p className="text-sm text-muted-foreground">
                            {selectedBundle.description}
                          </p>
                        )}
                        {bundleItems.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium">
                              Items to be added ({bundleItems.length}):
                            </p>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {bundleItems.map((item, index) => (
                                <div
                                  key={item.id}
                                  className="text-sm p-2 rounded bg-muted"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{item.itemType}</Badge>
                                    <span className="text-muted-foreground">
                                      Qty: {item.quantity}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBundleDialogOpen(false);
                          setSelectedBundle(null);
                        }}
                        data-testid="button-cancel-apply-bundle"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedBundle) {
                            applyBundle.mutate(selectedBundle.id);
                          }
                        }}
                        disabled={!selectedBundle || applyBundle.isPending}
                        data-testid="button-confirm-apply-bundle"
                      >
                        {applyBundle.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Apply Bundle
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Add Hardware Item</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogSelectorOpen(true)}
                data-testid="button-open-catalog-selector"
              >
                <Package className="mr-2 h-4 w-4" />
                Select from Catalog
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHardwareScannerOpen(true)}
                data-testid="button-open-hardware-scanner"
              >
                <Scan className="mr-2 h-4 w-4" />
                Scan Label
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Type</label>
              <Select
                value={hardwareForm.itemType}
                onValueChange={(value) =>
                  setHardwareForm({ ...hardwareForm, itemType: value })
                }
              >
                <SelectTrigger data-testid="select-hardware-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lock">Lock</SelectItem>
                  <SelectItem value="hinge">Hinge</SelectItem>
                  <SelectItem value="closer">Closer</SelectItem>
                  <SelectItem value="exit-device">Exit Device</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="access-control">Access Control</SelectItem>
                  <SelectItem value="misc">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Condition</label>
              <Select
                value={hardwareForm.condition}
                onValueChange={(value) =>
                  setHardwareForm({ ...hardwareForm, condition: value })
                }
              >
                <SelectTrigger data-testid="select-hardware-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Existing</SelectItem>
                  <SelectItem value="replace">Replace</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Manufacturer</label>
              <Input
                value={hardwareForm.manufacturer}
                onChange={(e) => {
                  setHardwareForm({ ...hardwareForm, manufacturer: e.target.value });
                }}
                placeholder="e.g., Schlage, Von Duprin"
                data-testid="input-hardware-manufacturer"
                disabled={hardwareForm.procurementSourceType === 'distributor'}
              />
              {hardwareForm.procurementSourceType === 'distributor' && (
                <p className="text-xs text-muted-foreground">Manufacturer name captured from distributor selection</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={hardwareForm.model}
                onChange={(e) =>
                  setHardwareForm({ ...hardwareForm, model: e.target.value })
                }
                placeholder="e.g., L9050"
                data-testid="input-hardware-model"
              />
            </div>
          </div>

          {/* Procurement Source Selector */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-medium">Procurement Source</h4>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Type</label>
                <RadioGroup
                  value={hardwareForm.procurementSourceType}
                  onValueChange={(value: "manufacturer" | "distributor") =>
                    setHardwareForm({ ...hardwareForm, procurementSourceType: value, procurementSourceId: "", procurementSourceSnapshot: null })
                  }
                  data-testid="radio-source-type"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manufacturer" id="source-manufacturer" data-testid="radio-source-manufacturer" />
                    <Label htmlFor="source-manufacturer" className="font-normal cursor-pointer">
                      Direct from Manufacturer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="distributor" id="source-distributor" data-testid="radio-source-distributor" />
                    <Label htmlFor="source-distributor" className="font-normal cursor-pointer">
                      Through Distributor
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Select where you'll purchase this hardware from
                </p>
              </div>

              {hardwareForm.procurementSourceType === 'manufacturer' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Manufacturer</label>
                  <Select
                    value={hardwareForm.procurementSourceId}
                    onValueChange={(value) => {
                      const selected = manufacturers.find(m => m.id === value);
                      if (selected) {
                        setHardwareForm({
                          ...hardwareForm,
                          procurementSourceId: selected.id,
                          procurementSourceSnapshot: {
                            name: selected.manufacturerName || selected.contactName || "Unknown",
                            contact: selected.contactName || undefined,
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-manufacturer-source">
                      <SelectValue placeholder="Choose manufacturer..." />
                    </SelectTrigger>
                    <SelectContent data-testid="select-manufacturer-source-content">
                      {manufacturers.map((mfr) => (
                        <SelectItem
                          key={mfr.id}
                          value={mfr.id}
                          data-testid={`select-manufacturer-source-${mfr.id}`}
                        >
                          {mfr.manufacturerName || mfr.contactName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {hardwareForm.procurementSourceType === 'distributor' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Distributor</label>
                  <Select
                    value={hardwareForm.procurementSourceId}
                    onValueChange={(value) => {
                      const selected = distributors.find(d => d.id === value);
                      if (selected) {
                        setHardwareForm({
                          ...hardwareForm,
                          procurementSourceId: selected.id,
                          procurementSourceSnapshot: {
                            name: selected.name || "Unknown",
                            contact: selected.contactName || undefined,
                            pricing: selected.pricingTier ? { tier: selected.pricingTier } : undefined,
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-distributor-source">
                      <SelectValue placeholder="Choose distributor..." />
                    </SelectTrigger>
                    <SelectContent data-testid="select-distributor-source-content">
                      {distributors.map((dist) => (
                        <SelectItem
                          key={dist.id}
                          value={dist.id}
                          data-testid={`select-distributor-source-${dist.id}`}
                        >
                          {dist.name}
                          {dist.isPrimary && " (Primary)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Input
              value={hardwareForm.description}
              onChange={(e) =>
                setHardwareForm({ ...hardwareForm, description: e.target.value })
              }
              placeholder="Brief description of hardware item"
              required
              data-testid="input-hardware-description"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                value={hardwareForm.quantity}
                onChange={(e) =>
                  setHardwareForm({ ...hardwareForm, quantity: e.target.value })
                }
                placeholder="1"
                data-testid="input-hardware-quantity"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={hardwareForm.location}
                onChange={(e) =>
                  setHardwareForm({ ...hardwareForm, location: e.target.value })
                }
                placeholder="e.g., top rail, mid rail"
                data-testid="input-hardware-location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={hardwareForm.notes}
              onChange={(e) =>
                setHardwareForm({ ...hardwareForm, notes: e.target.value })
              }
              placeholder="Additional notes..."
              rows={3}
              data-testid="input-hardware-notes"
            />
          </div>

          {(hardwareForm.itemType === "lock" || hardwareForm.itemType === "access-control") && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-medium">Keying Information</h4>
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Blank</label>
                  <Input
                    value={hardwareForm.keyBlank}
                    onChange={(e) =>
                      setHardwareForm({ ...hardwareForm, keyBlank: e.target.value })
                    }
                    placeholder="e.g., SC1, KW1"
                    data-testid="input-key-blank"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bitting Code</label>
                  <Input
                    value={hardwareForm.bittingCode}
                    onChange={(e) =>
                      setHardwareForm({ ...hardwareForm, bittingCode: e.target.value })
                    }
                    placeholder="e.g., 12345"
                    data-testid="input-bitting-code"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pinning</label>
                  <Input
                    value={hardwareForm.pinning}
                    onChange={(e) =>
                      setHardwareForm({ ...hardwareForm, pinning: e.target.value })
                    }
                    placeholder="e.g., Standard, High Security"
                    data-testid="input-pinning"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Symbol</label>
                  <Input
                    value={hardwareForm.keySymbol}
                    onChange={(e) =>
                      setHardwareForm({ ...hardwareForm, keySymbol: e.target.value })
                    }
                    placeholder="e.g., AA, GM"
                    data-testid="input-key-symbol"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Master Key System</label>
                  <Select
                    value={hardwareForm.masterKeySystemId}
                    onValueChange={(value) =>
                      setHardwareForm({ ...hardwareForm, masterKeySystemId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger data-testid="select-master-key-system">
                      <SelectValue placeholder="Select system (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {masterKeySystems.map((system) => (
                        <SelectItem key={system.id} value={system.id}>
                          {system.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Lock Set</label>
                  <Select
                    value={hardwareForm.lockSetId}
                    onValueChange={(value) =>
                      setHardwareForm({ ...hardwareForm, lockSetId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger data-testid="select-lock-set">
                      <SelectValue placeholder="Select lock set (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {lockSets.map((lockSet) => (
                        <SelectItem key={lockSet.id} value={lockSet.id}>
                          {lockSet.setName} - {lockSet.keySymbol || "No symbol"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="trade-compliance" className="border-none">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                International Trade & Landed Cost (Optional)
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">HS Code</label>
                      <Input
                        value={hardwareForm.hsCode}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, hsCode: e.target.value })
                        }
                        placeholder="e.g., 8301.40"
                        data-testid="input-hs-code"
                      />
                      <p className="text-xs text-muted-foreground">Harmonized System tariff classification code</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Country of Origin</label>
                      <Input
                        value={hardwareForm.countryOfOrigin}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, countryOfOrigin: e.target.value })
                        }
                        placeholder="e.g., US, CN, DE"
                        data-testid="input-country-of-origin"
                      />
                      <p className="text-xs text-muted-foreground">ISO 3166-1 alpha-2 country code</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tariff Rate (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={hardwareForm.tariffRatePercent}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, tariffRatePercent: e.target.value })
                        }
                        placeholder="e.g., 3.5"
                        data-testid="input-tariff-rate"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anti-Dumping Duty (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={hardwareForm.antiDumpingPercent}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, antiDumpingPercent: e.target.value })
                        }
                        placeholder="e.g., 0.5"
                        data-testid="input-anti-dumping"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Other Duties (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={hardwareForm.otherDutiesPercent}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, otherDutiesPercent: e.target.value })
                        }
                        placeholder="e.g., 0.25"
                        data-testid="input-other-duties"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Incoterm</label>
                      <Select
                        value={hardwareForm.incoterm}
                        onValueChange={(value) =>
                          setHardwareForm({ ...hardwareForm, incoterm: value === "none" ? "" : value })
                        }
                      >
                        <SelectTrigger data-testid="select-incoterm">
                          <SelectValue placeholder="Select incoterm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                          <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                          <SelectItem value="CIF">CIF - Cost, Insurance & Freight</SelectItem>
                          <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                          <SelectItem value="DAP">DAP - Delivered At Place</SelectItem>
                          <SelectItem value="FCA">FCA - Free Carrier</SelectItem>
                          <SelectItem value="CPT">CPT - Carriage Paid To</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Shipping Details</h4>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ship From Country</label>
                        <Input
                          value={hardwareForm.shipFromCountry}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, shipFromCountry: e.target.value })
                          }
                          placeholder="e.g., US"
                          data-testid="input-ship-from-country"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ship From Postal Code</label>
                        <Input
                          value={hardwareForm.shipFromPostal}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, shipFromPostal: e.target.value })
                          }
                          placeholder="e.g., 90210"
                          data-testid="input-ship-from-postal"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ship To Country</label>
                        <Input
                          value={hardwareForm.shipToCountry}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, shipToCountry: e.target.value })
                          }
                          placeholder="e.g., CA"
                          data-testid="input-ship-to-country"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ship To Postal Code</label>
                        <Input
                          value={hardwareForm.shipToPostal}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, shipToPostal: e.target.value })
                          }
                          placeholder="e.g., M5H 2N2"
                          data-testid="input-ship-to-postal"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Freight Costs</h4>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Base Freight Cost ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={hardwareForm.baseFreightCost}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, baseFreightCost: e.target.value })
                          }
                          placeholder="e.g., 150.00"
                          data-testid="input-base-freight-cost"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fuel Surcharge (%)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={hardwareForm.fuelSurchargePercent}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, fuelSurchargePercent: e.target.value })
                          }
                          placeholder="e.g., 15.5"
                          data-testid="input-fuel-surcharge"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Accessorials ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={hardwareForm.accessorialsCost}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, accessorialsCost: e.target.value })
                          }
                          placeholder="e.g., 75.00"
                          data-testid="input-accessorials-cost"
                        />
                        <p className="text-xs text-muted-foreground">Liftgate, inside delivery, etc.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Insurance ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={hardwareForm.insuranceCost}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, insuranceCost: e.target.value })
                          }
                          placeholder="e.g., 25.00"
                          data-testid="input-insurance-cost"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Customs Brokerage ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={hardwareForm.customsBrokerageCost}
                          onChange={(e) =>
                            setHardwareForm({ ...hardwareForm, customsBrokerageCost: e.target.value })
                          }
                          placeholder="e.g., 100.00"
                          data-testid="input-customs-brokerage-cost"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-custom-hardware"
                checked={hardwareForm.isCustom}
                onCheckedChange={(checked: boolean) =>
                  setHardwareForm({
                    ...hardwareForm,
                    isCustom: checked,
                    customManufacturerId: checked ? hardwareForm.customManufacturerId : "",
                  })
                }
                data-testid="checkbox-is-custom"
              />
              <label
                htmlFor="is-custom-hardware"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Custom Hardware (Requires Quote)
              </label>
            </div>
            {hardwareForm.isCustom && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Manufacturer Contact *</label>
                <Select
                  value={hardwareForm.customManufacturerId}
                  onValueChange={(value) =>
                    setHardwareForm({ ...hardwareForm, customManufacturerId: value })
                  }
                >
                  <SelectTrigger data-testid="select-custom-manufacturer">
                    <SelectValue placeholder="Select manufacturer contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No manufacturers available
                      </SelectItem>
                    ) : (
                      manufacturers.map((mfr) => (
                        <SelectItem key={mfr.id} value={mfr.id}>
                          {mfr.manufacturerName} - {mfr.contactName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A quote request will be automatically created for this custom hardware
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => saveHardware.mutate()}
              disabled={!hardwareForm.description || saveHardware.isPending}
              data-testid={editingHardwareId ? "button-update-hardware" : "button-add-hardware"}
            >
              {saveHardware.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingHardwareId ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  {editingHardwareId ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Hardware Item
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hardware Item
                    </>
                  )}
                </>
              )}
            </Button>
            {editingHardwareId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingHardwareId(null);
                  setHardwareForm({
                    itemType: "lock",
                    manufacturer: "",
                    model: "",
                    description: "",
                    quantity: "1",
                    location: "",
                    condition: "new",
                    notes: "",
                    isCustom: false,
                    customManufacturerId: "",
                    keyBlank: "",
                    bittingCode: "",
                    pinning: "",
                    keySymbol: "",
                    masterKeySystemId: "",
                    lockSetId: "",
                    hsCode: "",
                    countryOfOrigin: "",
                    tariffRatePercent: "",
                    antiDumpingPercent: "",
                    otherDutiesPercent: "",
                    shipFromCountry: "",
                    shipFromPostal: "",
                    shipToCountry: "",
                    shipToPostal: "",
                    incoterm: "",
                    baseFreightCost: "",
                    fuelSurchargePercent: "",
                    accessorialsCost: "",
                    insuranceCost: "",
                    customsBrokerageCost: "",
                    procurementSourceType: "manufacturer",
                    procurementSourceId: "",
                    procurementSourceSnapshot: null as any,
                  });
                }}
                data-testid="button-cancel-edit-hardware"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {hardwareItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Hardware Items ({filteredHardwareItems.length}/{hardwareItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search hardware by description, manufacturer, or model..."
                  value={hardwareSearchQuery}
                  onChange={(e) => setHardwareSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-hardware-search"
                />
              </div>
              <Select value={hardwareTypeFilter} onValueChange={setHardwareTypeFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-hardware-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lock">Locks</SelectItem>
                  <SelectItem value="hinge">Hinges</SelectItem>
                  <SelectItem value="closer">Closers</SelectItem>
                  <SelectItem value="exit-device">Exit Devices</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="access-control">Access Control</SelectItem>
                  <SelectItem value="misc">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredHardwareItems.length > 0 ? (
        <div className="space-y-3">
          {filteredHardwareItems.map((item) => (
            <Card key={item.id} data-testid={`card-hardware-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{item.description}</h3>
                      <Badge variant="outline" className="capitalize">
                        {item.itemType === "lock" && <Lock className="h-3 w-3 mr-1" />}
                        {item.itemType === "hinge" && <CircleDot className="h-3 w-3 mr-1" />}
                        {item.itemType === "closer" && <DoorClosed className="h-3 w-3 mr-1" />}
                        {item.itemType === "exit-device" && <DoorOpen className="h-3 w-3 mr-1" />}
                        {item.itemType === "automation" && <Activity className="h-3 w-3 mr-1" />}
                        {item.itemType === "access-control" && <Key className="h-3 w-3 mr-1" />}
                        {item.itemType === "misc" && <Wrench className="h-3 w-3 mr-1" />}
                        {item.itemType}
                      </Badge>
                      {item.condition && (
                        <Badge variant="secondary" className="capitalize">
                          {item.condition}
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      {item.manufacturer && (
                        <div>
                          <span className="text-muted-foreground">Manufacturer: </span>
                          <span>{item.manufacturer}</span>
                        </div>
                      )}
                      {item.model && (
                        <div>
                          <span className="text-muted-foreground">Model: </span>
                          <span>{item.model}</span>
                        </div>
                      )}
                      {item.quantity && (
                        <div>
                          <span className="text-muted-foreground">Quantity: </span>
                          <span>{item.quantity}</span>
                        </div>
                      )}
                      {item.location && (
                        <div>
                          <span className="text-muted-foreground">Location: </span>
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>

                    {(item.itemType === "lock" || item.itemType === "access-control") &&
                     (item.keyBlank || item.bittingCode || item.pinning || item.keySymbol || item.masterKeySystemId || item.lockSetId) && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-md">
                        <h4 className="text-sm font-medium mb-2">Keying Information</h4>
                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          {item.keyBlank && (
                            <div>
                              <span className="text-muted-foreground">Key Blank: </span>
                              <span>{item.keyBlank}</span>
                            </div>
                          )}
                          {item.bittingCode && (
                            <div>
                              <span className="text-muted-foreground">Bitting: </span>
                              <span>{item.bittingCode}</span>
                            </div>
                          )}
                          {item.pinning && (
                            <div>
                              <span className="text-muted-foreground">Pinning: </span>
                              <span>{item.pinning}</span>
                            </div>
                          )}
                          {item.keySymbol && (
                            <div>
                              <span className="text-muted-foreground">Key Symbol: </span>
                              <span>{item.keySymbol}</span>
                            </div>
                          )}
                          {item.masterKeySystemId && (
                            <div>
                              <span className="text-muted-foreground">Master System: </span>
                              <span>{masterKeySystems.find(s => s.id === item.masterKeySystemId)?.name || "Unknown"}</span>
                            </div>
                          )}
                          {item.lockSetId && (
                            <div>
                              <span className="text-muted-foreground">Lock Set: </span>
                              <span>{lockSets.find(ls => ls.id === item.lockSetId)?.setName || "Unknown"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateHardware(item)}
                      data-testid={`button-duplicate-hardware-${item.id}`}
                      title="Duplicate this hardware item"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingHardwareId(item.id);
                        setHardwareForm({
                          itemType: item.itemType,
                          manufacturer: item.manufacturer || "",
                          model: item.model || "",
                          description: item.description,
                          quantity: item.quantity || "1",
                          location: item.location || "",
                          condition: item.condition || "new",
                          notes: item.notes || "",
                          isCustom: item.isCustom === "yes",
                          customManufacturerId: item.customManufacturerId || "",
                          keyBlank: item.keyBlank || "",
                          bittingCode: item.bittingCode || "",
                          pinning: item.pinning || "",
                          keySymbol: item.keySymbol || "",
                          masterKeySystemId: item.masterKeySystemId || "",
                          lockSetId: item.lockSetId || "",
                          hsCode: item.hsCode || "",
                          countryOfOrigin: item.countryOfOrigin || "",
                          tariffRatePercent: item.tariffRatePercent?.toString() || "",
                          antiDumpingPercent: item.antiDumpingPercent?.toString() || "",
                          otherDutiesPercent: item.otherDutiesPercent?.toString() || "",
                          shipFromCountry: item.shipFromCountry || "",
                          shipFromPostal: item.shipFromPostal || "",
                          shipToCountry: item.shipToCountry || "",
                          shipToPostal: item.shipToPostal || "",
                          incoterm: item.incoterm || "",
                          baseFreightCost: item.baseFreightCost?.toString() || "",
                          fuelSurchargePercent: item.fuelSurchargePercent?.toString() || "",
                          accessorialsCost: item.accessorialsCost?.toString() || "",
                          insuranceCost: item.insuranceCost?.toString() || "",
                          customsBrokerageCost: item.customsBrokerageCost?.toString() || "",
                          procurementSourceType: (item.procurementSourceType as "manufacturer" | "distributor") || "manufacturer",
                          procurementSourceId: item.procurementSourceId || "",
                          procurementSourceSnapshot: item.procurementSourceSnapshot || null,
                        });
                      }}
                      data-testid={`button-edit-hardware-${item.id}`}
                      title="Edit hardware item"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHardware.mutate(item.id)}
                      data-testid={`button-delete-hardware-${item.id}`}
                      title="Delete hardware item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hardware items yet</h3>
              <p className="text-sm text-muted-foreground">
                Add hardware items to track components for this opening
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Door Items */}
      {opening && project && (
        <AdditionalItemsManager
          openingId={opening.id}
          organizationId={project.organizationId}
        />
      )}

      {/* Hardware Catalog Selector Dialog */}
      <HardwareCatalogSelector
        open={catalogSelectorOpen}
        onOpenChange={setCatalogSelectorOpen}
        onSelect={(item) => {
          handleCatalogItemSelect(item);
          setCatalogSelectorOpen(false);
        }}
      />

      {/* Hardware Label Scanner Dialog */}
      <HardwareLabelScanner
        open={hardwareScannerOpen}
        onOpenChange={setHardwareScannerOpen}
        onScanComplete={(result) => {
          // Extract fields from JSONB result
          const normalizedFields = (result.normalizedFields as any) || {};
          const extractedFields = (result.extractedFields as any) || {};
          
          setHardwareForm((prev) => ({
            ...prev,
            manufacturer: normalizedFields.manufacturer || extractedFields.manufacturer || prev.manufacturer,
            model: normalizedFields.model || extractedFields.model || prev.model,
            description: `${normalizedFields.manufacturer || extractedFields.manufacturer || ''} ${normalizedFields.model || extractedFields.model || ''}`.trim() || prev.description,
          }));
          setHardwareScannerOpen(false);
          toast({
            title: "Label scanned",
            description: "Hardware information has been populated from the scanned label.",
          });
        }}
      />
    </div>
  );
}
