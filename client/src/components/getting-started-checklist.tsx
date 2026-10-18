import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

const CHECKLIST_STORAGE_KEY = 'doorsurvey-onboarding-checklist';

interface ChecklistProgress {
  [key: string]: boolean;
}

function loadChecklistProgress(): ChecklistProgress {
  try {
    const stored = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveChecklistProgress(progress: ChecklistProgress) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Silently fail if localStorage is not available
  }
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    url: string;
  };
}

interface GettingStartedChecklistProps {
  onDismiss?: () => void;
}

export function GettingStartedChecklist({ onDismiss }: GettingStartedChecklistProps) {
  // Load saved progress from localStorage on mount
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const savedProgress = loadChecklistProgress();
    return [
      {
        id: 'create-project',
        title: 'Create your first project',
        description: 'Start by creating a project to organize your door surveys',
        completed: savedProgress['create-project'] || false,
        action: {
          label: 'Create Project',
          url: '/projects/new',
        },
      },
      {
        id: 'add-opening',
        title: 'Add a door opening',
        description: 'Survey your first door opening with all its specifications',
        completed: savedProgress['add-opening'] || false,
        action: {
          label: 'New Opening',
          url: '/openings/new',
        },
      },
      {
        id: 'upload-photo',
        title: 'Upload a photo',
        description: 'Use our AI-powered photo analysis to identify hardware',
        completed: savedProgress['upload-photo'] || false,
        action: {
          label: 'Try Computer Vision',
          url: '/computer-vision',
        },
      },
      {
        id: 'generate-report',
        title: 'Generate a report',
        description: 'Create professional PDF reports for your clients',
        completed: savedProgress['generate-report'] || false,
        action: {
          label: 'View Reports',
          url: '/reports',
        },
      },
      {
        id: 'invite-team',
        title: 'Invite team members',
        description: 'Collaborate with your team on survey projects',
        completed: savedProgress['invite-team'] || false,
        action: {
          label: 'Manage Team',
          url: '/team',
        },
      },
    ];
  });

  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const isComplete = completedCount === items.length;

  const toggleItem = (id: string) => {
    setItems(prevItems => {
      const updated = prevItems.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      
      // Save progress to localStorage
      const progress: ChecklistProgress = {};
      updated.forEach(item => {
        progress[item.id] = item.completed;
      });
      saveChecklistProgress(progress);
      
      return updated;
    });
  };

  // Save progress whenever items change
  useEffect(() => {
    const progress: ChecklistProgress = {};
    items.forEach(item => {
      progress[item.id] = item.completed;
    });
    saveChecklistProgress(progress);
  }, [items]);

  return (
    <Card className="relative" data-testid="card-getting-started">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
        aria-label="Dismiss checklist"
        data-testid="button-dismiss-checklist"
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <CardTitle>Getting Started</CardTitle>
        </div>
        <CardDescription>
          Complete these steps to get the most out of DoorSurvey Pro
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {items.length} completed
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} data-testid="progress-checklist" />
        </div>

        {isComplete ? (
          <div
            className="py-8 text-center space-y-2"
            data-testid="message-checklist-complete"
          >
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <p className="font-semibold">Great job!</p>
            <p className="text-sm text-muted-foreground">
              You've completed all the getting started steps
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-md border transition-colors hover-elevate',
                  item.completed && 'bg-muted/50'
                )}
                data-testid={`checklist-item-${item.id}`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="mt-0.5"
                  data-testid={`button-toggle-${item.id}`}
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <p
                    className={cn(
                      'font-medium text-sm',
                      item.completed && 'text-muted-foreground line-through'
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                {item.action && !item.completed && (
                  <Link href={item.action.url}>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-action-${item.id}`}
                    >
                      {item.action.label}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
