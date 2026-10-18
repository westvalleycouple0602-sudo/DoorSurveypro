import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { DoorSurveyForm } from "@/components/door-survey";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toastSuccess, toastError } from "@/lib/toast-utils";
import { useMilestoneCelebrations } from "@/hooks/use-milestone-celebrations";
import type { DoorSurveyPayload } from "@shared/types/doorSurvey";

export default function DoorSurvey() {
  const [, setLocation] = useLocation();
  const { celebrate } = useMilestoneCelebrations();

  const createSurvey = useMutation({
    mutationFn: async (payload: DoorSurveyPayload) => {
      const res = await apiRequest("POST", "/api/door-surveys", payload);
      return await res.json();
    },
    onSuccess: (data: { projectId: string; openingId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toastSuccess({
        title: "Door survey saved",
        description: "The door opening survey has been successfully recorded.",
      });
      celebrate("first-opening");
      setLocation(`/projects/${data.projectId}`);
    },
    onError: (error: Error) => {
      toastError({
        title: "Failed to save survey",
        description: error.message || "Unable to save door survey. Please try again.",
      });
    },
  });

  const handleSubmit = async (payload: DoorSurveyPayload) => {
    await createSurvey.mutateAsync(payload);
  };

  return (
    <div className="container max-w-4xl px-3 sm:px-4 py-4 sm:py-6">
      <DoorSurveyForm 
        onSubmit={handleSubmit} 
        isSubmitting={createSurvey.isPending}
      />
    </div>
  );
}
