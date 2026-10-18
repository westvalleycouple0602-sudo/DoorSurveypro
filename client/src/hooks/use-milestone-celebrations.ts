import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const MILESTONE_STORAGE_KEY = "doorsurvey-milestones";

type MilestoneType =
  | "first-project"
  | "first-opening"
  | "first-scan"
  | "first-report"
  | "ten-openings"
  | "first-compliance";

interface MilestoneConfig {
  title: string;
  description: string;
}

const milestones: Record<MilestoneType, MilestoneConfig> = {
  "first-project": {
    title: "First Project Created",
    description: "You're on your way! Start adding door openings to your project.",
  },
  "first-opening": {
    title: "First Opening Added",
    description: "Great start! Run a LiDAR scan to capture detailed measurements.",
  },
  "first-scan": {
    title: "First LiDAR Scan Complete",
    description: "Excellent! Your 3D measurements are ready for analysis.",
  },
  "first-report": {
    title: "First Report Generated",
    description: "Your professional report is ready to share with clients.",
  },
  "ten-openings": {
    title: "10 Openings Surveyed",
    description: "You're becoming a pro! Keep up the great work.",
  },
  "first-compliance": {
    title: "First Compliance Check",
    description: "Building code validation keeps your projects on track.",
  },
};

function getCompletedMilestones(): Set<string> {
  try {
    const stored = localStorage.getItem(MILESTONE_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markMilestoneComplete(milestone: string) {
  try {
    const completed = getCompletedMilestones();
    completed.add(milestone);
    localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(Array.from(completed)));
  } catch {
    // localStorage unavailable
  }
}

export function useMilestoneCelebrations() {
  const { toast } = useToast();

  const celebrate = useCallback(
    (milestone: MilestoneType) => {
      const completed = getCompletedMilestones();
      if (completed.has(milestone)) return;

      const config = milestones[milestone];
      if (!config) return;

      markMilestoneComplete(milestone);

      setTimeout(() => {
        toast({
          title: config.title,
          description: config.description,
          duration: 5000,
        });
      }, 500);
    },
    [toast]
  );

  return { celebrate };
}
