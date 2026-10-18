import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppUser as useAuth } from "@/hooks/use-app-user";

export interface TrialStatus {
  isActive: boolean;
  tier?: string;
  daysRemaining?: number;
  totalDays?: number; // Total trial duration in days (14 for Professional, 7 for Enterprise)
  endsAt?: string;
  isInGracePeriod: boolean;
  gracePeriodEndsAt?: string;
  organizationChanged?: boolean;
  canActivateTrial: boolean;
  availableTiers: string[];
}

export function useTrialStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organization?.id;

  return useQuery<TrialStatus>({
    queryKey: ["/api/trial/status", organizationId],
    queryFn: async () => {
      const response = await fetch("/api/trial/status", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch trial status");
      }
      
      const status: TrialStatus = await response.json();
      if (status.organizationChanged) {
        // Expiration updates the account on the server; do not keep premium UI
        // permissions from the previously cached user or plan.
        void queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/usage"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/projects/usage"] });
      }
      return status;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60, // Cache for 1 minute
    refetchInterval: 1000 * 60, // Update countdowns in an open tab, including across expiration.
  });
}
