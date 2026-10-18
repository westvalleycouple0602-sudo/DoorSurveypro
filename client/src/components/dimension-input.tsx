import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ruler } from "lucide-react";
import { useState } from "react";

interface DimensionInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
  unit?: string;
  showCommonSizes?: boolean;
  commonSizes?: string[];
}

export function DimensionInput({
  value,
  onChange,
  placeholder,
  testId,
  unit = "inches",
  showCommonSizes = false,
  commonSizes = [],
}: DimensionInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleQuickFill = (size: string) => {
    onChange(size);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          data-testid={testId}
          className="pr-16 font-mono"
        />
        <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Ruler className="h-3 w-3" />
            <span>{unit}</span>
          </div>
        </div>
      </div>
      
      {showCommonSizes && commonSizes.length > 0 && (isFocused || !value) && (
        <div className="flex flex-wrap gap-1.5">
          {commonSizes.map((size) => (
            <Badge
              key={size}
              variant="outline"
              className="cursor-pointer hover-elevate text-xs font-mono"
              onClick={() => handleQuickFill(size)}
            >
              {size}"
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
