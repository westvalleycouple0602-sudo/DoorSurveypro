import type { DivisionCode, ManufacturerId, ManufacturerContact } from "./types";

export const manufacturerDirectory: ManufacturerContact[] = [
  {
    id: "ALLEGION",
    name: "Allegion (Schlage, Von Duprin, LCN, Steelcraft)",
    defaultEmail: "orders@allegion.com",
    divisions: ["08", "28"],
    notes: "Div 8: Hollow metal, wood doors, hardware. Div 28: Access control, electrified hardware"
  },
  {
    id: "ASSA_ABLOY",
    name: "ASSA ABLOY (Yale, SARGENT, Corbin Russwin, Adams Rite, HES)",
    defaultEmail: "orders@assaabloy.com",
    divisions: ["08", "28"],
    notes: "Full range of mechanical and electronic access solutions"
  },
  {
    id: "DORMAKABA",
    name: "dormakaba",
    defaultEmail: "orders@dormakaba.com",
    divisions: ["08", "28"],
    notes: "Door closers, exit devices, electronic locks, access control"
  },
  {
    id: "HAGER",
    name: "Hager Companies",
    defaultEmail: "orders@hagerco.com",
    divisions: ["08"],
    notes: "Hinges, weatherstripping, thresholds, door bottoms"
  },
  {
    id: "OTHER",
    name: "Other/Local Distributor",
    defaultEmail: "procurement@yourcompany.com",
    divisions: ["08", "28"],
    notes: "Use for specialty or local suppliers"
  }
];

export function findManufacturerContact(id: ManufacturerId, div: DivisionCode): ManufacturerContact {
  const exact = manufacturerDirectory.find(m => m.id === id && m.divisions.includes(div));
  if (exact) return exact;
  
  const anyDiv = manufacturerDirectory.find(m => m.id === id);
  if (anyDiv) return anyDiv;
  
  const fallback = manufacturerDirectory.find(m => m.divisions.includes(div));
  return fallback || manufacturerDirectory[manufacturerDirectory.length - 1];
}

export function normalizeManufacturerName(name: string): ManufacturerId {
  const lower = name.toLowerCase();
  if (lower.includes("allegion") || lower.includes("schlage") || lower.includes("von duprin") || lower.includes("lcn") || lower.includes("steelcraft")) {
    return "ALLEGION";
  }
  if (lower.includes("assa") || lower.includes("abloy") || lower.includes("yale") || lower.includes("sargent") || lower.includes("corbin") || lower.includes("adams rite") || lower.includes("hes")) {
    return "ASSA_ABLOY";
  }
  if (lower.includes("dorma") || lower.includes("kaba")) {
    return "DORMAKABA";
  }
  if (lower.includes("hager")) {
    return "HAGER";
  }
  return "OTHER";
}

export function getManufacturersByDivision(div: DivisionCode): ManufacturerContact[] {
  return manufacturerDirectory.filter(m => m.divisions.includes(div));
}
