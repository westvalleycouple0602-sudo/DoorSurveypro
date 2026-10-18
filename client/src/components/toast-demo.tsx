import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  toastSuccess, 
  toastError, 
  toastWarning, 
  toastInfo, 
  toastLoading,
  toastPromise 
} from "@/lib/toast-utils";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2, Sparkles } from "lucide-react";

export function ToastDemo() {
  const simulateAsyncOperation = () => {
    return new Promise<{ message: string }>((resolve, reject) => {
      const success = Math.random() > 0.3;
      setTimeout(() => {
        if (success) {
          resolve({ message: "Operation completed successfully!" });
        } else {
          reject(new Error("Operation failed due to network error"));
        }
      }, 2000);
    });
  };

  const handlePromiseToast = async () => {
    try {
      await toastPromise(simulateAsyncOperation(), {
        loading: "Processing your request...",
        success: (data) => data.message,
        error: (error) => `Failed: ${error.message}`,
      });
    } catch (error) {
      // Error is already handled by toastPromise
    }
  };

  const handleLoadingToast = () => {
    const toast = toastLoading({
      title: "Uploading files...",
      description: "Please wait while we process your files",
    });

    setTimeout(() => {
      toast.dismiss();
      toastSuccess({
        title: "Upload complete",
        description: "All files have been successfully uploaded",
      });
    }, 3000);
  };

  const showMultipleToasts = () => {
    toastInfo({ title: "Starting batch process..." });
    setTimeout(() => {
      toastSuccess({ title: "Step 1 complete", description: "Data validated" });
    }, 500);
    setTimeout(() => {
      toastSuccess({ title: "Step 2 complete", description: "Files processed" });
    }, 1000);
    setTimeout(() => {
      toastSuccess({ title: "All steps complete!", description: "Batch process finished" });
    }, 1500);
  };

  return (
    <Card data-testid="card-toast-demo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Enhanced Toast Notifications
        </CardTitle>
        <CardDescription>
          Demonstration of Phase 2 toast notification enhancements with icons, variants, and smart queueing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => toastSuccess({
              title: "Success!",
              description: "Your changes have been saved successfully",
            })}
            variant="outline"
            className="justify-start"
            data-testid="button-toast-success"
          >
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            Success Toast
          </Button>

          <Button
            onClick={() => toastError({
              title: "Error occurred",
              description: "Failed to connect to the server. Please try again.",
            })}
            variant="outline"
            className="justify-start"
            data-testid="button-toast-error"
          >
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            Error Toast
          </Button>

          <Button
            onClick={() => toastWarning({
              title: "Warning",
              description: "You have unsaved changes that will be lost",
            })}
            variant="outline"
            className="justify-start"
            data-testid="button-toast-warning"
          >
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
            Warning Toast
          </Button>

          <Button
            onClick={() => toastInfo({
              title: "Helpful tip",
              description: "Press Ctrl+K to open the command palette",
            })}
            variant="outline"
            className="justify-start"
            data-testid="button-toast-info"
          >
            <Info className="h-4 w-4 mr-2 text-blue-600" />
            Info Toast
          </Button>

          <Button
            onClick={handleLoadingToast}
            variant="outline"
            className="justify-start"
            data-testid="button-toast-loading"
          >
            <Loader2 className="h-4 w-4 mr-2 text-blue-600" />
            Loading Toast
          </Button>

          <Button
            onClick={handlePromiseToast}
            variant="outline"
            className="justify-start"
            data-testid="button-toast-promise"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Promise Toast (Auto)
          </Button>

          <Button
            onClick={showMultipleToasts}
            variant="outline"
            className="justify-start col-span-full"
            data-testid="button-toast-multiple"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Multiple Toasts (Queue Demo)
          </Button>
        </div>

        <div className="p-4 rounded-md bg-muted/50 space-y-2 text-sm">
          <p className="font-semibold">Phase 2 Enhancements:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>5 toast variants with contextual icons (success, error, warning, info, loading)</li>
            <li>Smart queue management (up to 3 toasts at once)</li>
            <li>Auto-dismiss with configurable durations</li>
            <li>Promise-based toasts for async operations</li>
            <li>Loading toasts with manual dismiss</li>
            <li>Dark mode support with semantic colors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
