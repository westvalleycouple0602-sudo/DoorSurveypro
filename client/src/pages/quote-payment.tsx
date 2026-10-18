import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuotePayment() {
  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-payments-unavailable">Online payments unavailable</CardTitle>
          <CardDescription>Online quote payments have been removed from this application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Contact your project administrator to arrange payment. Existing quote and payment records have been preserved.</p>
          <Button variant="outline" asChild><Link href="/projects">Back to projects</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
