import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAllShortcuts, KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Mail } from 'lucide-react';
import { COMPANY_EMAILS } from '@shared/emails';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const shortcuts = getAllShortcuts();

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const getCategoryTitle = (category: string) => {
    const titles: Record<string, string> = {
      utility: 'Utility',
      navigation: 'Navigation',
      actions: 'Actions',
    };
    return titles[category] || category;
  };

  const getCategoryDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      utility: 'Essential keyboard shortcuts',
      navigation: 'Navigate between pages',
      actions: 'Quick actions',
    };
    return descriptions[category] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-help">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and work faster in DoorSurvey Pro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <div className="mb-3">
                <h3 className="font-semibold text-sm">{getCategoryTitle(category)}</h3>
                <p className="text-xs text-muted-foreground">
                  {getCategoryDescription(category)}
                </p>
              </div>

              <div className="space-y-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    data-testid={`shortcut-${shortcut.key.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="outline" className="font-mono text-xs no-default-hover-elevate no-default-active-elevate">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Tip:</strong> Press <Badge variant="outline" className="mx-1 font-mono text-xs no-default-hover-elevate no-default-active-elevate">?</Badge> 
              anytime to see this help, or <Badge variant="outline" className="mx-1 font-mono text-xs no-default-hover-elevate no-default-active-elevate">⌘K</Badge> / 
              <Badge variant="outline" className="mx-1 font-mono text-xs no-default-hover-elevate no-default-active-elevate">Ctrl+K</Badge> to open the command palette.
            </p>
          </div>
          <div className="border-t pt-3 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Need Additional Help?</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    <strong>General Support:</strong>{" "}
                    <a href={`mailto:${COMPANY_EMAILS.support}`} className="text-muted-foreground hover:underline">
                      {COMPANY_EMAILS.support}
                    </a>
                  </p>
                  <p>
                    <strong>Technical Issues:</strong>{" "}
                    <a href={`mailto:${COMPANY_EMAILS.techSupport}`} className="text-muted-foreground hover:underline">
                      {COMPANY_EMAILS.techSupport}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
