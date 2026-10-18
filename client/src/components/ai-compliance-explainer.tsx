import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, DollarSign, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ComplianceExplanation {
  violation: string;
  explanation: string;
  impact: string;
  solutions: string[];
  estimatedCost?: string;
  urgency: "critical" | "high" | "medium" | "low";
}

interface AIComplianceExplainerProps {
  violation: {
    ruleCode: string;
    description: string;
    severity: string;
  };
  doorSpecs: {
    width?: string;
    height?: string;
    doorType?: string;
    buildingType?: string;
  };
}

const urgencyColors = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

export function AIComplianceExplainer({ violation, doorSpecs }: AIComplianceExplainerProps) {
  const [explaining, setExplaining] = useState(false);
  const [result, setResult] = useState<ComplianceExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const explainViolation = async () => {
    setExplaining(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/ai/explain-compliance", {
        violation,
        doorSpecs,
      });

      setResult(response);
      setIsExpanded(true);
    } catch (err) {
      setError("Failed to explain compliance violation. Please try again.");
    } finally {
      setExplaining(false);
    }
  };

  if (!result && !isExpanded) {
    return (
      <Button
        onClick={explainViolation}
        disabled={explaining}
        variant="outline"
        size="sm"
        data-testid="button-ai-explain"
      >
        {explaining ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Explain
          </>
        )}
      </Button>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive text-sm">
            <AlertCircle className="mr-2 h-4 w-4" />
            Explanation Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const urgency = result.urgency || "medium";
  const urgencyLabel = urgency.toUpperCase();

  return (
    <Card className="mt-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            AI Compliance Analysis
          </CardTitle>
          <Badge variant={urgencyColors[urgency]}>
            {urgencyLabel} Priority
          </Badge>
        </div>
        <CardDescription>Expert analysis and recommended solutions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explanation */}
        <div>
          <h5 className="font-semibold text-sm mb-2">Why This Matters:</h5>
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        </div>

        {/* Impact */}
        <div>
          <h5 className="font-semibold text-sm mb-2 flex items-center">
            <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
            Real-World Impact:
          </h5>
          <p className="text-sm text-muted-foreground">{result.impact}</p>
        </div>

        {/* Solutions */}
        {result.solutions && result.solutions.length > 0 && (
          <div>
            <h5 className="font-semibold text-sm mb-2">Recommended Solutions:</h5>
            <ol className="space-y-2">
              {result.solutions.map((solution, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start">
                  <span className="font-semibold mr-2">{index + 1}.</span>
                  <span>{solution}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Cost Estimate */}
        {result.estimatedCost && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <DollarSign className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <h5 className="font-semibold text-sm">Estimated Cost:</h5>
              <p className="text-sm text-muted-foreground">{result.estimatedCost}</p>
            </div>
          </div>
        )}

        {/* Urgency Timeline */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
          <Clock className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <h5 className="font-semibold text-sm">Action Timeline:</h5>
            <p className="text-sm text-muted-foreground">
              {urgency === "critical" && "Immediate action required - safety/legal compliance issue"}
              {urgency === "high" && "Address within 30 days - important compliance requirement"}
              {urgency === "medium" && "Address within 3-6 months - moderate priority"}
              {urgency === "low" && "Address during next maintenance cycle - low priority"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
