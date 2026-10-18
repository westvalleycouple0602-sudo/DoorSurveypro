import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Palette,
  Layers,
  AlertCircle,
  Download,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface QuoteLineItem {
  id: string;
  category?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isRequired: boolean;
  isOptional: boolean;
  notes?: string;
  sortOrder?: number;
}

interface QuoteOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  priceAdjustment?: number;
  priceAdjustmentType?: "fixed" | "percentage";
  imageUrl?: string;
  swatchColor?: string;
  isDefault: boolean;
  sortOrder?: number;
}

interface QuoteOptionGroup {
  id: string;
  name: string;
  description?: string;
  category?: string;
  selectionType: "single" | "multi";
  isRequired: boolean;
  helpText?: string;
  sortOrder?: number;
  options: QuoteOption[];
}

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  version: number;
  status: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  currency: string;
  expiresAt?: string;
  validDays?: number;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  introduction?: string;
  notes?: string;
  termsAndConditions?: string;
  sentAt?: string;
  lineItems: QuoteLineItem[];
  optionGroups: QuoteOptionGroup[];
  customerSelections?: Array<{
    optionGroupId: string;
    optionId: string;
  }>;
  calculatedTotals?: {
    subtotal: number;
    optionsTotal: number;
    tax: number;
    total: number;
  };
  approvalStatus?: {
    decision: string;
    signedAt: string;
    method: string;
    comments?: string;
  };
  organization?: {
    name: string;
    logoUrl?: string;
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  sent: { label: "Sent", variant: "secondary", icon: Clock },
  viewed: { label: "Viewed", variant: "default", icon: FileText },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Declined", variant: "destructive", icon: XCircle },
  expired: { label: "Expired", variant: "outline", icon: AlertCircle },
};

