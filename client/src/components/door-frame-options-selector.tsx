import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OptionValue = {
  id: number;
  value: string;
  code: string;
  description: string;
  compatibility?: string;
  standards?: string;
  cost_impact?: string;
  lead_time_impact?: string;
  default: boolean;
  notes?: string;
};

type HierarchicalOptions = {
  [appliesTo: string]: {
    [market: string]: {
      [attributeGroup: string]: {
        [attributeName: string]: OptionValue[];
      };
    };
  };
};

interface DoorFrameOptionsSelectorProps {
  appliesTo: "door" | "frame";
  market?: "commercial" | "residential" | "both";
  attributeGroup: string;
  attributeName: string;
  value?: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  required?: boolean;
  testId?: string;
}

export function DoorFrameOptionsSelector({
  appliesTo,
  market = "commercial",
  attributeGroup,
  attributeName,
  value,
  onChange,
  label,
  description,
  required,
  testId,
}: DoorFrameOptionsSelectorProps) {
  const [selectedOption, setSelectedOption] = useState<OptionValue | null>(null);

  const { data: hierarchicalOptions, isLoading } = useQuery<HierarchicalOptions>({
    queryKey: [`/api/door-frame-options/hierarchical?applies_to=${appliesTo}`],
  });

  // Find options for this field from hierarchical data
  const findOptions = (): OptionValue[] => {
    if (!hierarchicalOptions) return [];
    
    const appliesToData = hierarchicalOptions[appliesTo];
    if (!appliesToData) return [];

    // Check "both" market first, then specific market
    const marketData = appliesToData[market] || appliesToData["both"] || {};
    const groupData = marketData[attributeGroup];
    if (!groupData) return [];

    return groupData[attributeName] || [];
  };

  const options = findOptions();

  // Find default option
  const defaultOption = options.find(opt => opt.default);

  // Sync default option to form state when field is empty
  useEffect(() => {
    if (!value && defaultOption && !isLoading) {
      onChange(defaultOption.code);
    }
  }, [defaultOption, value, onChange, isLoading]);

  const handleValueChange = (newValue: string) => {
    const option = options.find(opt => opt.code === newValue);
    setSelectedOption(option || null);
    onChange(newValue);
  };

  if (isLoading) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Select disabled>
            <SelectTrigger data-testid={testId}>
              <SelectValue placeholder="Loading..." />
            </SelectTrigger>
          </Select>
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    );
  }

  if (options.length === 0) {
    return null;
  }

  const currentOption = options.find(opt => opt.code === value) || selectedOption;

  return (
    <FormItem>
      <div className="flex items-center gap-2">
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
        {currentOption && (currentOption.compatibility || currentOption.standards) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                {currentOption.compatibility && (
                  <div>
                    <p className="font-medium text-xs">Compatibility</p>
                    <p className="text-xs text-muted-foreground">{currentOption.compatibility}</p>
                  </div>
                )}
                {currentOption.standards && (
                  <div>
                    <p className="font-medium text-xs">Standards/Codes</p>
                    <p className="text-xs text-muted-foreground">{currentOption.standards}</p>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <FormControl>
        <Select onValueChange={handleValueChange} value={value || (defaultOption?.code)} defaultValue={value || (defaultOption?.code)}>
          <SelectTrigger data-testid={testId}>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.code}>
                <div className="flex items-center gap-2">
                  <span>{option.value}</span>
                  {option.default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      {currentOption && (currentOption.cost_impact || currentOption.lead_time_impact) && (
        <div className="flex gap-2 mt-1">
          {currentOption.cost_impact && (
            <Badge variant="outline" className="text-xs">
              Cost: {currentOption.cost_impact}
            </Badge>
          )}
          {currentOption.lead_time_impact && (
            <Badge variant="outline" className="text-xs">
              Lead Time: {currentOption.lead_time_impact}
            </Badge>
          )}
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}
