// ruleTooltips.ts
export const ruleTips = {
  heightRange: {
    rules: ["HW_MH_001","PH_HEIGHT"],
    text: "Mount operable hardware 34–48 in AFF (ADA 404.2.7 / IBC 1010.1.9.2). Panic bar actuating portion 34–48 in AFF."
  },
  ca44: {
    rules: ["HW_MH_CA_044"],
    text: "California amendment: many operable parts max 44 in AFF. Set local max to 44 in for CA."
  },
  force5lbf: {
    rules: ["HW_FORCE_005"],
    text: "Interior accessible door opening force ≤ 5 lbf (ADA 404.2.9), except fire doors."
  },
  threshold: {
    rules: ["TH_HT_001","TH_SLOPE_002"],
    text: "Accessible thresholds ≤ 1/2 in (new). Existing may be 3/4 in with bevel ≤ 1:2."
  },
  singleMotion: {
    rules: ["EG_SINGLE","EG_NO_DEADBOLT"],
    text: "Egress doors unlatch with a single motion—no separate deadbolt requiring additional action."
  },
  maglock: {
    rules: ["EL_MAG_RELEASES"],
    text: "Maglocks need motion REX + manual release (push-to-exit) + fire alarm release."
  },
  fireDoor: {
    rules: ["FD_SELF_CLOSE","FD_NO_MECH_HO","FD_LISTED"],
    text: "Fire doors: self-closing/latching; listed hardware; no mechanical hold-open (use electromagnetic tied to alarm)."
  },
  jurisdiction: {
    rules: ["LOC_CA_PANIC","LOC_CA_READER"],
    text: "Jurisdiction affects mounting heights and when panic hardware is required; verify local adoption."
  }
};

export const tip = (t?: { rules: string[]; text: string }) =>
  t ? `${t.text} • Rules: ${t.rules.join(", ")}` : undefined;