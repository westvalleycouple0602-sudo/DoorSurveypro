import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIAnalysisResult {
  doorType?: string;
  width?: string;
  height?: string;
  thickness?: string;
  material?: string;
  frameType?: string;
  frameWidth?: string;
  frameDepth?: string;
  frameGauge?: string;
  hardware?: string[];
  manufacturer?: string;
  model?: string;
  fireRating?: string;
  confidence: number;
  suggestions: string[];
}

interface AIPhotoAnalyzerProps {
  imageBase64: string;
  buildingType?: string;
  onApplyData?: (data: Partial<AIAnalysisResult>) => void;
}

export function AIPhotoAnalyzer({ imageBase64, buildingType, onApplyData }: AIPhotoAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePhoto = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/ai/analyze-photo", { imageBase64, buildingType }) as AIAnalysisResult;
      
      setResult(response);
    } catch (err) {
      setError("Failed to analyze photo. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyData = () => {
    if (result && onApplyData) {
      onApplyData({
        doorType: result.doorType,
        width: result.width,
        height: result.height,
        thickness: result.thickness,
        material: result.material,
        frameType: result.frameType,
        frameWidth: result.frameWidth,
        frameDepth: result.frameDepth,
        frameGauge: result.frameGauge,
        manufacturer: result.manufacturer,
        model: result.model,
        fireRating: result.fireRating,
      });
    }
  };

  return (
    <div className="space-y-4">
      {!result && (
        <Button
          onClick={analyzePhoto}
          disabled={analyzing}
          className="w-full"
          data-testid="button-ai-analyze"
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Photo with AI
            </>
          )}
        </Button>
      )}

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Analysis Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" />
                AI Analysis Results
              </CardTitle>
              <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
                {Math.round(result.confidence * 100)}% Confidence
              </Badge>
            </div>
            <CardDescription>
              Extracted specifications from photo analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Door Specifications */}
            {(result.doorType || result.width || result.height || result.thickness || result.material) && (
              <div>
                <h4 className="font-semibold mb-2">Door Specifications</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.doorType && (
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2">{result.doorType}</span>
                    </div>
                  )}
                  {result.width && (
                    <div>
                      <span className="text-muted-foreground">Width:</span>
                      <span className="ml-2">{result.width}</span>
                    </div>
                  )}
                  {result.height && (
                    <div>
                      <span className="text-muted-foreground">Height:</span>
                      <span className="ml-2">{result.height}</span>
                    </div>
                  )}
                  {result.thickness && (
                    <div>
                      <span className="text-muted-foreground">Thickness:</span>
                      <span className="ml-2">{result.thickness}</span>
                    </div>
                  )}
                  {result.material && (
                    <div>
                      <span className="text-muted-foreground">Material:</span>
                      <span className="ml-2">{result.material}</span>
                    </div>
                  )}
                  {result.fireRating && (
                    <div>
                      <span className="text-muted-foreground">Fire Rating:</span>
                      <span className="ml-2">{result.fireRating}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Frame Specifications */}
            {(result.frameType || result.frameWidth || result.frameDepth || result.frameGauge) && (
              <div>
                <h4 className="font-semibold mb-2">Frame Specifications</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.frameType && (
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2">{result.frameType}</span>
                    </div>
                  )}
                  {result.frameWidth && (
                    <div>
                      <span className="text-muted-foreground">Width:</span>
                      <span className="ml-2">{result.frameWidth}</span>
                    </div>
                  )}
                  {result.frameDepth && (
                    <div>
                      <span className="text-muted-foreground">Depth:</span>
                      <span className="ml-2">{result.frameDepth}</span>
                    </div>
                  )}
                  {result.frameGauge && (
                    <div>
                      <span className="text-muted-foreground">Gauge:</span>
                      <span className="ml-2">{result.frameGauge}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hardware */}
            {result.hardware && result.hardware.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Hardware Detected</h4>
                <div className="flex flex-wrap gap-2">
                  {result.hardware.map((item, index) => (
                    <Badge key={index} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Manufacturer Info */}
            {(result.manufacturer || result.model) && (
              <div>
                <h4 className="font-semibold mb-2">Manufacturer Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.manufacturer && (
                    <div>
                      <span className="text-muted-foreground">Manufacturer:</span>
                      <span className="ml-2">{result.manufacturer}</span>
                    </div>
                  )}
                  {result.model && (
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <span className="ml-2">{result.model}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">AI Suggestions</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Apply Button */}
            {onApplyData && (
              <Button 
                onClick={handleApplyData} 
                className="w-full"
                data-testid="button-apply-ai-data"
              >
                <Check className="mr-2 h-4 w-4" />
                Apply AI Data to Form
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
