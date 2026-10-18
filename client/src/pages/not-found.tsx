import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 md:pt-8 px-4 md:px-6 pb-6 md:pb-8">
          <div className="flex mb-3 md:mb-4 gap-2 md:gap-3 items-start">
            <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-500 flex-shrink-0 mt-0.5" />
            <h1 className="text-xl md:text-2xl font-bold">404 Page Not Found</h1>
          </div>

          <p className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
