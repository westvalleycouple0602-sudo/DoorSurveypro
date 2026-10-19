import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, CheckCircle2, AlertCircle, Sparkles, 
  Accessibility, Zap, Eye
} from "lucide-react";
import { FormLoadingOverlay } from "@/components/ui/form-loading-overlay";
import { InlineError } from "@/components/ui/inline-error";
import { SuccessMessage } from "@/components/ui/success-message";
import { 
  StatsCardSkeleton, 
  FormSkeleton, 
  ListItemSkeleton,
  CardSkeleton,
  PageHeaderSkeleton,
  TableSkeleton 
} from "@/components/ui/skeletons";
import { EnhancedErrorBoundary } from "@/components/enhanced-error-boundary";

export function Phase3Demo() {
  const [formLoading, setFormLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [skeletonLoading, setSkeletonLoading] = useState(false);
  const [formValue, setFormValue] = useState("");

  const simulateFormSubmit = () => {
    setFormLoading(true);
    setShowError(false);
    setShowSuccess(false);
    
    setTimeout(() => {
      setFormLoading(false);
      if (formValue === "error") {
        setShowError(true);
      } else {
        setShowSuccess(true);
      }
    }, 2000);
  };

  const toggleSkeletons = () => {
    setSkeletonLoading(true);
    setTimeout(() => {
      setSkeletonLoading(false);
    }, 3000);
  };

  return (
    <div className="space-y-6" data-testid="phase3-demo">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-chart-1/5 border border-primary/20">
        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phase 3: Progressive Loading & Accessibility</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enhanced UX with polished loading states, better error handling, and improved accessibility features
          </p>
        </div>
      </div>

      <Tabs defaultValue="skeletons" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="skeletons" data-testid="tab-skeletons">
            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
            Skeletons
          </TabsTrigger>
          <TabsTrigger value="forms" data-testid="tab-forms">
            <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">
            <AlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="a11y" data-testid="tab-accessibility">
            <Accessibility className="h-4 w-4 mr-2" aria-hidden="true" />
            Accessibility
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skeletons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loading States</CardTitle>
              <CardDescription>
                Content-aware loading skeletons that match the actual UI structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Available Skeleton Components</h3>
                  <Button 
                    onClick={toggleSkeletons}
                    variant="outline"
                    size="sm"
                    data-testid="button-toggle-skeletons"
                  >
                    {skeletonLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        Loading...
                      </>
                    ) : (
                      "Preview Loading States"
                    )}
                  </Button>
                </div>

                {!skeletonLoading ? (
                  <div className="space-y-6">
                    <div>
                      <Badge variant="secondary" className="mb-3">Stats Cards</Badge>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Badge variant="secondary" className="mb-3">Form Fields</Badge>
                      <FormSkeleton fields={3} />
                    </div>

                    <Separator />

                    <div>
                      <Badge variant="secondary" className="mb-3">List Items</Badge>
                      <div className="space-y-3">
                        <ListItemSkeleton />
                        <ListItemSkeleton />
                        <ListItemSkeleton />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Badge variant="secondary" className="mb-3">Content Cards</Badge>
                      <div className="grid gap-4 md:grid-cols-3">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Badge variant="secondary" className="mb-3">Page Header</Badge>
                      <PageHeaderSkeleton />
                    </div>

                    <Separator />

                    <div>
                      <Badge variant="secondary" className="mb-3">Data Table</Badge>
                      <TableSkeleton rows={3} columns={4} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <Badge variant="secondary" className="mb-3">Loading Stats...</Badge>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                      </div>
                    </div>

                    <div>
                      <Badge variant="secondary" className="mb-3">Loading Form...</Badge>
                      <FormSkeleton fields={3} />
                    </div>

                    <div>
                      <Badge variant="secondary" className="mb-3">Loading Table...</Badge>
                      <TableSkeleton rows={5} columns={4} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Form States</CardTitle>
              <CardDescription>
                Form loading overlays with inline validation and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <FormLoadingOverlay isLoading={formLoading} message="Processing your request..." />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="demo-input">Test Input</Label>
                    <Input
                      id="demo-input"
                      placeholder='Type "error" to see error state'
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      disabled={formLoading}
                      data-testid="input-phase3-demo"
                      aria-describedby="demo-input-help"
                    />
                    <p id="demo-input-help" className="text-xs text-muted-foreground">
                      Try typing "error" to see inline error feedback
                    </p>
                  </div>

                  {showError && (
                    <InlineError message="Failed to process request. Please check your input and try again." />
                  )}

                  {showSuccess && (
                    <SuccessMessage message="Form submitted successfully! Your changes have been saved." />
                  )}

                  <Button
                    onClick={simulateFormSubmit}
                    disabled={formLoading}
                    data-testid="button-submit-demo-form"
                    aria-busy={formLoading}
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                        Submit Form
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Loading overlay prevents interaction during form submission</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Inline error messages with contextual feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Success confirmation with clear messaging</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>ARIA attributes for screen reader support</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Error Boundaries</CardTitle>
              <CardDescription>
                Graceful error handling with contextual recovery actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Multiple recovery options: Try Again, Reload, Go Home</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Link to bug report for detailed issue submission</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Automatic error reporting to Sentry and backend</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Development mode stack trace viewing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Custom fallback UI support</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  The EnhancedErrorBoundary is automatically used throughout the application to catch React errors and provide a user-friendly recovery experience.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="a11y" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Enhancements</CardTitle>
              <CardDescription>
                ARIA labels, focus management, and keyboard navigation improvements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Implemented Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong>Focus Trap Hook:</strong> Keeps keyboard focus within modals and dialogs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong>Live Region Announcements:</strong> Screen reader feedback for dynamic updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong>ARIA Labels:</strong> Proper labeling for all interactive elements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong>Loading States:</strong> role="status" and aria-busy for async operations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong>Error Alerts:</strong> role="alert" and aria-live="assertive" for errors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong>Keyboard Navigation:</strong> Enhanced with Phase 1's keyboard shortcuts (g+d, g+p, etc.)</span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Usage Examples</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs font-mono text-muted-foreground mb-2">useFocusTrap Hook</p>
                    <pre className="text-xs overflow-auto">
{`const containerRef = useRef<HTMLDivElement>(null);
useFocusTrap(containerRef, isModalOpen);`}
                    </pre>
                  </div>

                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs font-mono text-muted-foreground mb-2">useAnnouncement Hook</p>
                    <pre className="text-xs overflow-auto">
{`const { announce } = useAnnouncement();
announce("Project saved successfully", "polite");`}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
