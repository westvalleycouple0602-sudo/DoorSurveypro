import { useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Package,
  Plus,
  Lock,
  DoorOpen,
  Wrench,
  LogOut,
  Bot,
  Key,
  Boxes,
} from "lucide-react";
import type { CatalogItem } from "@shared/schema";

interface HardwareCatalogSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CatalogItem) => void;
}

const categoryIcons: Record<string, ElementType> = {
  door: DoorOpen,
  frame: Package,
  hardware: Lock,
  lock: Key,
  hinge: Wrench,
  closer: Wrench,
  "exit-device": LogOut,
  automation: Bot,
  "access-control": Key,
  misc: Boxes,
};

const hardwareCategories = [
  { value: "all", label: "All Hardware" },
  { value: "lock", label: "Locks" },
  { value: "hinge", label: "Hinges" },
  { value: "closer", label: "Closers" },
  { value: "exit-device", label: "Exit Devices" },
  { value: "automation", label: "Automation" },
  { value: "access-control", label: "Access Control" },
  { value: "hardware", label: "General Hardware" },
  { value: "door", label: "Doors" },
  { value: "frame", label: "Frames" },
  { value: "misc", label: "Miscellaneous" },
];

export function HardwareCatalogSelector({
  open,
  onOpenChange,
  onSelect,
}: HardwareCatalogSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: catalogData = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog"],
    enabled: open,
  });

  // Ensure catalogItems is always an array for defensive programming
  const catalogItems = Array.isArray(catalogData) ? catalogData : [];

  const filteredItems = catalogItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.model.toLowerCase().includes(query) ||
      item.manufacturer?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.specifications?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    onOpenChange(false);
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const categoryCounts = catalogItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Select from Catalog</DialogTitle>
          <DialogDescription>
            Browse and select hardware items from your product catalog
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by model, manufacturer, or category..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-catalog-search"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="inline-flex w-auto">
                {hardwareCategories.map((cat) => {
                  const count = cat.value === "all" 
                    ? catalogItems.length 
                    : categoryCounts[cat.value] || 0;
                  
                  return (
                    <TabsTrigger
                      key={cat.value}
                      value={cat.value}
                      className="gap-2"
                      data-testid={`tab-category-${cat.value}`}
                    >
                      {cat.label}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>

        <ScrollArea className="h-[450px] px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {catalogItems.length === 0
                      ? "No catalog items yet"
                      : "No items found"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {catalogItems.length === 0
                      ? "Add items to your catalog to use the quick selector"
                      : "Try adjusting your search or filter"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {filteredItems.map((item) => {
                const IconComponent = categoryIcons[item.category] || Package;
                
                return (
                  <Card
                    key={item.id}
                    className="hover-elevate active-elevate-2 cursor-pointer group"
                    onClick={() => handleSelect(item)}
                    data-testid={`card-catalog-item-${item.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="shrink-0">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm font-medium line-clamp-1">
                              {item.model}
                            </CardTitle>
                            {item.manufacturer && (
                              <CardDescription className="text-xs line-clamp-1 mt-0.5">
                                {item.manufacturer}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item);
                          }}
                          aria-label="Select item"
                          data-testid={`button-select-${item.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="text-xs mb-2">
                        {item.category}
                      </Badge>
                      {(item.specifications || item.notes) && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.specifications || item.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
