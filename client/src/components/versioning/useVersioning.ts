import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export type VersioningEntityType = 'quote' | 'diagram' | 'floor_plan' | 'note' | 'spec' | 'opening';

interface UseVersioningOptions {
  entityType: VersioningEntityType;
  entityId: string;
  onVersionSaved?: (version: any) => void;
}

interface SaveVersionData {
  snapshot: Record<string, any>;
  versionName?: string;
  changeSummary?: string;
}

export function useVersioning({ entityType, entityId, onVersionSaved }: UseVersioningOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isComparing, setIsComparing] = useState(false);
  const [compareVersionIds, setCompareVersionIds] = useState<[string, string] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const saveVersionMutation = useMutation({
    mutationFn: async (data: SaveVersionData) => {
      const response = await apiRequest('POST', '/api/versioning/versions', {
        entityType,
        entityId,
        ...data,
      });
      if (!response.ok) throw new Error('Failed to save version');
      return response.json();
    },
    onSuccess: (version) => {
      toast({ title: 'Version saved', description: `Version ${version.versionNumber} created` });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === '/api/versioning/entities' && 
            key[1] === entityType && 
            key[2] === entityId && 
            key[3] === 'history';
        },
      });
      onVersionSaved?.(version);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save version', variant: 'destructive' });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await apiRequest('POST', '/api/versioning/restore', { versionId });
      if (!response.ok) throw new Error('Failed to restore version');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Version restored', description: 'Previous version has been restored' });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === '/api/versioning/entities' && 
            key[1] === entityType && 
            key[2] === entityId && 
            key[3] === 'history';
        },
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to restore version', variant: 'destructive' });
    },
  });

  const saveVersion = useCallback((snapshot: Record<string, any>, options?: { versionName?: string; changeSummary?: string }) => {
    saveVersionMutation.mutate({ snapshot, ...options });
  }, [saveVersionMutation]);

  const restoreVersion = useCallback((versionId: string) => {
    restoreVersionMutation.mutate(versionId);
  }, [restoreVersionMutation]);

  const startCompare = useCallback((version1Id: string, version2Id: string) => {
    setCompareVersionIds([version1Id, version2Id]);
    setIsComparing(true);
  }, []);

  const stopCompare = useCallback(() => {
    setCompareVersionIds(null);
    setIsComparing(false);
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
  }, []);

  return {
    saveVersion,
    restoreVersion,
    isSaving: saveVersionMutation.isPending,
    isRestoring: restoreVersionMutation.isPending,
    isComparing,
    compareVersionIds,
    startCompare,
    stopCompare,
    showHistory,
    toggleHistory,
    setShowHistory,
  };
}
