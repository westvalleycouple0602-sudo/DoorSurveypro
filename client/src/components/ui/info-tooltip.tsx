import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string | React.ReactNode;
  icon?: "help" | "info";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  testId?: string;
}

export function InfoTooltip({
  content,
  icon = "help",
  side = "top",
  className,
  testId = "info-tooltip",
}: InfoTooltipProps) {
  const Icon = icon === "help" ? HelpCircle : Info;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn("inline-flex text-muted-foreground hover:text-foreground transition-colors", className)}
          data-testid={testId}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">More information</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} data-testid={`${testId}-content`}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
