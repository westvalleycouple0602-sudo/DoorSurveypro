import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Home } from "lucide-react";
import { ErrorState } from "@/components/error-state";

export default function QuotePaymentSuccess() {
  const { quoteId } = useParams<{ quoteId: string }>();

  // Fetch updated payment status
  const { 
    data: paymentStatus, 
    isLoading,
    isError,
    error: errorObj,
    refetch
  } = useQuery<any>({
    queryKey: ["/api/quote-requests", quoteId, "payment-status"],
    enabled: !!quoteId,
    refetchInterval: (query) => query.state.data?.paymentStatus === "paid" ? false : 2000, // Poll until paid
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-payment-status">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Confirming payment status...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-2xl mx-auto">
          <ErrorState
            title="Failed to load payment status"
            message={errorObj instanceof Error ? errorObj.message : "Unable to confirm payment status"}
            error={errorObj as Error}
            onRetry={refetch}
            testId="error-payment-status"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8" data-testid="page-payment-success">
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
        {/* Success Header */}
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="text-center px-4 md:px-6 py-6 md:py-8">
            <div className="flex justify-center mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-600 dark:text-green-500" data-testid="icon-success" />
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl text-green-600 dark:text-green-500" data-testid="heading-success">
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              Thank you for your payment. Your quote has been processed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-6 md:pb-8">
            {/* Payment Details */}
            <div className="border rounded-lg p-3 md:p-4 space-y-2.5 md:space-y-3 bg-card">
              <h3 className="font-semibold mb-1.5 md:mb-2 text-sm md:text-base">Payment Details</h3>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold" data-testid="text-amount">
                  ${paymentStatus?.paymentAmount?.toFixed(2) || "0.00"}
                </span>
              </div>
              {paymentStatus?.paidAt && (
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">Paid On:</span>
                  <span className="text-right" data-testid="text-paid-date">
                    {new Date(paymentStatus.paidAt).toLocaleDateString()}<span className="hidden sm:inline"> at{' '}
                    {new Date(paymentStatus.paidAt).toLocaleTimeString()}</span>
                  </span>
                </div>
              )}
              {paymentStatus?.customerApprovalTier && (
                <div className="flex justify-between items-center text-sm md:text-base">
                  <span className="text-muted-foreground">Selected Tier:</span>
                  <Badge variant="default" className="capitalize" data-testid="badge-tier">
                    {paymentStatus.customerApprovalTier}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between items-center text-sm md:text-base">
                <span className="text-muted-foreground">Payment Status:</span>
                <Badge variant="default" className="bg-green-600" data-testid="badge-status">
                  {paymentStatus?.paymentStatus || "Processing"}
                </Badge>
              </div>
            </div>

            {/* Next Steps */}
            <div className="border rounded-lg p-3 md:p-4 space-y-1.5 md:space-y-2 bg-muted/50">
              <h3 className="font-semibold mb-1.5 md:mb-2 text-sm md:text-base">What's Next?</h3>
              <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-muted-foreground">
                <li>A confirmation email has been sent to your email address</li>
                <li>Your quote will be processed and fulfilled according to the selected tier</li>
                <li>You'll receive updates on the progress of your order</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2 md:gap-3 pt-3 md:pt-4">
              <Button asChild className="flex-1" data-testid="button-home">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
