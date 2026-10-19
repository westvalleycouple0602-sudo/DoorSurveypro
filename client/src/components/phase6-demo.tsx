import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Bookmark, Clock, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SearchHistory, SavedSearch } from "@shared/schema";

export function Phase6Demo() {
  const { toast } = useToast();
  const [newSearchName, setNewSearchName] = useState("");

  // Fetch search history
  const { data: searchHistory } = useQuery<SearchHistory[]>({
    queryKey: ["/api/search/history"],
  });

  // Fetch saved searches
  const { data: savedSearches } = useQuery<SavedSearch[]>({
    queryKey: ["/api/search/saved"],
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

  // Delete saved search mutation
  const deleteSavedSearchMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/search/saved/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search/saved"] });
      toast({
        title: "Search deleted",
        description: "Saved search has been deleted.",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Phase 6: Advanced Search & Filtering</h2>
        <p className="text-muted-foreground">
          Global search across all entities with saved searches and search history tracking
        </p>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Key Features
          </CardTitle>
          <CardDescription>Powerful search capabilities for DoorSurvey Pro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Global Search
              </h4>
              <p className="text-sm text-muted-foreground">
                Search across projects, door openings, and hardware items with full-text search
                and fuzzy matching
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Search History
              </h4>
              <p className="text-sm text-muted-foreground">
                Track recent searches for quick access and auto-suggestions based on your search
                patterns
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Searches
              </h4>
              <p className="text-sm text-muted-foreground">
                Save frequently used searches with custom names and share globally with your team
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Badge>NEW</Badge>
                Entity Grouping
              </h4>
              <p className="text-sm text-muted-foreground">
                Results are automatically grouped by entity type (Projects, Openings, Hardware)
                with relevance scoring
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>Quick access to search functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Open global search</span>
              <Badge variant="outline" className="font-mono">
                /
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Open command palette (includes search)</span>
              <Badge variant="outline" className="font-mono">
                ⌘K / Ctrl+K
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Navigate results</span>
              <Badge variant="outline" className="font-mono">
                ↑ ↓
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Select result</span>
              <Badge variant="outline" className="font-mono">
                Enter
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Searches
              </CardTitle>
              <CardDescription data-testid="text-search-history-description">
                Your recent search queries (<span data-testid="text-search-history-count">{searchHistory?.length || 0}</span> total)
              </CardDescription>
            </div>
            {searchHistory && searchHistory.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                data-testid="button-clear-search-history"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {searchHistory && searchHistory.length > 0 ? (
            <div className="space-y-2">
              {searchHistory.slice(0, 10).map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                  data-testid={`search-history-${search.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{search.query}</p>
                      <p className="text-xs text-muted-foreground">
                        {search.resultCount} results •{" "}
                        {new Date(search.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {Array.isArray(search.entityTypes)
                      ? search.entityTypes.length
                      : JSON.parse(search.entityTypes as string || "[]").length}{" "}
                    types
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" data-testid="empty-search-history">
              <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-search-history">No search history yet</p>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-search-history-hint">
                Your searches will appear here automatically
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Searches
          </CardTitle>
          <CardDescription data-testid="text-saved-searches-description">
            Your saved search queries (<span data-testid="text-saved-searches-count">{savedSearches?.length || 0}</span> total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savedSearches && savedSearches.length > 0 ? (
            <div className="space-y-2">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                  data-testid={`saved-search-${search.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Bookmark className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{search.name}</p>
                        {search.isGlobal && (
                          <Badge variant="outline" className="text-xs">
                            Global
                          </Badge>
                        )}
                      </div>
                      {search.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {search.description}
                        </p>
                      )}
                      {search.query && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Query: "{search.query}"
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteSavedSearchMutation.mutate(search.id)}
                    disabled={deleteSavedSearchMutation.isPending}
                    data-testid={`button-delete-saved-search-${search.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" data-testid="empty-saved-searches">
              <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-saved-searches">No saved searches yet</p>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-saved-searches-hint">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">/</kbd> to
                search, then save your searches
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Implementation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>Phase 6 architecture and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Backend Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>PostgreSQL full-text search with ts_rank scoring</li>
                <li>Multi-entity search across projects, openings, and hardware</li>
                <li>Search history tracking with automatic cleanup</li>
                <li>Saved searches with global/personal visibility</li>
                <li>RESTful API with filtering and pagination</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Frontend Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Global search dialog with keyboard shortcuts (/ key)</li>
                <li>Real-time search with debouncing (300ms)</li>
                <li>Search history suggestions and autocomplete</li>
                <li>Saved search management with CRUD operations</li>
                <li>Entity-grouped results with badges and navigation</li>
                <li>Command palette integration (⌘K/Ctrl+K)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Database Schema</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  <code className="text-xs bg-muted px-1 rounded">search_history</code> - Track
                  user searches with timestamps
                </li>
                <li>
                  <code className="text-xs bg-muted px-1 rounded">saved_searches</code> - User-saved
                  search queries and filters
                </li>
                <li>Multi-tenant isolation with organizationId</li>
                <li>Indexed for fast query performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Try It Out */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Try It Out!</CardTitle>
          <CardDescription>Experience the search functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              Press <kbd className="px-2 py-1 bg-muted rounded border font-mono">/</kbd> or click
              the button below to open the global search dialog and try searching across your
              projects, door openings, and hardware items.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  // Trigger the search dialog via keyboard shortcut simulation
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
                }}
                data-testid="button-open-search-demo"
              >
                <Search className="h-4 w-4 mr-2" />
                Open Global Search
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
                  );
                }}
                data-testid="button-open-command-palette-demo"
              >
                <Plus className="h-4 w-4 mr-2" />
                Open Command Palette
              </Button>
            </div>

            <div className="rounded-md bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">Quick Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Use "/" key anywhere in the app to open search instantly</li>
                <li>Search results are grouped by type (Projects, Openings, Hardware)</li>
                <li>Click the save icon to save frequently used searches</li>
                <li>Recent searches appear automatically when you open the dialog</li>
                <li>Access search from the command palette (⌘K) as well</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
