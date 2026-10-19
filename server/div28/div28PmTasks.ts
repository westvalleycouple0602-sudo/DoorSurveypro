// server/div28/div28PmTasks.ts
// Division 28 Project Management Task Generation

import { v4 as uuidv4 } from "uuid";
import type {
  Div28Feature,
  Div28OpportunitySummary,
  Div28TaskTemplate,
  GeneratedDiv28Task,
  Div28TaskRole,
} from "@shared/types/div28";

const DIV28_TASK_TEMPLATES: Div28TaskTemplate[] = [
  {
    id: "TPL_ACCESS_CONTROL",
    feature: "ACCESS_CONTROL",
    title: "Coordinate access control hardware",
    description:
      "Confirm reader type, electric lock hardware, and power requirements. Coordinate with security integrator on credential provisioning.",
    defaultAssigneeRole: "SECURITY_INTEGRATOR",
    suggestedDueOffsetDays: 14,
  },
  {
    id: "TPL_DOOR_AUTOMATION",
    feature: "DOOR_AUTOMATION",
    title: "Specify automatic door operator",
    description:
      "Select low-energy or full-power operator. Coordinate activation method (push plate, motion sensor, card reader tie-in).",
    defaultAssigneeRole: "ENGINEERING",
    suggestedDueOffsetDays: 7,
  },
  {
    id: "TPL_CONTROLLED_EGRESS",
    feature: "CONTROLLED_EGRESS",
    title: "Confirm controlled egress requirements",
    description:
      "Verify AHJ approval for controlled egress. Coordinate integration with access control system and fire alarm release.",
    defaultAssigneeRole: "ENGINEERING",
    suggestedDueOffsetDays: 10,
  },
  {
    id: "TPL_DELAYED_EGRESS",
    feature: "DELAYED_EGRESS",
    title: "Specify delayed egress device",
    description:
      "Select delayed egress device per NFPA 101 / IBC requirements. Confirm delay time and signage requirements with AHJ.",
    defaultAssigneeRole: "ENGINEERING",
    suggestedDueOffsetDays: 10,
  },
  {
    id: "TPL_SURVEILLANCE",
    feature: "SURVEILLANCE",
    title: "Coordinate video surveillance at opening",
    description:
      "Confirm camera type and mounting location. Coordinate with existing VMS or new system requirements.",
    defaultAssigneeRole: "SECURITY_INTEGRATOR",
    suggestedDueOffsetDays: 14,
  },
  {
    id: "TPL_INTRUSION_DETECTION",
    feature: "INTRUSION_DETECTION",
    title: "Specify intrusion detection devices",
    description:
      "Select door contact, motion detector, or glassbreak sensor. Coordinate zones with intrusion panel.",
    defaultAssigneeRole: "SECURITY_INTEGRATOR",
    suggestedDueOffsetDays: 10,
  },
  {
    id: "TPL_GUN_DETECTION_READY",
    feature: "GUN_DETECTION_READY",
    title: "Evaluate gun/threat detection options",
    description:
      "Evaluate AI-based threat detection solutions. Coordinate camera placement and integration with access control for lockdown.",
    defaultAssigneeRole: "SALES",
    suggestedDueOffsetDays: 21,
  },
  {
    id: "TPL_LOCKDOWN_CONTROL",
    feature: "LOCKDOWN_CONTROL",
    title: "Define lockdown sequence for opening",
    description:
      "Document lockdown behavior (lock/unlock, which zone). Coordinate with building-wide or zone-specific lockdown controller.",
    defaultAssigneeRole: "SECURITY_INTEGRATOR",
    suggestedDueOffsetDays: 14,
  },
];

const TEMPLATE_MAP = new Map<Div28Feature, Div28TaskTemplate>(
  DIV28_TASK_TEMPLATES.map((t) => [t.feature, t])
);

export function buildDiv28TasksForOpening(
  projectId: string,
  openingId: string,
  opportunity: Div28OpportunitySummary | null
): GeneratedDiv28Task[] {
  if (!opportunity || opportunity.recommendedFeatures.length === 0) {
    return [];
  }

  const tasks: GeneratedDiv28Task[] = [];

  for (const feature of opportunity.recommendedFeatures) {
    const template = TEMPLATE_MAP.get(feature);
    if (!template) continue;

    tasks.push({
      id: uuidv4(),
      projectId,
      openingId,
      feature,
      title: template.title,
      description: template.description,
      assigneeRole: template.defaultAssigneeRole,
      suggestedDueOffsetDays: template.suggestedDueOffsetDays,
    });
  }

  return tasks;
}

export function getDiv28TaskTemplates(): Div28TaskTemplate[] {
  return DIV28_TASK_TEMPLATES;
}
