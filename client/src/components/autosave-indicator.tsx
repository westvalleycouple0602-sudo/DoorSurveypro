import { useEffect, useState, useRef } from "react";
import { Cloud, CloudOff, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutosaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  className?: string;
  testId?: string;
}

export function AutosaveIndicator({ status, lastSaved, className, testId = "autosave-status" }: AutosaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status === "saved") {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getStatusInfo = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: "Saving...",
          color: "text-blue-600"
        };
      case "saved":
        return {
          icon: <Check className="w-3 h-3" />,
          text: lastSaved ? `Saved ${formatTimeSince(lastSaved)}` : "Saved",
          color: "text-green-600"
        };
      case "error":
        return {
          icon: <CloudOff className="w-3 h-3" />,
          text: "Save failed",
          color: "text-red-600"
        };
      default:
        return {
          icon: <Cloud className="w-3 h-3" />,
          text: "All changes saved",
          color: "text-muted-foreground"
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={cn("flex items-center gap-2 text-xs", statusInfo.color, className)} data-testid={testId}>
      {statusInfo.icon}
      <span className="transition-opacity duration-200">
        {statusInfo.text}
      </span>
    </div>
  );
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

// Hook for autosave functionality
export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay: number = 2000
): [SaveStatus, Date | undefined] {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const saveInProgressRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const dataRef = useRef(data);

  // Update data ref whenever data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Debounced save function
  useEffect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const id = setTimeout(async () => {
      // If a save is in progress, mark that another save is pending
      if (saveInProgressRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      // Start the save loop - continue until no more pending saves
      saveInProgressRef.current = true;
      setStatus("saving");

      try {
        // Keep saving while there are pending changes
        do {
          pendingSaveRef.current = false;
          
          try {
            await saveFn(dataRef.current);
            setStatus("saved");
            setLastSaved(new Date());
          } catch (error) {
            setStatus("error");
            break; // Stop the loop on error
          }

          // If pendingSaveRef was set to true during the save, loop again
        } while (pendingSaveRef.current);

      } finally {
        saveInProgressRef.current = false;
      }
    }, delay);

    setTimeoutId(id);

    return () => {
      if (id) clearTimeout(id);
    };
  }, [data, delay, saveFn]);

  return [status, lastSaved];
}
