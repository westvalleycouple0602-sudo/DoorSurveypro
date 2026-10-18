
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ExportProfile {
  id: string;
  name: string;
  description?: string | null;
  scope: "quote" | "project" | "both";
}

export function useExportProfiles() {
  return useQuery<ExportProfile[]>({
    queryKey: ["exportProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/export-profiles");
      if (!res.ok) throw new Error("Failed to load export profiles");
      return res.json();
    },
  });
}

export function useCreateExportProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExportProfile>) => {
      const res = await fetch("/api/export-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create export profile");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exportProfiles"] });
    },
  });
}

export function useQuoteVersions(quoteId: string | null) {
  return useQuery({
    enabled: !!quoteId,
    queryKey: ["quoteVersions", quoteId],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}/versions`);
      if (!res.ok) throw new Error("Failed to load quote versions");
      return res.json();
    },
  });
}

export function useExportQuote() {
  return useMutation({
    mutationFn: async (params: {
      quoteId: string;
      exportProfileId?: string | null;
      quoteVersionId?: string | null;
      format?: "pdf" | "html";
      templateType?: string | null;
      language?: string | null;
    }) => {
      const res = await fetch(`/api/quotes/${params.quoteId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to export quote");
      const blob = await res.blob();
      return { blob, format: params.format ?? "pdf" };
    },
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
