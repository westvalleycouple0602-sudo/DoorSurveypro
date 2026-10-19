import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MeasurementValidation {
  isValid: boolean;
  confidence: number;
  anomalies: string[];
  suggestions: string[];
  correctedValues?: {
    width?: string;
    height?: string;
    thickness?: string;
  };
}

interface AIMeasurementValidatorProps {
  width: string;
  height: string;
  thickness?: string;
  doorType?: string;
  buildingType?: string;
  onApplyCorrections?: (corrections: { width?: string; height?: string; thickness?: string }) => void;
}

export function AIMeasurementValidator({
  width,
  height,
  thickness,
  doorType,
  buildingType,
  onApplyCorrections,
}: AIMeasurementValidatorProps) {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<MeasurementValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateMeasurements = async () => {
    if (!width || !height) {
      setError("Width and height are required for validation");
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/ai/validate-measurements", {
        width,
        height,
        thickness,
        doorType,
        buildingType,
      });

      setResult(await response.json());
    } catch (err) {
      setError("Failed to validate measurements. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleApplyCorrections = () => {
    if (result?.correctedValues && onApplyCorrections) {
      onApplyCorrections(result.correctedValues);
    }
  };

  if (!result && !error) {
    return (
      <Button
        onClick={validateMeasurements}
        disabled={validating || !width || !height}
        variant="outline"
        size="sm"
        data-testid="button-ai-validate"
      >
        {validating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Validate
          </>
        )}
      </Button>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Validation Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-3">
      {/* Validation Status */}
      <Alert variant={result.isValid ? "default" : "destructive"}>
        {result.isValid ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle className="flex items-center justify-between">
          <span>
            {result.isValid ? "Measurements Look Good" : "Potential Issues Detected"}
          </span>
          <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
            {Math.round(result.confidence * 100)}% Confidence
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          {/* Anomalies */}
          {result.anomalies && result.anomalies.length > 0 && (
            <div>
              <h5 className="font-semibold text-sm mb-1">Issues Found:</h5>
              <ul className="space-y-1">
                {result.anomalies.map((anomaly, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <span className="mr-2">•</span>
                    <span>{anomaly}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div>
              <h5 className="font-semibold text-sm mb-1 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                AI Suggestions:
              </h5>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Corrected Values */}
          {result.correctedValues && Object.keys(result.correctedValues).length > 0 && (
            <div>
              <h5 className="font-semibold text-sm mb-1">Suggested Corrections:</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.correctedValues.width && (
                  <div>
                    <span className="text-muted-foreground">Width:</span>
                    <span className="ml-2 font-medium">{result.correctedValues.width}</span>
                  </div>
                )}
                {result.correctedValues.height && (
                  <div>
                    <span className="text-muted-foreground">Height:</span>
                    <span className="ml-2 font-medium">{result.correctedValues.height}</span>
                  </div>
                )}
                {result.correctedValues.thickness && (
                  <div>
                    <span className="text-muted-foreground">Thickness:</span>
                    <span className="ml-2 font-medium">{result.correctedValues.thickness}</span>
                  </div>
                )}
              </div>
              {onApplyCorrections && (
                <Button
                  onClick={handleApplyCorrections}
                  size="sm"
                  className="mt-2"
                  data-testid="button-apply-corrections"
                >
                  Apply Corrections
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
