import { useState } from "react";
import { Plus, FolderPlus, DoorOpen, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function QuickCreateMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const quickActions = [
    {
      icon: FolderPlus,
      label: "New Project",
      action: () => {
        setLocation("/projects/new");
        setIsOpen(false);
      },
      testId: "quick-create-project",
    },
    {
      icon: DoorOpen,
      label: "New Opening",
      action: () => {
        toast({
          title: "Select a Project",
          description: "Navigate to a project first to add openings",
        });
        setLocation("/projects");
        setIsOpen(false);
      },
      testId: "quick-create-opening",
    },
    {
      icon: FileText,
      label: "New Quote",
      action: () => {
        toast({
          title: "Select a Project",
          description: "Navigate to a project to generate quotes",
        });
        setLocation("/projects");
        setIsOpen(false);
      },
      testId: "quick-create-quote",
    },
  ];

  return (
    <>
      {/* Backdrop with fade animation */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm animate-fade-in pointer-events-auto cursor-pointer"
          onClick={() => setIsOpen(false)}
          data-testid="quick-create-backdrop"
        />
      )}

      {/* Quick Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        {/* Action buttons - appear when open with stagger animation */}
        {isOpen && (
          <div
            className="flex flex-col gap-2 mb-2 animate-fade-in-up"
            data-testid="quick-create-actions"
          >
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Button
                  variant="secondary"
                  size="default"
                  className="shadow-lg hover-elevate active-elevate-2 gap-2 min-w-[160px]"
                  onClick={action.action}
                  data-testid={action.testId}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB with rotation animation */}
        <Button
          size="icon"
          variant="default"
          className="h-14 w-14 rounded-full shadow-lg hover-elevate active-elevate-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Quick create menu"
          data-testid="quick-create-fab"
        >
          <div
            className="transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </div>
        </Button>
      </div>
    </>
  );
}
