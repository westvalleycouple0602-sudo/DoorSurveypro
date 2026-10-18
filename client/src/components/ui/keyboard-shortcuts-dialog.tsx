/**
 * Keyboard Shortcuts Dialog
 * 
 * Displays all available keyboard shortcuts organized by category
 * with visual keyboard representation and search functionality.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Command, Keyboard, Navigation, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  key: string;
  description: string;
  category: "navigation" | "actions" | "utility" | "modals";
}

// Platform detection
const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modifierKey = isMac ? "⌘" : "Ctrl";

const shortcuts: ShortcutItem[] = [
  // Utility
  {
    key: `${modifierKey}+K`,
    description: "Open command palette",
    category: "utility",
  },
  {
    key: "?",
    description: "Show keyboard shortcuts",
    category: "utility",
  },
  {
    key: "Esc",
    description: "Close dialog or modal",
    category: "utility",
  },

  // Navigation - G+ shortcuts
  {
    key: "G then D",
    description: "Go to Dashboard",
    category: "navigation",
  },
  {
    key: "G then P",
    description: "Go to Projects",
    category: "navigation",
  },
  {
    key: "G then H",
    description: "Go to Hardware Schedule",
    category: "navigation",
  },
  {
    key: "G then A",
    description: "Go to Analytics",
    category: "navigation",
  },
  {
    key: "G then M",
    description: "Go to Manufacturers",
    category: "navigation",
  },
  {
    key: "G then O",
    description: "Go to Purchase Orders",
    category: "navigation",
  },
  {
    key: "G then C",
    description: "Go to Catalog",
    category: "navigation",
  },
  {
    key: "G then T",
    description: "Go to Team",
    category: "navigation",
  },
  {
    key: "G then S",
    description: "Go to Settings",
    category: "navigation",
  },

  // Actions
  {
    key: "N",
    description: "Create new project",
    category: "actions",
  },
  {
    key: "/",
    description: "Focus search",
    category: "actions",
  },

  // Modal interactions
  {
    key: "Tab",
    description: "Navigate between fields",
    category: "modals",
  },
  {
    key: "Shift+Tab",
    description: "Navigate backwards",
    category: "modals",
  },
  {
    key: "Enter",
    description: "Submit form or confirm action",
    category: "modals",
  },
];

function KeyboardKey({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded border border-border bg-muted text-xs font-mono font-semibold shadow-sm",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter shortcuts based on search
  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const shortcutsByCategory = {
    utility: filteredShortcuts.filter((s) => s.category === "utility"),
    navigation: filteredShortcuts.filter((s) => s.category === "navigation"),
    actions: filteredShortcuts.filter((s) => s.category === "actions"),
    modals: filteredShortcuts.filter((s) => s.category === "modals"),
  };

  const renderShortcutKey = (keyString: string) => {
    // Handle combinations like "Cmd+K" or "G then D"
    if (keyString.includes("+")) {
      const parts = keyString.split("+");
      return (
        <div className="flex items-center gap-1">
          {parts.map((part, index) => (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground">+</span>}
              <KeyboardKey>{part}</KeyboardKey>
            </div>
          ))}
        </div>
      );
    } else if (keyString.includes(" then ")) {
      const parts = keyString.split(" then ");
      return (
        <div className="flex items-center gap-2">
          {parts.map((part, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-muted-foreground text-sm">then</span>}
              <KeyboardKey>{part}</KeyboardKey>
            </div>
          ))}
        </div>
      );
    } else {
      return <KeyboardKey>{keyString}</KeyboardKey>;
    }
  };

  const renderShortcutList = (shortcuts: ShortcutItem[]) => (
    <div className="space-y-2">
      {shortcuts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No shortcuts found</p>
      ) : (
        shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
            data-testid={`shortcut-item-${shortcut.category}-${index}`}
          >
            <span className="text-sm">{shortcut.description}</span>
            {renderShortcutKey(shortcut.key)}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        data-testid="dialog-keyboard-shortcuts"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Learn keyboard shortcuts to navigate DoorSurvey Pro more efficiently
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-shortcuts"
          />
        </div>

        {/* Platform Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Command className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Platform: {isMac ? "macOS" : "Windows/Linux"}</p>
                <p className="text-muted-foreground">
                  Keyboard shortcuts are optimized for your platform. The modifier key is{" "}
                  <KeyboardKey className="inline-flex mx-1">{modifierKey}</KeyboardKey> on your
                  system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for categories */}
        <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" data-testid="tab-all-shortcuts">
              All
            </TabsTrigger>
            <TabsTrigger value="utility" data-testid="tab-utility-shortcuts">
              <Zap className="h-4 w-4 mr-2" />
              Utility
            </TabsTrigger>
            <TabsTrigger value="navigation" data-testid="tab-navigation-shortcuts">
              <Navigation className="h-4 w-4 mr-2" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions-shortcuts">
              Actions
            </TabsTrigger>
            <TabsTrigger value="modals" data-testid="tab-modals-shortcuts">
              Modals
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="all" className="mt-0">
              <div className="space-y-6">
                {shortcutsByCategory.utility.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Utility
                    </h3>
                    {renderShortcutList(shortcutsByCategory.utility)}
                  </div>
                )}
                {shortcutsByCategory.navigation.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      Navigation
                    </h3>
                    {renderShortcutList(shortcutsByCategory.navigation)}
                  </div>
                )}
                {shortcutsByCategory.actions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Actions</h3>
                    {renderShortcutList(shortcutsByCategory.actions)}
                  </div>
                )}
                {shortcutsByCategory.modals.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Modals & Forms</h3>
                    {renderShortcutList(shortcutsByCategory.modals)}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="utility" className="mt-0">
              {renderShortcutList(shortcutsByCategory.utility)}
            </TabsContent>

            <TabsContent value="navigation" className="mt-0">
              {renderShortcutList(shortcutsByCategory.navigation)}
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              {renderShortcutList(shortcutsByCategory.actions)}
            </TabsContent>

            <TabsContent value="modals" className="mt-0">
              {renderShortcutList(shortcutsByCategory.modals)}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer tip */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Press <KeyboardKey className="inline-flex mx-1">Esc</KeyboardKey> to close this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}
