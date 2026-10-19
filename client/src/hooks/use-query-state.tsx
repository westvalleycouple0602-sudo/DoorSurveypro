import { UseQueryResult } from "@tanstack/react-query";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";

interface UseQueryStateOptions {
  loadingMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  fullPage?: boolean;
}

/**
 * Helper hook to handle common query states (loading, error, success)
 * Returns JSX for loading/error states, or null if data is ready
 */
export function useQueryState<T>(
  query: UseQueryResult<T>,
  options: UseQueryStateOptions = {}
): JSX.Element | null {
  const {
    loadingMessage = "Loading...",
    errorTitle = "Failed to load data",
    errorMessage,
    fullPage = false,
  } = options;

  if (query.isLoading) {
    return <LoadingState message={loadingMessage} fullPage={fullPage} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        message={errorMessage}
        error={query.error as Error}
        onRetry={() => query.refetch()}
        fullPage={fullPage}
      />
    );
  }

  return null;
}
