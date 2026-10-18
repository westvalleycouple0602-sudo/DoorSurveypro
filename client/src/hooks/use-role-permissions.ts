import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_ROLE_PERMISSIONS, type MembershipRole, type FeaturePermission } from "@shared/permissions";

interface RolePermissionsData {
  permissions: Record<string, string[]>;
  hasCustomizations: boolean;
  customizedRoles: string[];
}

export function useRolePermissions() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<RolePermissionsData>({
    queryKey: ["/api/team/role-permissions"],
  });

  const saveMutation = useMutation({
    mutationFn: async (permissions: Record<string, string[]>) => {
      const response = await apiRequest("PUT", "/api/team/role-permissions", { permissions });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/role-permissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save permissions",
        description: error.message || "Unable to save role permissions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await apiRequest("DELETE", `/api/team/role-permissions/${role}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/role-permissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset role",
        description: error.message || "Unable to reset role permissions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const permissions = data?.permissions as Record<MembershipRole, FeaturePermission[]> | undefined;

  return {
    permissions: permissions || DEFAULT_ROLE_PERMISSIONS,
    hasCustomizations: data?.hasCustomizations || false,
    customizedRoles: data?.customizedRoles || [],
    isLoading,
    error,
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    resetRole: resetRoleMutation.mutate,
    resetRoleAsync: resetRoleMutation.mutateAsync,
    isResetting: resetRoleMutation.isPending,
    resetError: resetRoleMutation.error,
  };
}
