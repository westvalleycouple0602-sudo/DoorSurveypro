/**
 * Phase 5 Demo Component
 * 
 * Interactive demonstration of keyboard navigation and command palette features
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Command,
  Keyboard,
  Zap,
  Navigation,
  CheckCircle2,
  ArrowRight,
  Focus,
} from "lucide-react";
import { CommandPalette } from "@/components/ui/command-palette";
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog";
import { useToast } from "@/hooks/use-toast";

const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modifierKey = isMac ? "⌘" : "Ctrl";

function KeyboardKey({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={`inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded border border-border bg-muted text-xs font-mono font-semibold shadow-sm ${className || ""}`}>
      {children}
    </kbd>
  );
}

export function Phase5Demo() {
  const { toast } = useToast();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const features = [
    {
      icon: Command,
      title: "Command Palette",
      description: "Fuzzy search for pages, actions, and commands with recent history tracking",
      color: "text-blue-500",
    },
    {
      icon: Keyboard,
      title: "Keyboard Shortcuts",
      description: "Platform-aware shortcuts for navigation, actions, and utilities",
      color: "text-purple-500",
    },
    {
      icon: Focus,
      title: "Focus Management",
      description: "Proper focus trapping, restoration, and visible focus indicators",
      color: "text-emerald-500",
    },
    {
      icon: Zap,
      title: "Power User Features",
      description: "G+ navigation, quick actions, and modal interactions",
      color: "text-orange-500",
    },
  ];

  const commandPaletteFeatures = [
    "Fuzzy search across all pages and actions",
    "Categorized commands (Navigation, Actions, Help)",
    "Recent commands tracking (last 5 used)",
    "Keyboard navigation within palette",
    "Visual keyboard shortcuts display",
    "Instant navigation and action execution",
  ];

  const keyboardShortcuts = [
    { key: `${modifierKey}+K`, description: "Open command palette" },
    { key: "?", description: "Show keyboard shortcuts help" },
    { key: "G then D", description: "Go to Dashboard" },
    { key: "G then P", description: "Go to Projects" },
    { key: "N", description: "Create new project" },
    { key: "Esc", description: "Close dialog or modal" },
    { key: "Tab", description: "Navigate between fields" },
    { key: "/", description: "Focus search" },
  ];

  const focusManagementFeatures = [
    "Focus trapping in dialogs and modals",
    "Automatic focus restoration after modal close",
    "Skip to main content link for screen readers",
    "Visible focus indicators for all interactive elements",
    "Arrow key navigation in lists and grids",
    "Tab order follows visual hierarchy",
  ];

  return (
    <div className="space-y-6" data-testid="phase5-demo">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20">
        <div className="rounded-lg bg-purple-500/10 p-2 shrink-0">
          <Sparkles className="h-5 w-5 text-purple-500" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phase 5: Keyboard Navigation & Command Palette</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Power-user features with comprehensive keyboard navigation, command palette, and enhanced
            accessibility
          </p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
                {feature.title}
              </CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="command-palette" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="command-palette" data-testid="tab-command-palette">
            <Command className="h-4 w-4 mr-2" aria-hidden="true" />
            Command Palette
          </TabsTrigger>
          <TabsTrigger value="shortcuts" data-testid="tab-shortcuts">
            <Keyboard className="h-4 w-4 mr-2" aria-hidden="true" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="focus" data-testid="tab-focus">
            <Focus className="h-4 w-4 mr-2" aria-hidden="true" />
            Focus
          </TabsTrigger>
          <TabsTrigger value="integration" data-testid="tab-integration">
            <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
            Integration
          </TabsTrigger>
        </TabsList>

        {/* Command Palette Tab */}
        <TabsContent value="command-palette" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Command Palette</CardTitle>
              <CardDescription>
                Press <KeyboardKey>{modifierKey}+K</KeyboardKey> to open the command palette anywhere
                in the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Try It */}
              <div>
                <h3 className="font-semibold mb-3">Try it now</h3>
                <Button
                  onClick={() => setShowCommandPalette(true)}
                  className="w-full justify-between"
                  variant="outline"
                  data-testid="button-open-command-palette"
                >
                  <span className="flex items-center gap-2">
                    <Command className="h-4 w-4" />
                    Open Command Palette
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {modifierKey}+K
                  </Badge>
                </Button>
              </div>

              <Separator />

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-3">Features</h3>
                <div className="space-y-2">
                  {commandPaletteFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* How to Use */}
              <div>
                <h3 className="font-semibold mb-3">How to Use</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      Press <KeyboardKey className="mx-1">{modifierKey}+K</KeyboardKey> to open the
                      command palette
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>Type to search for pages, actions, or commands</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      Use <KeyboardKey className="mx-1">↑</KeyboardKey> and{" "}
                      <KeyboardKey className="mx-1">↓</KeyboardKey> to navigate results
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      Press <KeyboardKey className="mx-1">Enter</KeyboardKey> to execute a command
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      Press <KeyboardKey className="mx-1">Esc</KeyboardKey> to close
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shortcuts Tab */}
        <TabsContent value="shortcuts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>
                Learn all available shortcuts to navigate DoorSurvey Pro efficiently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Try It */}
              <div>
                <h3 className="font-semibold mb-3">View all shortcuts</h3>
                <Button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="w-full justify-between"
                  variant="outline"
                  data-testid="button-show-keyboard-shortcuts"
                >
                  <span className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    Show Keyboard Shortcuts
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    ?
                  </Badge>
                </Button>
              </div>

              <Separator />

              {/* Common Shortcuts */}
              <div>
                <h3 className="font-semibold mb-3">Most Used Shortcuts</h3>
                <div className="space-y-2">
                  {keyboardShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`shortcut-preview-${index}`}
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {shortcut.key}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Platform Detection */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">
                      Platform: {isMac ? "macOS" : "Windows/Linux"}
                    </p>
                    <p className="text-muted-foreground">
                      Shortcuts are automatically adapted for your operating system. The modifier
                      key is <KeyboardKey className="inline-flex mx-1">{modifierKey}</KeyboardKey>{" "}
                      on your platform.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Focus Management Tab */}
        <TabsContent value="focus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Focus Management</CardTitle>
              <CardDescription>
                Enhanced accessibility with proper focus handling and visible indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features */}
              <div>
                <h3 className="font-semibold mb-3">Focus Features</h3>
                <div className="space-y-2">
                  {focusManagementFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Demo */}
              <div>
                <h3 className="font-semibold mb-3">Try Focus Management</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Open any dialog to experience focus trapping and restoration
                </p>
                <div className="grid gap-2">
                  <Button
                    onClick={() => {
                      setShowCommandPalette(true);
                      toast({
                        title: "Focus Trapped",
                        description: "Tab navigation is now trapped within the command palette",
                      });
                    }}
                    variant="outline"
                    data-testid="button-demo-focus-trap"
                  >
                    Demo: Open Command Palette (Focus Trap)
                  </Button>
                  <Button
                    onClick={() => {
                      setShowKeyboardShortcuts(true);
                      toast({
                        title: "Focus Managed",
                        description: "Focus will restore to this button when you close the dialog",
                      });
                    }}
                    variant="outline"
                    data-testid="button-demo-focus-restore"
                  >
                    Demo: Open Shortcuts Dialog (Focus Restoration)
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Accessibility Benefits */}
              <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Accessibility Benefits</p>
                    <p className="text-muted-foreground">
                      These features ensure keyboard-only users and screen reader users can navigate
                      the application efficiently, meeting WCAG 2.1 AA standards.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Integration</CardTitle>
              <CardDescription>
                Phase 5 features are available throughout the entire application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Available Everywhere</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Command className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Command Palette</p>
                      <p className="text-muted-foreground">
                        Press <KeyboardKey className="inline-flex mx-1">{modifierKey}+K</KeyboardKey>{" "}
                        from any page to access all commands
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Navigation className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Navigation Shortcuts</p>
                      <p className="text-muted-foreground">
                        Use G+key shortcuts (e.g., G then D for Dashboard) from anywhere
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Keyboard className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Shortcuts Help</p>
                      <p className="text-muted-foreground">
                        Press <KeyboardKey className="inline-flex mx-1">?</KeyboardKey> to view all
                        available shortcuts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Focus className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Focus Management</p>
                      <p className="text-muted-foreground">
                        All dialogs and modals include focus trapping and restoration
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-md bg-muted/50 space-y-2 text-sm">
                <p className="font-semibold">Phase 5 Enhancements:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Command palette with fuzzy search and 20+ commands</li>
                  <li>Platform-aware keyboard shortcuts (Mac/Windows/Linux)</li>
                  <li>G+ navigation shortcuts for all major pages</li>
                  <li>Focus trapping in all dialogs and modals</li>
                  <li>Recent commands tracking (last 5 used)</li>
                  <li>Searchable keyboard shortcuts reference</li>
                  <li>Visible focus indicators throughout the app</li>
                  <li>WCAG 2.1 AA accessibility compliance</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Command Palette Dialog */}
      <CommandPalette open={showCommandPalette} onOpenChange={setShowCommandPalette} />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />
    </div>
  );
}
