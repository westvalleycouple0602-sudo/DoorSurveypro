// shared/projectManagement/pmTaskTemplates.ts
// PM Task Templates for Division 8 and Division 28 project management

import type {
  PmPhase,
  PmTaskType,
  PmDiscipline,
  PmTask,
  PmFeatureTag,
  PmTaskTemplate,
} from "./pmTaskTypes";

export const pmTaskTemplates: PmTaskTemplate[] = [
  // PRE-CONTRACT – DIV 8 & DIV 28
  {
    id: "precon-001",
    phase: "PRE_CONTRACT",
    discipline: "DIV8",
    type: "CHECKLIST",
    title: "Verify door and hardware schedule alignment",
    description:
      "Ensure the opening schedule, hardware sets, and specifications are aligned before pricing.",
    defaultRedFlag: false,
    featureTags: ["GENERAL_SECURITY"],
  },
  {
    id: "precon-002",
    phase: "PRE_CONTRACT",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Identify Div 28 scope tied to Div 8 openings",
    description:
      "List access control, automatic operators, controlled egress, delayed egress, and surveillance required at door openings.",
    defaultRedFlag: false,
    featureTags: [
      "ACCESS_CONTROL",
      "AUTOMATIC_OPERATORS",
      "CONTROLLED_EGRESS",
      "DELAYED_EGRESS",
      "CAMERA_SURVEILLANCE",
      "INTRUSION",
      "LOCKDOWN",
    ],
  },
  {
    id: "precon-003",
    phase: "PRE_CONTRACT",
    discipline: "DIV28",
    type: "MEETING_NOTE",
    title: "Review sequence-of-operations expectations",
    description:
      "Capture owner expectations for access control, lockdown behavior, door monitoring, and alarm responses.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL", "LOCKDOWN", "GENERAL_SECURITY"],
  },
  {
    id: "precon-004",
    phase: "PRE_CONTRACT",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Confirm integration with existing security platforms",
    description:
      "Identify existing access control, video management, intrusion, and mass notification platforms to integrate with.",
    defaultRedFlag: false,
    featureTags: ["NETWORK_IT", "CAMERA_SURVEILLANCE", "INTRUSION"],
  },

  // CONTRACT EXECUTED – DIV 28
  {
    id: "contract-028-001",
    phase: "CONTRACT_EXECUTED",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Build Div 28 device list by opening",
    description:
      "Generate a device list for each opening including readers, REX, DPS, operators, cameras, and sensors.",
    defaultRedFlag: false,
    featureTags: [
      "ACCESS_CONTROL",
      "AUTOMATIC_OPERATORS",
      "CAMERA_SURVEILLANCE",
      "INTRUSION",
    ],
  },
  {
    id: "contract-028-002",
    phase: "CONTRACT_EXECUTED",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Define low-voltage scope responsibility matrix",
    description:
      "Clarify which party is responsible for cabling, terminations, programming, and testing for each Div 28 system.",
    defaultRedFlag: false,
    featureTags: ["NETWORK_IT", "FIRE_ALARM_INTEGRATION", "GENERAL_SECURITY"],
  },
  {
    id: "contract-028-003",
    phase: "CONTRACT_EXECUTED",
    discipline: "DIV28",
    type: "DOCUMENT",
    title: "Lockdown and threat-response matrix draft",
    description:
      "Create a draft matrix showing how each area and opening behaves during lockdown, shelter-in-place, and other emergency modes.",
    defaultRedFlag: false,
    featureTags: ["LOCKDOWN", "GENERAL_SECURITY"],
  },

  // SUBMITTALS – DIV 8 & DIV 28
  {
    id: "submittal-001",
    phase: "SUBMITTALS",
    discipline: "DIV8",
    type: "SUBMITTAL",
    title: "Prepare door and hardware submittal package",
    description:
      "Generate and submit door, frame, and hardware submittals including catalog cuts and schedule.",
    defaultRedFlag: false,
    featureTags: ["GENERAL_SECURITY"],
  },
  {
    id: "submittal-002",
    phase: "SUBMITTALS",
    discipline: "DIV28",
    type: "SUBMITTAL",
    title: "Submit access control device catalog cuts",
    description:
      "Include reader specs, controller specs, credential types, and any integration modules.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL"],
  },
  {
    id: "submittal-003",
    phase: "SUBMITTALS",
    discipline: "DIV28",
    type: "SUBMITTAL",
    title: "Submit automatic operator and sensor specifications",
    description:
      "Include operators, activation sensors, safety sensors, and power supply specs.",
    defaultRedFlag: false,
    featureTags: ["AUTOMATIC_OPERATORS"],
  },
  {
    id: "submittal-004",
    phase: "SUBMITTALS",
    discipline: "DIV28",
    type: "SUBMITTAL",
    title: "Submit camera, video, and surveillance specs",
    description:
      "Include camera models, lenses, mounting details, NVR or cloud storage specs.",
    defaultRedFlag: false,
    featureTags: ["CAMERA_SURVEILLANCE"],
  },

  // PROCUREMENT – DIV 8 & DIV 28
  {
    id: "procurement-001",
    phase: "PROCUREMENT",
    discipline: "DIV8",
    type: "PROCUREMENT",
    title: "Generate and release door/frame/hardware orders",
    description:
      "Finalize quantities, finishes, lead times, and release purchase orders to manufacturers.",
    defaultRedFlag: false,
    featureTags: ["GENERAL_SECURITY"],
  },
  {
    id: "procurement-002",
    phase: "PROCUREMENT",
    discipline: "DIV28",
    type: "PROCUREMENT",
    title: "Order access control panels and power supplies",
    description:
      "Confirm panel quantities, enclosure types, battery backup, and network requirements.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL", "POWER_SUPPLIES", "NETWORK_IT"],
  },
  {
    id: "procurement-003",
    phase: "PROCUREMENT",
    discipline: "DIV28",
    type: "PROCUREMENT",
    title: "Order cloud licenses and software subscriptions",
    description:
      "Confirm cloud access control, video cloud storage, and any SaaS licensing requirements.",
    defaultRedFlag: false,
    featureTags: ["CLOUD_LICENSES"],
  },

  // INSTALLATION – DIV 8 & DIV 28
  {
    id: "install-001",
    phase: "INSTALLATION",
    discipline: "DIV8",
    type: "CHECKLIST",
    title: "Verify door and frame installation per specs",
    description:
      "Field verify door and frame dimensions, anchoring, and clearances before hardware installation.",
    defaultRedFlag: false,
    featureTags: ["GENERAL_SECURITY"],
  },
  {
    id: "install-002",
    phase: "INSTALLATION",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Confirm low-voltage rough-in complete",
    description:
      "Verify conduit, junction boxes, and cable pathways are installed per plan before device mounting.",
    defaultRedFlag: false,
    featureTags: ["NETWORK_IT", "ACCESS_CONTROL", "CAMERA_SURVEILLANCE"],
  },
  {
    id: "install-003",
    phase: "INSTALLATION",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Mount and wire access control devices",
    description:
      "Install readers, REX, DPS, electric strikes/locks, and ensure proper wire terminations.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL"],
  },
  {
    id: "install-004",
    phase: "INSTALLATION",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Install automatic operators and sensors",
    description:
      "Mount operators, activation sensors, safety sensors, and perform initial power-on test.",
    defaultRedFlag: false,
    featureTags: ["AUTOMATIC_OPERATORS"],
  },

  // PUNCH – DIV 8 & DIV 28
  {
    id: "punch-001",
    phase: "PUNCH",
    discipline: "DIV8",
    type: "FIELD_ISSUE",
    title: "Punch list walkthrough for doors and hardware",
    description:
      "Identify deficiencies, missing items, and finish issues on all doors and hardware.",
    defaultRedFlag: false,
    featureTags: ["GENERAL_SECURITY"],
  },
  {
    id: "punch-002",
    phase: "PUNCH",
    discipline: "DIV28",
    type: "FIELD_ISSUE",
    title: "Punch list walkthrough for Div 28 systems",
    description:
      "Test and verify operation of access control, operators, cameras, and sensors.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL", "AUTOMATIC_OPERATORS", "CAMERA_SURVEILLANCE"],
  },
  {
    id: "punch-003",
    phase: "PUNCH",
    discipline: "DIV28",
    type: "CHECKLIST",
    title: "Verify lockdown and emergency modes",
    description:
      "Test lockdown, shelter-in-place, and other emergency modes per the approved matrix.",
    defaultRedFlag: true,
    featureTags: ["LOCKDOWN", "GENERAL_SECURITY"],
  },

  // CLOSEOUT – DIV 8 & DIV 28
  {
    id: "closeout-001",
    phase: "CLOSEOUT",
    discipline: "DIV8",
    type: "DOCUMENT",
    title: "Compile as-built hardware schedule",
    description:
      "Finalize the hardware schedule reflecting all installed items, keying, and finishes.",
    defaultRedFlag: false,
    featureTags: ["GENERAL_SECURITY", "KEYING_CONFIDENTIALITY"],
  },
  {
    id: "closeout-028-001",
    phase: "CLOSEOUT",
    discipline: "DIV28",
    type: "DOCUMENT",
    title: "Deliver access control programming documentation",
    description:
      "Provide door schedules, access levels, credential groups, and timezone configurations.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL"],
  },
  {
    id: "closeout-028-002",
    phase: "CLOSEOUT",
    discipline: "DIV28",
    type: "MEETING_NOTE",
    title: "Conduct owner training session",
    description:
      "Train facility staff on access control software, credential management, and alarm response.",
    defaultRedFlag: false,
    featureTags: ["TRAINING", "ACCESS_CONTROL"],
  },
  {
    id: "closeout-028-003",
    phase: "CLOSEOUT",
    discipline: "DIV28",
    type: "DOCUMENT",
    title: "Compile commissioning and test reports",
    description:
      "Document all commissioning tests, results, and signoffs for each Div 28 system.",
    defaultRedFlag: false,
    featureTags: ["COMMISSIONING"],
  },
  {
    id: "closeout-028-004",
    phase: "CLOSEOUT",
    discipline: "DIV28",
    type: "DOCUMENT",
    title: "Provide key/credential and role-based access summary",
    description:
      "Summarize how roles, groups, and credential types are mapped to areas and openings for future reference.",
    defaultRedFlag: false,
    featureTags: ["ACCESS_CONTROL", "KEYING_CONFIDENTIALITY"],
  },
  {
    id: "closeout-028-005",
    phase: "CLOSEOUT",
    discipline: "DIV28",
    type: "DOCUMENT",
    title: "Security and keying confidentiality notice",
    description:
      "Issue a confidentiality notice covering system details, keying, and access data, and confirm who is authorized to receive information.",
    defaultRedFlag: true,
    featureTags: ["KEYING_CONFIDENTIALITY", "GENERAL_SECURITY"],
  },
];

export function instantiateTasksForProject(params: {
  projectId: string;
  nowIso?: string;
}): PmTask[] {
  const { projectId, nowIso } = params;
  const now = nowIso ?? new Date().toISOString();

  return pmTaskTemplates.map((tmpl, idx) => ({
    id: `${projectId}-task-${idx + 1}`,
    projectId,
    openingId: null,
    phase: tmpl.phase,
    discipline: tmpl.discipline,
    type: tmpl.type,
    title: tmpl.title,
    description: tmpl.description,
    status: "NOT_STARTED" as const,
    assigneeName: null,
    assigneeRole: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    redFlag: tmpl.defaultRedFlag,
    featureTags: tmpl.featureTags ?? [],
  }));
}
