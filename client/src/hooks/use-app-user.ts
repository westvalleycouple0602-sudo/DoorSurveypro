import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  language: string | null;
  organization: {
    id: string; name: string; slug: string; subscriptionTier: string;
    subscriptionStatus: string; activeAddons?: string[];
  } | null;
  role: string | null;
  roles?: string[];
  emailVerified?: boolean;
}

// Clerk owns identity. This overlay only fetches app authorization/preferences,
// after Clerk has finished loading, and exposes permanent authorization failures.
export function useAppUser() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const state = useQuery<AuthUser>({
    queryKey: ["/api/user", { clerkUserId: clerkUser?.id }],
    enabled: isLoaded && !!isSignedIn,
    queryFn: async () => {
      const invitation = sessionStorage.getItem("signup-invitation");
      if (invitation) {
        await apiRequest("POST", "/api/user/accept-invitation", { token: invitation });
        sessionStorage.removeItem("signup-invitation");
      }
      if (sessionStorage.getItem("join-demo") === "1") {
        await apiRequest("POST", "/api/demo/join");
        sessionStorage.removeItem("join-demo");
      }
      return (await apiRequest("GET", "/api/user")).json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const user: AuthUser | null = isSignedIn && clerkUser && state.data ? {
    ...state.data,
    // Server resolves flexible legacy account matches, so use its application PK.
    id: state.data.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    profileImageUrl: clerkUser.imageUrl,
    emailVerified: clerkUser.primaryEmailAddress?.verification.status === "verified",
  } : null;
  const logout = async () => {
    queryClient.clear();
    await signOut({ redirectUrl: "/" });
  };
  return {
    user, isLoading: !isLoaded || (!!isSignedIn && state.isPending),
    isAuthenticated: !!isSignedIn, error: state.error,
    login: () => { window.location.href = "/sign-in"; },
    logout, switchUser: logout,
  };
}
