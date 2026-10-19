import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DoorOpen, Compass, Rocket, ClipboardList,
  Camera, Shield, ArrowRight
} from "lucide-react";
import { TourTrackSelector } from "@/components/guided-tour";

const WELCOME_STORAGE_KEY = "doorsurvey-welcome-shown";

interface WelcomeDialogProps {
  onStartTour: (trackId?: string) => void;
  onOpenWizard: () => void;
}

export function useWelcomeDialog() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    try {
      const shown = localStorage.getItem(WELCOME_STORAGE_KEY);
      if (!shown) {
        const timer = setTimeout(() => setShouldShow(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
    }
  }, []);

  const dismiss = () => {
    setShouldShow(false);
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    } catch {
    }
  };

  return { shouldShow, dismiss };
}

export function WelcomeDialog({ onStartTour, onOpenWizard }: WelcomeDialogProps) {
  const { shouldShow, dismiss } = useWelcomeDialog();
  const [showTracks, setShowTracks] = useState(false);

  const handleStartTour = (trackId?: string) => {
    dismiss();
    onStartTour(trackId);
  };

  const handleOpenWizard = () => {
    dismiss();
    onOpenWizard();
  };

  const handleDismiss = () => {
    dismiss();
  };

  const highlights = [
    {
      icon: <DoorOpen className="h-4 w-4" />,
      label: "Door Surveys",
      description: "Capture measurements, photos, and hardware specs",
    },
    {
      icon: <Camera className="h-4 w-4" />,
      label: "Triple-Scan LiDAR",
      description: "3D scanning from both sides for full coverage",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Code Compliance",
      description: "Automated building code validation",
    },
    {
      icon: <ClipboardList className="h-4 w-4" />,
      label: "Smart Estimates",
      description: "Generate professional quotes in minutes",
    },
  ];

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-welcome">
        <DialogHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-primary/10">
              <Rocket className="h-8 w-8" />
            </div>
          </div>
          <DialogTitle className="text-xl" data-testid="text-welcome-title">
            Welcome to DoorSurvey Pro
          </DialogTitle>
          <DialogDescription className="text-sm">
            The all-in-one platform for commercial door surveying, estimation, and compliance.
            Let's get you set up.
          </DialogDescription>
        </DialogHeader>

        {!showTracks ? (
          <>
            <div className="grid grid-cols-2 gap-3 py-4">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/30"
                  data-testid={`highlight-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="shrink-0 mt-0.5 p-1.5 rounded-md bg-primary/10">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => setShowTracks(true)} className="w-full" data-testid="button-start-tour">
                <Compass className="h-4 w-4 mr-2" />
                Take the Guided Tour
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  4 tracks
                </Badge>
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenWizard}
                className="w-full"
                data-testid="button-start-wizard"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Open Setup Checklist
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="w-full text-muted-foreground"
                data-testid="button-skip-welcome"
              >
                I'll explore on my own
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="py-2">
              <p className="text-sm text-muted-foreground mb-3">
                Choose a tour based on your role. Each covers the features most relevant to your daily work.
              </p>
              <TourTrackSelector
                onSelect={(trackId) => handleStartTour(trackId)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTracks(false)}
              className="text-muted-foreground"
              data-testid="button-back-to-welcome"
            >
              Back
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
