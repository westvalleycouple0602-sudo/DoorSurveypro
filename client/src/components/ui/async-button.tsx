import { ButtonHTMLAttributes, forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AsyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/**
 * Button component with built-in loading state management
 * Automatically disables and shows spinner when isLoading is true
 */
export const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(
  ({ 
    children, 
    isLoading = false, 
    loadingText, 
    disabled, 
    className,
    variant = "default",
    size = "default",
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={isLoading || disabled}
        variant={variant}
        size={size}
        className={cn(className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? (loadingText || children) : children}
      </Button>
    );
  }
);

AsyncButton.displayName = "AsyncButton";