function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selections, setSelections] = useState<Map<string, Set<string>>>(new Map());
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "decline">("approve");
  const [customerNotes, setCustomerNotes] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: quote, isLoading, error, isError } = useQuery<QuoteDetail>({
    queryKey: [`/api/portal/quotes/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (quote?.customerSelections) {
      const newSelections = new Map<string, Set<string>>();
      quote.customerSelections.forEach(sel => {
        if (!newSelections.has(sel.optionGroupId)) {
          newSelections.set(sel.optionGroupId, new Set());
        }
        newSelections.get(sel.optionGroupId)?.add(sel.optionId);
      });
      setSelections(newSelections);
    } else if (quote?.optionGroups) {
      const defaultSelections = new Map<string, Set<string>>();
      quote.optionGroups.forEach(group => {
        const defaultOption = group.options.find(o => o.isDefault);
        if (defaultOption) {
          defaultSelections.set(group.id, new Set([defaultOption.id]));
        }
      });
      setSelections(defaultSelections);
    }
  }, [quote?.customerSelections, quote?.optionGroups]);

  const saveSelectionsMutation = useMutation({
    mutationFn: async (newSelections: Array<{ optionGroupId: string; optionId: string }>) => {
      return apiRequest("POST", `/api/portal/quotes/${id}/selections`, { selections: newSelections });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/portal/quotes/${id}`] });
      toast({
        title: "Selections saved",
        description: "Your choices have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save selections",
        variant: "destructive",
      });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (data: { action: "approve" | "decline"; customerNotes?: string; purchaseOrderNumber?: string }) => {
      return apiRequest("POST", `/api/portal/quotes/${id}/approval`, data);
    },
    onSuccess: (_, variables) => {
      setShowApprovalDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/portal/quotes/${id}`] });
      toast({
        title: variables.action === "approve" ? "Quote Approved" : "Quote Declined",
        description: variables.action === "approve" 
          ? "Thank you for approving this quote. You will receive a confirmation shortly."
          : "The quote has been declined. The team will follow up with you.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Failed to process your request",
        variant: "destructive",
      });
    },
  });

  const handleOptionChange = (groupId: string, optionId: string, group: QuoteOptionGroup) => {
    setHasUnsavedChanges(true);
    setSelections(prev => {
      const newSelections = new Map(prev);
      
      if (group.selectionType === "single") {
        newSelections.set(groupId, new Set([optionId]));
      } else {
        const current = newSelections.get(groupId) || new Set();
        const newSet = new Set(current);
        if (newSet.has(optionId)) {
          newSet.delete(optionId);
        } else {
          newSet.add(optionId);
        }
        newSelections.set(groupId, newSet);
      }
      
      return newSelections;
    });
  };

  const handleSaveSelections = () => {
    const selectionsArray: Array<{ optionGroupId: string; optionId: string }> = [];
    selections.forEach((optionIds, groupId) => {
      optionIds.forEach(optionId => {
        selectionsArray.push({ optionGroupId: groupId, optionId });
      });
    });
    saveSelectionsMutation.mutate(selectionsArray);
  };

  const handleApproval = () => {
    if (hasUnsavedChanges) {
      handleSaveSelections();
    }
    approvalMutation.mutate({
      action: approvalAction,
      customerNotes: customerNotes || undefined,
      purchaseOrderNumber: purchaseOrderNumber || undefined,
    });
  };

  const calculatedTotal = useMemo(() => {
    if (!quote) return { subtotal: 0, optionsTotal: 0, tax: 0, total: 0 };

    let subtotal = quote.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    let optionsTotal = 0;

    quote.optionGroups?.forEach(group => {
      const selectedOptionIds = selections.get(group.id);
      if (selectedOptionIds) {
        group.options.forEach(option => {
          if (selectedOptionIds.has(option.id) && option.priceAdjustment) {
            if (option.priceAdjustmentType === "percentage") {
              optionsTotal += Math.round(subtotal * (option.priceAdjustment / 10000));
            } else {
              optionsTotal += option.priceAdjustment;
            }
          }
        });
      }
    });

    const beforeTax = subtotal + optionsTotal;
    const taxRate = quote.taxRate || 0;
    const tax = Math.round(beforeTax * (taxRate / 10000));
    const total = beforeTax + tax;

    return { subtotal, optionsTotal, tax, total };
  }, [quote, selections]);

  const isExpired = quote?.expiresAt && new Date(quote.expiresAt) < new Date();
  const canApprove = quote?.status !== "approved" && quote?.status !== "rejected" && !isExpired;

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  if (error || !quote) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This quote may have been removed or you don't have access to view it.
            </p>
            <Button variant="outline" onClick={() => setLocation("/client-portal")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[quote.status] || statusConfig.sent;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            aria-label="Go back"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-quote-number">
              Quote #{quote.quoteNumber}
            </h1>
            <p className="text-muted-foreground">
              Version {quote.version} • {quote.organization?.name}
            </p>
          </div>
        </div>
        <Badge variant={statusInfo.variant} className="gap-1.5">
          <StatusIcon className="h-3.5 w-3.5" />
          {statusInfo.label}
        </Badge>
      </div>

      {isExpired && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">This quote has expired</p>
              <p className="text-sm text-muted-foreground">
                Please contact us for an updated quote.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {quote.approvalStatus && (
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            {quote.approvalStatus.decision === "approved" ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="font-medium">
                {quote.approvalStatus.decision === "approved" ? "Quote Approved" : "Quote Declined"}
              </p>
              <p className="text-sm text-muted-foreground">
                {quote.approvalStatus.signedAt &&
                  format(new Date(quote.approvalStatus.signedAt), "MMMM d, yyyy 'at' h:mm a")}
                {quote.approvalStatus.method && ` via ${quote.approvalStatus.method}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {quote.introduction && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="whitespace-pre-wrap" data-testid="text-introduction">{quote.introduction}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quote.lineItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start justify-between py-3 border-b last:border-0"
                data-testid={`line-item-${index}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.category && (
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                    <span className="font-medium">{item.description}</span>
                    {item.isOptional && (
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium">{formatCurrency(item.totalPrice, quote.currency)}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unitPrice, quote.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {quote.optionGroups && quote.optionGroups.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Customize Your Order
            </CardTitle>
            <CardDescription>
              Select your preferred options below. Prices will update automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {quote.optionGroups
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                .map((group, groupIndex) => (
                  <div key={group.id} className="space-y-3" data-testid={`option-group-${groupIndex}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{group.name}</h3>
                        {group.isRequired && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </div>

                    {group.selectionType === "single" ? (
                      <RadioGroup
                        value={Array.from(selections.get(group.id) || [])[0] || ""}
                        onValueChange={(value) => handleOptionChange(group.id, value, group)}
                        disabled={!canApprove}
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.options
                            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                            .map((option) => (
                              <Label
                                key={option.id}
                                htmlFor={option.id}
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selections.get(group.id)?.has(option.id)
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-muted-foreground/50"
                                } ${!canApprove ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <RadioGroupItem
                                  value={option.id}
                                  id={option.id}
                                  data-testid={`radio-${option.value}`}
                                />
                                {option.swatchColor && (
                                  <div
                                    className="w-8 h-8 rounded border"
                                    style={{ backgroundColor: option.swatchColor }}
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{option.label}</div>
                                  {option.description && (
                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                  )}
                                </div>
                                {option.priceAdjustment !== undefined && option.priceAdjustment !== 0 && (
                                  <div className="text-sm font-medium text-right">
                                    {option.priceAdjustment > 0 ? "+" : ""}
                                    {option.priceAdjustmentType === "percentage"
                                      ? `${(option.priceAdjustment / 100).toFixed(1)}%`
                                      : formatCurrency(option.priceAdjustment, quote.currency)}
                                  </div>
                                )}
                              </Label>
                            ))}
                        </div>
                      </RadioGroup>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.options
                          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                          .map((option) => (
                            <Label
                              key={option.id}
                              htmlFor={`check-${option.id}`}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                selections.get(group.id)?.has(option.id)
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-muted-foreground/50"
                              } ${!canApprove ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <Checkbox
                                id={`check-${option.id}`}
                                checked={selections.get(group.id)?.has(option.id) || false}
                                onCheckedChange={() => handleOptionChange(group.id, option.id, group)}
                                disabled={!canApprove}
                                data-testid={`checkbox-${option.value}`}
                              />
                              {option.swatchColor && (
                                <div
                                  className="w-8 h-8 rounded border"
                                  style={{ backgroundColor: option.swatchColor }}
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">{option.label}</div>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground">{option.description}</p>
                                )}
                              </div>
                              {option.priceAdjustment !== undefined && option.priceAdjustment !== 0 && (
                                <div className="text-sm font-medium text-right">
                                  {option.priceAdjustment > 0 ? "+" : ""}
                                  {option.priceAdjustmentType === "percentage"
                                    ? `${(option.priceAdjustment / 100).toFixed(1)}%`
                                    : formatCurrency(option.priceAdjustment, quote.currency)}
                                </div>
                              )}
                            </Label>
                          ))}
                      </div>
                    )}

                    {group.helpText && (
                      <p className="text-sm text-muted-foreground italic">{group.helpText}</p>
                    )}
                  </div>
                ))}
            </div>

            {hasUnsavedChanges && canApprove && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSaveSelections}
                  disabled={saveSelectionsMutation.isPending}
                  data-testid="button-save-selections"
                >
                  {saveSelectionsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save Selections
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Quote Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(calculatedTotal.subtotal, quote.currency)}</span>
            </div>
            {calculatedTotal.optionsTotal !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Options</span>
                <span>
                  {calculatedTotal.optionsTotal > 0 ? "+" : ""}
                  {formatCurrency(calculatedTotal.optionsTotal, quote.currency)}
                </span>
              </div>
            )}
            {quote.taxRate && quote.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(quote.taxRate / 100).toFixed(2)}%)
                </span>
                <span>{formatCurrency(calculatedTotal.tax, quote.currency)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span data-testid="text-total">{formatCurrency(calculatedTotal.total, quote.currency)}</span>
            </div>
          </div>

          {quote.expiresAt && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Valid until {format(new Date(quote.expiresAt), "MMMM d, yyyy")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {quote.termsAndConditions && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {quote.termsAndConditions}
              </p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {canApprove && (
        <Card className="sticky bottom-4 bg-card/95 backdrop-blur shadow-lg">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">Ready to proceed?</p>
              <p className="text-sm text-muted-foreground">
                Review your selections above, then approve or decline this quote.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovalAction("decline");
                  setShowApprovalDialog(true);
                }}
                data-testid="button-decline"
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={() => {
                  setApprovalAction("approve");
                  setShowApprovalDialog(true);
                }}
                data-testid="button-approve"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve Quote" : "Decline Quote"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "By approving this quote, you authorize the work to proceed. You will receive a confirmation email."
                : "Please let us know why you're declining this quote so we can better assist you."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {approvalAction === "approve" && (
              <div className="space-y-2">
                <Label htmlFor="po-number">Purchase Order Number (optional)</Label>
                <Input
                  id="po-number"
                  placeholder="PO-12345"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  data-testid="input-po-number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                {approvalAction === "approve" ? "Additional Notes (optional)" : "Reason for Declining"}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  approvalAction === "approve"
                    ? "Any special instructions or notes..."
                    : "Please share why this quote doesn't meet your needs..."
                }
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
                data-testid="input-notes"
              />
            </div>

            {approvalAction === "approve" && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Total Amount</span>
                  <span className="font-bold">{formatCurrency(calculatedTotal.total, quote.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This amount includes your selected options and applicable taxes.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              data-testid="button-cancel-dialog"
            >
              Cancel
            </Button>
            <Button
              variant={approvalAction === "approve" ? "default" : "destructive"}
              onClick={handleApproval}
              disabled={approvalMutation.isPending}
              data-testid="button-confirm-action"
            >
              {approvalMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : approvalAction === "approve" ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {approvalAction === "approve" ? "Approve Quote" : "Decline Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
