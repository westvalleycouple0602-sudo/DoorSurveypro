import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Paywall } from "@/components/paywall";

interface SQLResult {
  sql: string;
  rationale: string;
  safe: boolean;
  rows: any[];
  rowCount: number;
  tables: string[];
  executionError?: string;
  note?: string;
}

export default function SQLAssistant() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SQLResult | null>(null);
  const { toast } = useToast();
  const { hasFeatureAccess, currentTier } = useFeatureAccess();

  const queryMutation = useMutation<SQLResult, Error, string>({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/sql-assistant/query", { question });
      const data = await response.json();
      return data as SQLResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.executionError) {
        toast({
          title: "Query Generated but Execution Failed",
          description: data.executionError,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Query Executed Successfully",
          description: `Retrieved ${data.rowCount} rows`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "SQL Assistant Error",
        description: error.message || "Failed to process query",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!question.trim()) {
      toast({
        title: "Question Required",
        description: "Please enter a question about your data",
        variant: "destructive",
      });
      return;
    }
    queryMutation.mutate(question);
  };

  // Check if user has access to SQL Assistant (apiAccess feature, Enterprise-only)
  const hasAccess = hasFeatureAccess("apiAccess");

  if (!hasAccess) {
    return (
      <Paywall
        variant="fullPage"
        featureName="SQL Assistant"
        featureDescription="Ask questions about your data in plain English and get instant insights powered by AI-generated SQL queries."
        requiredTier="enterprise"
        currentTier={currentTier}
        type="tier"
      />
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-7xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Database className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">SQL Assistant</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Ask questions about your data in plain English
          </p>
        </div>
      </div>

      {/* Query Input */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            Ask a Question
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Examples: "Show me all projects from last month" or "How many openings need fire-rated hardware?"
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
          <Textarea
            placeholder="What data would you like to see?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="resize-none"
            data-testid="textarea-sql-question"
          />
          <Button
            onClick={handleSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSubmit(); }}
            disabled={queryMutation.isPending}
            className="w-full text-xs sm:text-sm"
            size="sm"
            data-testid="button-submit-query"
          >
            {queryMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
                <span className="hidden sm:inline">Generating Query...</span>
                <span className="sm:hidden">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden sm:inline">Generate SQL & Execute</span>
                <span className="sm:hidden">Generate & Execute</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-3 sm:space-y-4">
          {/* Generated SQL */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <CardTitle className="text-sm sm:text-base">Generated SQL</CardTitle>
                <Badge variant={result.safe ? "default" : "destructive"} className="shrink-0 text-xs">
                  {result.safe ? "Safe" : "Unsafe"}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm">{result.rationale}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <pre className="bg-muted p-2 sm:p-4 rounded-md overflow-x-auto text-xs sm:text-sm">
                <code data-testid="text-generated-sql">{result.sql}</code>
              </pre>
              {result.tables && result.tables.length > 0 && (
                <div className="mt-2 sm:mt-3">
                  <p className="text-xs sm:text-sm font-medium mb-1">Tables Accessed:</p>
                  <code className="text-xs">{result.tables.join(", ")}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Results */}
          {!result.executionError && result.rows && result.rows.length > 0 && (
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base min-w-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                    <span className="truncate">Results ({result.rowCount} rows)</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(result.rows[0]).map((key) => (
                          <th key={key} className="text-left p-1.5 sm:p-2 font-medium whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 100).map((row, idx) => (
                        <tr key={idx} className="border-b hover-elevate" data-testid={`row-result-${idx}`}>
                          {Object.values(row).map((value: any, cellIdx) => (
                            <td key={cellIdx} className="p-1.5 sm:p-2">
                              {value === null ? (
                                <span className="text-muted-foreground italic">null</span>
                              ) : typeof value === "object" ? (
                                JSON.stringify(value)
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.rowCount > 100 && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3">
                      Showing first 100 of {result.rowCount} rows
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty Results */}
          {!result.executionError && (!result.rows || result.rows.length === 0) && (
            <Card>
              <CardContent className="p-4 sm:p-6 text-center text-muted-foreground">
                <Database className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-xs sm:text-sm">No results found for this query</p>
              </CardContent>
            </Card>
          )}

          {/* Execution Error */}
          {result.executionError && (
            <Card className="border-destructive">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-destructive text-sm sm:text-base">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Execution Error
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <p className="text-xs sm:text-sm">{result.executionError}</p>
                {result.note && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">{result.note}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Safety Notice */}
      <Card className="bg-muted/50">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            <strong>Safety Note:</strong> SQL Assistant only generates read-only SELECT queries.
            Destructive operations (INSERT, UPDATE, DELETE, DROP) are blocked for data protection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
