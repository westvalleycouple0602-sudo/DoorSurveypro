import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface DoorType {
  id: string;
  label: string;
  category: string;
  icon: string;
  glazing?: string[];
  hand?: string[];
  swing?: string;
  panels?: number;
  opening_code?: string;
  overlay?: boolean;
  appliesTo?: string[];
  tags?: string[];
  notes?: string;
}

interface DoorTypeSelectorProps {
  value?: string;
  onChange?: (doorTypeId: string) => void;
  className?: string;
}

export function DoorTypeSelector({ value, onChange, className }: DoorTypeSelectorProps) {
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/door-icons/metadata.json")
      .then(res => res.json())
      .then(data => {
        const nonBadgeTypes = data.filter((dt: DoorType) => dt.category !== "Badge");
        setDoorTypes(nonBadgeTypes);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...Array.from(new Set(doorTypes.map(dt => dt.category)))];

  const filteredDoorTypes = doorTypes.filter(dt => {
    const matchesCategory = selectedCategory === "all" || dt.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      dt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dt.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading door types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="door-search">Search Door Types</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="door-search"
            placeholder="Search by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            data-testid="input-door-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setSearchQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                data-testid={`tab-category-${cat.toLowerCase()}`}
                className="capitalize"
              >
                {cat === "all" ? "All Types" : cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {filteredDoorTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No door types found</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSearchQuery("");
                    }}
                    className="text-muted-foreground hover:underline text-sm mt-2"
                    data-testid="button-clear-search-empty"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-1">
                  {filteredDoorTypes.map((doorType) => (
                    <button
                      key={doorType.id}
                      type="button"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange?.(doorType.id);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        "hover-elevate active-elevate-2",
                        value === doorType.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                      data-testid={`door-type-${doorType.id}`}
                    >
                      <div className="w-full aspect-[4/3] flex items-center justify-center rounded-md bg-background/50">
                        <img
                          src={`/door-icons/${doorType.icon.replace('icons/', '')}`}
                          alt={doorType.label}
                          className="w-full h-full object-contain p-2"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-center w-full">
                        <p className="text-xs font-medium line-clamp-2 leading-tight">
                          {doorType.label}
                        </p>
                        {doorType.opening_code && (
                          <Badge variant="secondary" className="mt-1 text-[10px] px-1 py-0 h-4">
                            {doorType.opening_code}
                          </Badge>
                        )}
                      </div>
                      {value === doorType.id && (
                        <div className="absolute top-2 right-2">
                          <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {value && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-muted-foreground shrink-0">Selected:</span>
            <span className="text-sm font-medium truncate">
              {doorTypes.find(dt => dt.id === value)?.label || value}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onChange?.("");
            }}
            className="h-8 w-8 shrink-0"
            aria-label="Clear selection"
            data-testid="button-clear-selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
