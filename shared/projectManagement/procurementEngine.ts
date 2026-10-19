// shared/projectManagement/procurementEngine.ts
// Procurement engine for building red flags and grouping lines into packages

import type {
  ManufacturerDomain,
  ProcurementLine,
  ProcurementPackage,
  HardwareLineInput,
} from "./procurementTypes";

export function buildRedFlagsForLine(input: HardwareLineInput): string[] {
  const flags: string[] = [];

  if (!input.manufacturerPart) {
    flags.push("Missing manufacturer catalog number.");
  }
  if (!input.description) {
    flags.push("Missing description.");
  }
  if (!input.quantity || input.quantity <= 0) {
    flags.push("Quantity is zero or not specified.");
  }
  if (!input.uom) {
    flags.push("Unit of measure is not specified.");
  }
  if (
    input.voltage &&
    !/^(12V|24V|120V|230V|240V)( AC| DC)?$/.test(input.voltage)
  ) {
    flags.push(`Voltage value "${input.voltage}" should be verified.`);
  }
  if (!input.finish) {
    flags.push("Finish is not specified (e.g., 626, 630, 689).");
  }
  if (!input.fireRating) {
    flags.push("Fire rating is not linked to this hardware line.");
  }
  if (!input.handing) {
    flags.push("Handing is not specified and may be required.");
  }

  return flags;
}

let lineIdCounter = 1;
let packageIdCounter = 1;

export function groupLinesIntoPackages(
  lines: HardwareLineInput[],
  projectId: string
): ProcurementPackage[] {
  const groups = new Map<ManufacturerDomain, HardwareLineInput[]>();
  for (const line of lines) {
    const list = groups.get(line.manufacturer) ?? [];
    list.push(line);
    groups.set(line.manufacturer, list);
  }

  const packages: ProcurementPackage[] = [];
  const now = new Date().toISOString();

  groups.forEach((manuLines: HardwareLineInput[], manufacturer: ManufacturerDomain) => {
    const pkgId = `pkg-${projectId}-${packageIdCounter++}`;
    const procLines: ProcurementLine[] = manuLines.map((line) => ({
      id: `line-${lineIdCounter++}`,
      openingId: line.openingId,
      hardwareSetId: line.hardwareSetId,
      manufacturer,
      manufacturerPart: line.manufacturerPart,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom ?? "EA",
      voltage: line.voltage ?? null,
      finish: line.finish ?? null,
      handing: line.handing ?? null,
      fireRating: line.fireRating ?? null,
      notes: null,
      redFlags: buildRedFlagsForLine(line),
    }));

    packages.push({
      id: pkgId,
      projectId,
      manufacturer,
      status: "DRAFT",
      contactName: null,
      contactEmail: null,
      contactNotes: null,
      createdAt: now,
      updatedAt: now,
      lines: procLines,
    });
  });

  return packages;
}

export function countRedFlags(packages: ProcurementPackage[]): number {
  let count = 0;
  for (const pkg of packages) {
    for (const line of pkg.lines) {
      count += line.redFlags.length;
    }
  }
  return count;
}

export function getLinesWithRedFlags(
  packages: ProcurementPackage[]
): ProcurementLine[] {
  const result: ProcurementLine[] = [];
  for (const pkg of packages) {
    for (const line of pkg.lines) {
      if (line.redFlags.length > 0) {
        result.push(line);
      }
    }
  }
  return result;
}
