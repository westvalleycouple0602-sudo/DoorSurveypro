import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Trash2, Package, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Bom, BomItem } from "@shared/schema";

interface BomListProps {
  openingId: string;
}

interface BomWithItems extends Bom {
  items: BomItem[];
}

export function BomList({ openingId }: BomListProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bomToDelete, setBomToDelete] = useState<string | null>(null);

  const {
    data: boms,
    isLoading,
    error,
  } = useQuery<BomWithItems[]>({
    queryKey: [`/api/openings/${openingId}/bom`],
  });

  const generateBomMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/openings/${openingId}/bom/generate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/bom`] });
      toast({
        title: "BOM Generated",
        description: "Hardware recommendations have been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate BOM. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBomMutation = useMutation({
    mutationFn: async (bomId: string) => {
      return await apiRequest("DELETE", `/api/openings/${openingId}/bom/${bomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/bom`] });
      toast({
        title: "BOM Deleted",
        description: "BOM has been removed successfully.",
      });
      setDeleteDialogOpen(false);
      setBomToDelete(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete BOM. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load BOMs</p>
        </CardContent>
      </Card>
    );
  }

  const handleDeleteClick = (bomId: string) => {
    setBomToDelete(bomId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (bomToDelete) {
      deleteBomMutation.mutate(bomToDelete);
    }
  };

  const groupItemsByCategory = (items: BomItem[]) => {
    const grouped: Record<string, BomItem[]> = {};
    items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  };

  return (
    <div className="space-y-6" data-testid="bom-list-container">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Bill of Materials</h3>
          <p className="text-sm text-muted-foreground">
            AI-generated hardware recommendations based on door specifications
          </p>
        </div>
        <Button
          onClick={() => generateBomMutation.mutate()}
          disabled={generateBomMutation.isPending}
          data-testid="button-generate-bom"
        >
          {generateBomMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate BOM
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading BOMs...</p>
          </CardContent>
        </Card>
      ) : !boms || boms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h4 className="text-lg font-medium mb-1">No BOMs Generated</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a Bill of Materials to get AI-powered hardware recommendations
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {boms.map((bom) => {
            const groupedItems = groupItemsByCategory(bom.items);
            return (
              <Card key={bom.id} data-testid={`bom-card-${bom.id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Generated {new Date(bom.createdAt).toLocaleDateString()}
                    </CardTitle>
                    <CardDescription>
                      {bom.notes || "AI-generated hardware recommendations"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid={`badge-status-${bom.id}`}>
                      {bom.status}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-item-count-${bom.id}`}>
                      {bom.itemCount || bom.items.length} items
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteClick(bom.id)}
                      aria-label="Delete BOM"
                      data-testid={`button-delete-bom-${bom.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category} data-testid={`category-${category}`}>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          {category}
                          <Badge variant="secondary" className="text-xs">
                            {items.length}
                          </Badge>
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Brand</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Finish</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id} data-testid={`bom-item-${item.id}`}>
                                <TableCell className="font-medium">
                                  {item.description}
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.notes}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>{item.brand || "-"}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {item.sku || "-"}
                                </TableCell>
                                <TableCell>{item.finish || "-"}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete BOM?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Bill of Materials and all its items. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteBomMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteBomMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
