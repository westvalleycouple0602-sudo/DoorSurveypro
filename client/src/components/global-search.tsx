import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Clock, Bookmark, X, Save, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SearchHistory, SavedSearch } from "@shared/schema";

interface SearchResult {
  type: 'project' | 'opening' | 'hardware';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface GroupedResults {
  projects: SearchResult[];
  openings: SearchResult[];
  hardware: SearchResult[];
  total: number;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Fetch search results
  const { data: results, isLoading } = useQuery<GroupedResults>({
    queryKey: ["/api/search", debouncedQuery],
    enabled: debouncedQuery.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  // Fetch recent searches
  const { data: recentSearches } = useQuery<SearchHistory[]>({
    queryKey: ["/api/search/history"],
    enabled: open && !query,
    queryFn: async () => {
      const res = await fetch("/api/search/history?limit=5");
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  // Fetch saved searches
  const { data: savedSearches } = useQuery<SavedSearch[]>({
    queryKey: ["/api/search/saved"],
    enabled: open,
  });

  // Save search mutation
  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/search/saved", {
        name,
        query,
        entityTypes: JSON.stringify(['projects', 'openings', 'hardware']),
        filters: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search/saved"] });
      toast({
        title: "Search saved",
        description: "Your search has been saved successfully.",
      });
      setShowSaveDialog(false);
      setSaveName("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to save search",
        description: "Please try again.",
      });
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/search/history"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search/history"] });
      toast({
        title: "History cleared",
        description: "Your search history has been cleared.",
      });
    },
  });

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
    setQuery("");
  };

  const handleRecentSearchClick = (search: SearchHistory) => {
    setQuery(search.query);
  };

  const handleSavedSearchClick = (search: SavedSearch) => {
    if (search.query) {
      setQuery(search.query);
    }
  };

  const handleSaveSearch = () => {
    if (saveName.trim() && query.trim()) {
      saveMutation.mutate(saveName.trim());
    }
  };

  const entityTypeLabels = {
    project: "Projects",
    opening: "Door Openings",
    hardware: "Hardware Items",
  };

  const entityTypeBadges = {
    project: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    opening: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    hardware: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search across projects, door openings, and hardware items
        </DialogDescription>

        <div className="flex flex-col">
          {/* Search Header */}
          <div className="flex items-center gap-2 border-b p-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search projects, openings, hardware..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="input-global-search"
            />
            {query && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowSaveDialog(true)}
                  aria-label="Save search"
                  data-testid="button-save-search"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Save Search Dialog */}
          {showSaveDialog && (
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Name this search..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="flex-1"
                  data-testid="input-save-search-name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveSearch();
                    } else if (e.key === "Escape") {
                      setShowSaveDialog(false);
                      setSaveName("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveSearch}
                  disabled={!saveName.trim() || saveMutation.isPending}
                  data-testid="button-confirm-save-search"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveName("");
                  }}
                  data-testid="button-cancel-save-search"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          <ScrollArea className="h-[500px]">
            <div className="p-4">
              {/* Loading State */}
              {isLoading && query && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Searching...</div>
                </div>
              )}

              {/* Search Results */}
              {results && results.total > 0 && (
                <div className="space-y-6">
                  {/* Projects */}
                  {results.projects.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {entityTypeLabels.project} ({results.projects.length})
                      </h3>
                      <div className="space-y-1">
                        {results.projects.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left rounded-md p-3 hover-elevate active-elevate-2 transition-colors"
                            data-testid={`result-project-${result.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{result.title}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {result.subtitle}
                                </div>
                              </div>
                              <Badge className={entityTypeBadges.project} variant="secondary">
                                Project
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Door Openings */}
                  {results.openings.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {entityTypeLabels.opening} ({results.openings.length})
                      </h3>
                      <div className="space-y-1">
                        {results.openings.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left rounded-md p-3 hover-elevate active-elevate-2 transition-colors"
                            data-testid={`result-opening-${result.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{result.title}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {result.subtitle}
                                </div>
                              </div>
                              <Badge className={entityTypeBadges.opening} variant="secondary">
                                Opening
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hardware Items */}
                  {results.hardware.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {entityTypeLabels.hardware} ({results.hardware.length})
                      </h3>
                      <div className="space-y-1">
                        {results.hardware.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left rounded-md p-3 hover-elevate active-elevate-2 transition-colors"
                            data-testid={`result-hardware-${result.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{result.title}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {result.subtitle}
                                </div>
                              </div>
                              <Badge className={entityTypeBadges.hardware} variant="secondary">
                                Hardware
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {results && results.total === 0 && query && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12" data-testid="empty-search-results">
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground" data-testid="text-no-results-message">No results found for "{query}"</p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-no-results-hint">
                    Try different keywords or check your spelling
                  </p>
                </div>
              )}

              {/* Recent Searches */}
              {!query && recentSearches && recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Searches
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearHistoryMutation.mutate()}
                      data-testid="button-clear-history"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search) => (
                      <button
                        key={search.id}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full text-left rounded-md p-3 hover-elevate active-elevate-2 transition-colors"
                        data-testid={`recent-search-${search.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{search.query}</span>
                          <span className="text-xs text-muted-foreground">
                            {search.resultCount} results
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Searches */}
              {!query && savedSearches && savedSearches.length > 0 && (
                <div className="space-y-2 mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    Saved Searches
                  </h3>
                  <div className="space-y-1">
                    {savedSearches.map((search) => (
                      <button
                        key={search.id}
                        onClick={() => handleSavedSearchClick(search)}
                        className="w-full text-left rounded-md p-3 hover-elevate active-elevate-2 transition-colors"
                        data-testid={`saved-search-${search.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{search.name}</div>
                            {search.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {search.description}
                              </div>
                            )}
                          </div>
                          {search.isGlobal && (
                            <Badge variant="outline" className="text-xs">
                              Global
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!query && !recentSearches?.length && !savedSearches?.length && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">Start typing to search</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search across projects, openings, and hardware
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-3 bg-muted/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">Enter</kbd> Select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">Esc</kbd> Close
                </span>
              </div>
              {results && results.total > 0 && (
                <span data-testid="text-results-count">{results.total} results found</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
