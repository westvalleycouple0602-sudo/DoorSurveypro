import { useEffect, useState } from "react";
import { Clock, FolderOpen, DoorOpen, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecentItemsService, type RecentItem } from "@/lib/recent-items";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export function RecentItemsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load recent items on mount and subscribe to updates
  useEffect(() => {
    // Initial load
    setRecentItems(RecentItemsService.getRecentItems());

    // Subscribe to real-time updates
    const unsubscribe = RecentItemsService.onUpdate(() => {
      setRecentItems(RecentItemsService.getRecentItems());
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Reload when panel opens to get latest data (in case of cross-tab updates)
  useEffect(() => {
    if (isOpen) {
      setRecentItems(RecentItemsService.getRecentItems());
    }
  }, [isOpen]);

  const getIcon = (type: RecentItem["type"]) => {
    switch (type) {
      case "project":
        return FolderOpen;
      case "opening":
        return DoorOpen;
      case "quote":
        return FileText;
    }
  };

  const getTypeColor = (type: RecentItem["type"]) => {
    switch (type) {
      case "project":
        return "default";
      case "opening":
        return "secondary";
      case "quote":
        return "outline";
    }
  };

  return (
    <>
      {/* Trigger Button - using default size for better mobile touch target */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative min-w-11 min-h-11"
        aria-label="Recent items"
        data-testid="recent-items-trigger"
      >
        <Clock className="h-5 w-5" />
        {recentItems.length > 0 && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center pointer-events-none"
          >
            {recentItems.length}
          </Badge>
        )}
      </Button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
            data-testid="recent-items-backdrop"
            aria-hidden="true"
          />

          {/* Panel Card */}
          <Card className="fixed top-16 right-4 z-50 w-80 shadow-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Recent Items</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                onClick={() => setIsOpen(false)}
                aria-label="Close recent items"
                data-testid="recent-items-close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto" data-testid="recent-items-list">
              {recentItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No recent items</p>
                  <p className="text-xs mt-1">
                    Your recently viewed projects, openings, and quotes will appear here
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {recentItems.map((item, index) => {
                    const Icon = getIcon(item.type);
                    return (
                      <Link
                        key={`${item.type}-${item.id}-${index}`}
                        href={item.url}
                        onClick={() => setIsOpen(false)}
                      >
                        <div
                          className="flex items-start gap-3 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                          data-testid={`recent-item-${item.type}-${index}`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium truncate">
                                {item.title}
                              </p>
                              <Badge variant={getTypeColor(item.type)} className="text-xs flex-shrink-0">
                                {item.type}
                              </Badge>
                            </div>
                            {item.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.subtitle}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {recentItems.length > 0 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      RecentItemsService.clearRecentItems();
                      setRecentItems([]);
                    }}
                    data-testid="recent-items-clear"
                  >
                    Clear Recent Items
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
