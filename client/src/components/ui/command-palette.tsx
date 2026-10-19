/**
 * Command Palette Component
 * 
 * Global command palette with fuzzy search, categorized commands,
 * and recent command tracking. Triggered by ⌘K/Ctrl+K.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  FolderKanban,
  Plus,
  Wrench,
  BarChart3,
  Factory,
  ShoppingCart,
  BookOpen,
  Users,
  Settings,
  FileText,
  Calculator,
  Package,
  Building2,
  ClipboardList,
  MessageSquare,
  HelpCircle,
  Clock,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: "navigation" | "actions" | "projects" | "settings" | "help";
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  action: () => void;
  shortcut?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenHelp?: () => void;
  onOpenSearch?: () => void;
}

const RECENT_COMMANDS_KEY = "doorsurvey_recent_commands";
const MAX_RECENT_COMMANDS = 5;

export function CommandPalette({ open, onOpenChange, onOpenHelp, onOpenSearch }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (stored) {
      try {
        setRecentCommands(JSON.parse(stored));
      } catch {
        setRecentCommands([]);
      }
    }
  }, []);

  // Save command to recent commands
  const saveRecentCommand = useCallback((commandId: string) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((id) => id !== commandId);
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Define all available commands
  const commands: Command[] = [
    // Actions
    {
      id: "action-search",
      label: "Search",
      description: "Search projects, openings, and hardware",
      category: "actions",
      icon: Search,
      keywords: ["find", "lookup", "query"],
      action: () => {
        if (onOpenSearch) {
          onOpenChange(false);
          onOpenSearch();
        }
      },
      shortcut: "/",
    },
    // Navigation
    {
      id: "nav-dashboard",
      label: "Dashboard",
      description: "Go to dashboard home",
      category: "navigation",
      icon: Home,
      keywords: ["home", "overview"],
      action: () => setLocation("/"),
      shortcut: "G → D",
    },
    {
      id: "nav-projects",
      label: "Projects",
      description: "View all projects",
      category: "navigation",
      icon: FolderKanban,
      keywords: ["survey", "door"],
      action: () => setLocation("/projects"),
      shortcut: "G → P",
    },
    {
      id: "nav-quote-analytics",
      label: "Quote Analytics",
      description: "Quote and proposal analytics",
      category: "navigation",
      icon: FileText,
      keywords: ["quotes", "proposals", "estimate", "analytics"],
      action: () => setLocation("/quote-analytics"),
    },
    {
      id: "nav-hardware-schedule",
      label: "Hardware Schedule",
      description: "Door hardware scheduling",
      category: "navigation",
      icon: Wrench,
      keywords: ["hardware", "schedule"],
      action: () => setLocation("/hardware-schedule"),
      shortcut: "G → H",
    },
    {
      id: "nav-analytics",
      label: "Analytics",
      description: "View analytics and reports",
      category: "navigation",
      icon: BarChart3,
      keywords: ["reports", "metrics", "data"],
      action: () => setLocation("/analytics"),
      shortcut: "G → A",
    },
    {
      id: "nav-manufacturers",
      label: "Manufacturers",
      description: "Manage manufacturers",
      category: "navigation",
      icon: Factory,
      keywords: ["brands", "vendors"],
      action: () => setLocation("/manufacturers"),
      shortcut: "G → M",
    },
    {
      id: "nav-purchase-orders",
      label: "Purchase Orders",
      description: "Manage purchase orders",
      category: "navigation",
      icon: ShoppingCart,
      keywords: ["po", "ordering"],
      action: () => setLocation("/purchase-orders"),
      shortcut: "G → O",
    },
    {
      id: "nav-catalog",
      label: "Catalog",
      description: "Hardware catalog reference",
      category: "navigation",
      icon: BookOpen,
      keywords: ["reference", "library"],
      action: () => setLocation("/catalog"),
      shortcut: "G → C",
    },
    {
      id: "nav-team",
      label: "Team",
      description: "Team management",
      category: "navigation",
      icon: Users,
      keywords: ["members", "users"],
      action: () => setLocation("/team"),
      shortcut: "G → T",
    },
    {
      id: "nav-branding",
      label: "Branding & Organization",
      description: "Organization settings and branding",
      category: "navigation",
      icon: Building2,
      keywords: ["organization", "company", "branding"],
      action: () => setLocation("/branding"),
    },
    {
      id: "nav-profile",
      label: "Profile & Settings",
      description: "Your account settings",
      category: "navigation",
      icon: Settings,
      keywords: ["account", "preferences"],
      action: () => setLocation("/profile"),
      shortcut: "G → S",
    },
    {
      id: "nav-roadmap",
      label: "Product Roadmap",
      description: "View product roadmap",
      category: "navigation",
      icon: ClipboardList,
      keywords: ["features", "plans"],
      action: () => setLocation("/roadmap"),
    },

    // Actions
    {
      id: "action-new-project",
      label: "New Project",
      description: "Create a new door survey project",
      category: "actions",
      icon: Plus,
      keywords: ["create", "add", "survey"],
      action: () => setLocation("/projects/new"),
      shortcut: "N",
    },
    {
      id: "action-search",
      label: "Search",
      description: "Search across all data",
      category: "actions",
      icon: Search,
      keywords: ["find", "lookup"],
      action: () => {
        onOpenChange(false);
        onOpenSearch?.();
      },
      shortcut: "/",
    },

    // Help
    {
      id: "help-shortcuts",
      label: "Keyboard Shortcuts",
      description: "View all keyboard shortcuts",
      category: "help",
      icon: HelpCircle,
      keywords: ["hotkeys", "commands"],
      action: () => {
        onOpenChange(false);
        if (onOpenHelp) {
          onOpenHelp();
        }
      },
      shortcut: "?",
    },
    {
      id: "help-feedback",
      label: "Send Feedback",
      description: "Share your thoughts with us",
      category: "help",
      icon: MessageSquare,
      keywords: ["support", "contact"],
      action: () => setLocation("/bug-report"),
    },
  ];

  const handleCommandSelect = (command: Command) => {
    saveRecentCommand(command.id);
    command.action();
    onOpenChange(false);
  };

  // Get recent command objects
  const recentCommandObjects = recentCommands
    .map((id) => commands.find((cmd) => cmd.id === id))
    .filter((cmd): cmd is Command => cmd !== undefined);

  // Group commands by category
  const commandsByCategory = {
    navigation: commands.filter((cmd) => cmd.category === "navigation"),
    actions: commands.filter((cmd) => cmd.category === "actions"),
    help: commands.filter((cmd) => cmd.category === "help"),
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search..." 
        data-testid="input-command-palette"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Commands */}
        {recentCommandObjects.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentCommandObjects.map((command) => (
                <CommandItem
                  key={command.id}
                  value={command.label}
                  onSelect={() => handleCommandSelect(command)}
                  data-testid={`command-item-${command.id}`}
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <command.icon className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{command.label}</div>
                    {command.description && (
                      <div className="text-xs text-muted-foreground">
                        {command.description}
                      </div>
                    )}
                  </div>
                  {command.shortcut && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {command.shortcut}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {commandsByCategory.navigation.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label}
              keywords={command.keywords}
              onSelect={() => handleCommandSelect(command)}
              data-testid={`command-item-${command.id}`}
            >
              <command.icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{command.label}</div>
                {command.description && (
                  <div className="text-xs text-muted-foreground">
                    {command.description}
                  </div>
                )}
              </div>
              {command.shortcut && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {command.shortcut}
                </Badge>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          {commandsByCategory.actions.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label}
              keywords={command.keywords}
              onSelect={() => handleCommandSelect(command)}
              data-testid={`command-item-${command.id}`}
            >
              <command.icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{command.label}</div>
                {command.description && (
                  <div className="text-xs text-muted-foreground">
                    {command.description}
                  </div>
                )}
              </div>
              {command.shortcut && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {command.shortcut}
                </Badge>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="Help">
          {commandsByCategory.help.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label}
              keywords={command.keywords}
              onSelect={() => handleCommandSelect(command)}
              data-testid={`command-item-${command.id}`}
            >
              <command.icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{command.label}</div>
                {command.description && (
                  <div className="text-xs text-muted-foreground">
                    {command.description}
                  </div>
                )}
              </div>
              {command.shortcut && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {command.shortcut}
                </Badge>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
