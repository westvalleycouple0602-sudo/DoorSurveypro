import type {
  DoorSurveyPayload,
  ComplianceIssue,
  BuildingCodeStandard,
} from "@shared/types/doorSurvey";

export interface RetrievedDoc {
  id: string;
  text: string;
  sourceName: string;
  standard?: BuildingCodeStandard | "MANUFACTURER";
  sectionRef?: string;
}

export interface AiComplianceRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface AiComplianceIssue extends ComplianceIssue {
  rationale: string;
}

export interface AiComplianceResponse {
  summary: string;
  issues: AiComplianceIssue[];
}

function buildOpeningSnapshot(payload: DoorSurveyPayload) {
  const { project, opening } = payload;
  return {
    project: {
      name: project.name,
      location: project.location,
      buildingType: project.buildingType,
      standards: project.standards,
    },
    opening: {
      doorTag: opening.doorTag,
      floor: opening.floor,
      spaceName: opening.spaceName,
      type: opening.openingType,
      handing: opening.handing,
      measurements: opening.measurements,
      doorLeaf: opening.doorLeaf,
      frame: opening.frame,
      hardware: {
        lockFunction: opening.hardware.lockFunction,
        lockset: opening.hardware.lockset,
        exitDevice: opening.hardware.exitDevice,
        closer: opening.hardware.closer,
        hinges: opening.hardware.hinges,
        accessories: opening.hardware.accessories,
        electrifiedHardware: opening.hardware.electrifiedHardware,
        electronicSecurity: opening.hardware.electronicSecurity || [],
      },
      compliance: {
        standardsChecked: opening.compliance.standardsChecked,
      },
    },
  };
}

export function buildAiCompliancePrompt(
  payload: DoorSurveyPayload,
  docs: RetrievedDoc[]
): AiComplianceRequest {
  const snapshot = JSON.stringify(buildOpeningSnapshot(payload), null, 2);
  const contextText = docs
    .map(
      (d, i) =>
        `### Context ${i + 1} – ${d.sourceName}${
          d.sectionRef ? " (" + d.sectionRef + ")" : ""
        }\n${d.text}`
    )
    .join("\n\n");

  const systemPrompt = `
You are an expert door, frame, hardware, and electronic security consultant
specializing in CSI Division 08 (Openings), Division 28 (Electronic Safety and Security),
and building codes (ADA, IBC, NFPA, ANSI/SDI, and local amendments).

Your job is to:
1. Review door survey data for a single opening.
2. Review the provided reference excerpts.
3. Identify any likely compliance issues and explain them clearly.
4. Separate issues by which standard or division they relate to (ADA, IBC, NFPA, DIV08, DIV28, etc.).
5. Only use information that is:
   - Present in the survey data, and
   - Supported or at least consistent with the provided reference excerpts.
If something is ambiguous or not covered in the references, call it out as an assumption.
Respond in a structured JSON format only. Do NOT invent specific code section numbers that do not appear in the excerpts.
`.trim();

  const userPrompt = `
Door survey JSON:
\`\`\`json
${snapshot}
\`\`\`

Reference excerpts:
${contextText || "No reference documents provided."}

Using ONLY the information above:

1. Provide a short paragraph summary of whether the opening appears compliant.
2. List issues grouped by the main standard or division they relate to.

Return JSON with this exact shape:

\`\`\`json
{
  "summary": "short human-readable summary",
  "issues": [
    {
      "standard": "ADA | IBC | NFPA | ANSI_SDI | LOCAL | DIV08 | DIV28",
      "codeRef": "string (use the closest section identifier from the context, or 'N/A' if not referenced)",
      "severity": "info | warning | critical",
      "message": "short description of the issue",
      "rationale": "brief explanation mentioning which context excerpt you used"
    }
  ]
}
\`\`\`
`.trim();

  return { systemPrompt, userPrompt };
}
