import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GasketingCatalog, OpeningGasketing } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface GasketingSelectorProps {
  openingId: string;
  disabled?: boolean;
}

const LOCATION_OPTIONS = [
  { value: "head", label: "Head" },
  { value: "jambs", label: "Jambs (Both)" },
  { value: "left-jamb", label: "Left Jamb" },
  { value: "right-jamb", label: "Right Jamb" },
  { value: "meeting-stile", label: "Meeting Stile" },
  { value: "threshold", label: "Threshold" },
  { value: "perimeter", label: "Perimeter (Full)" },
];

export function GasketingSelector({ openingId, disabled }: GasketingSelectorProps) {
  const { toast } = useToast();
  const [selectedGasketingId, setSelectedGasketingId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");

  const { data: catalog = [], isLoading: catalogLoading } = useQuery<GasketingCatalog[]>({
    queryKey: ["/api/gasketing-catalog"],
  });

  const { data: appliedGasketing = [], isLoading: gasketingLoading } = useQuery<OpeningGasketing[]>({
    queryKey: ["/api/openings", openingId, "gasketing"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { gasketingId: string; quantity: number; location: string; notes: string }) => {
      return await apiRequest("POST", `/api/openings/${openingId}/gasketing`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openings", openingId, "gasketing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/openings", openingId] });
      toast({ title: "Gasketing added", description: "Gasketing item added successfully" });
      setSelectedGasketingId("");
      setLocation("");
      setQuantity("1");
      setNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add gasketing", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/opening-gasketing/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openings", openingId, "gasketing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/openings", openingId] });
      toast({ title: "Gasketing removed", description: "Gasketing item removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove gasketing", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!selectedGasketingId || !location) {
      toast({ title: "Missing information", description: "Please select a gasketing item and location", variant: "destructive" });
      return;
    }

    addMutation.mutate({
      gasketingId: selectedGasketingId,
      quantity: parseFloat(quantity) || 1,
      location,
      notes,
    });
  };

  const getGasketingDetails = (id: string) => {
    return catalog.find(item => item.id === id);
  };

  if (catalogLoading || gasketingLoading) {
    return <div data-testid="loading-gasketing">Loading gasketing...</div>;
  }

  const activeCatalog = catalog.filter(item => item.isActive === "yes");

  return (
    <Card data-testid="card-gasketing-selector">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gasketing & Seals
        </CardTitle>
        <CardDescription>
          Fire seals, smoke seals, thresholds, and weather stripping for this opening
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appliedGasketing.length > 0 && (
          <div className="space-y-2" data-testid="container-applied-gasketing">
            <Label>Applied Gasketing</Label>
            <div className="space-y-2">
              {appliedGasketing.map((item) => {
                const details = getGasketingDetails(item.gasketingId);
                return (
                  <div key={item.id} className="flex items-start gap-2 p-3 border rounded-md" data-testid={`item-gasketing-${item.id}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{details?.manufacturer} {details?.partNumber}</span>
                        <Badge variant="outline" data-testid={`badge-category-${item.id}`}>{details?.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{details?.productName}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span>Location: <strong>{item.location}</strong></span>
                        <span>Qty: <strong>{item.quantity}</strong></span>
                        {details?.fireRating && <Badge variant="secondary" data-testid={`badge-fire-${item.id}`}>{details.fireRating}</Badge>}
                        {details?.smokeRating === "yes" && <Badge variant="secondary" data-testid={`badge-smoke-${item.id}`}>Smoke Rated</Badge>}
                      </div>
                      {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={disabled || deleteMutation.isPending}
                      aria-label="Remove gasketing item"
                      data-testid={`button-delete-${item.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3" data-testid="form-add-gasketing">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gasketing-select">Gasketing Item</Label>
              <Select
                value={selectedGasketingId}
                onValueChange={setSelectedGasketingId}
                disabled={disabled}
              >
                <SelectTrigger id="gasketing-select" data-testid="select-gasketing-item">
                  <SelectValue placeholder="Select gasketing..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCatalog.map((item) => (
                    <SelectItem key={item.id} value={item.id} data-testid={`option-${item.id}`}>
                      {item.manufacturer} {item.partNumber} - {item.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-select">Location</Label>
              <Select
                value={location}
                onValueChange={setLocation}
                disabled={disabled}
              >
                <SelectTrigger id="location-select" data-testid="select-location">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-location-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={disabled}
                data-testid="input-quantity"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={disabled}
                placeholder="Installation notes..."
                data-testid="input-notes"
              />
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={disabled || addMutation.isPending || !selectedGasketingId || !location}
            className="w-full"
            data-testid="button-add-gasketing"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Gasketing
          </Button>
        </div>

        {selectedGasketingId && (
          <div className="p-3 bg-muted rounded-md text-sm" data-testid="preview-selected-gasketing">
            {(() => {
              const selected = getGasketingDetails(selectedGasketingId);
              if (!selected) return null;
              return (
                <div className="space-y-1">
                  <div className="font-medium">{selected.productName}</div>
                  <div className="text-muted-foreground">{selected.description}</div>
                  <div className="flex gap-2 mt-2">
                    {selected.material && <Badge variant="outline">Material: {selected.material}</Badge>}
                    {selected.fireRating && <Badge variant="secondary">Fire: {selected.fireRating}</Badge>}
                    {selected.smokeRating === "yes" && <Badge variant="secondary">Smoke Rated</Badge>}
                    {selected.listPrice && <Badge variant="outline">${selected.listPrice}</Badge>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
