import { useState, useRef, useCallback } from "react";
import { useOpeningDetail } from "../context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Download,
  Printer,
  RefreshCw,
  Building2,
  DoorOpen,
  Frame,
  Wrench,
  Ruler,
  SplitSquareHorizontal,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FactoryOrderData {
  // Project info
  projectName: string;
  projectLocation: string;
  doorLocation: string;
  appointmentDate: string;
  scopeOfWork: string;
  customerAccount: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  salesman: string;
  salesmanEmail: string;
  quoteNumber: string;
  orderDate: string;

  // Frame details
  frameType: string;
  frameManufacturer: string;
  frameWidth: string;
  frameHeight: string;
  roughOpeningWidth: string;
  roughOpeningHeight: string;
  soffit: string;
  throatDepth: string;
  jambDepth: string;
  rabbit: string;
  frameFace: string;
  frameCoating: string;
  frameGauge: string;
  frameFireRating: string;
  framePressurePositive: boolean;
  framePressureNegative: boolean;
  frameProfile: string;
  hingeType: string;
  hingeSize: string;
  hingeNominalSize: string;

  // Active door
  doorManufacturer: string;
  activeDoorWidth: string;
  activeDoorHeight: string;
  activeDoorFireRating: string;
  activeCutoutWidth: string;
  activeCutoutHeight: string;
  activeCutoutGauge: string;
  activeGlazing: string;
  activeGlazingFireRating: string;
  activeDoorEdge: string;
  activeVisibleGlass: string;
  activeTopInward: string;
  activeDoorThickness: string;
  activeVisibleSeam: boolean;
  activeCoreType: string;
  activeSpecies: string;
  activeStainColor: string;

  // Inactive door
  hasInactiveDoor: boolean;
  inactiveDoorWidth: string;
  inactiveDoorHeight: string;
  inactiveDoorFireRating: string;
  inactiveCutoutWidth: string;
  inactiveCutoutHeight: string;
  inactiveCutoutGauge: string;
  inactiveGlazing: string;
  inactiveGlazingFireRating: string;
  inactiveDoorEdge: string;
  inactiveVisibleGlass: string;
  inactiveTopInward: string;
  inactiveDoorThickness: string;
  inactiveVisibleSeam: boolean;
  inactiveCoreType: string;
  inactiveSpecies: string;
  inactiveStainColor: string;

  // Hardware — door closer
  doorCloserType: string;
  doorCloserModel: string;
  dimA: string; dimB: string; dimC: string; dimD: string;
  dimE: string; dimF: string; dimG: string; dimH: string;
  dimI: string; dimJ: string;
  dimK: string; dimL: string; dimM: string; dimN: string;
  dimO: string; dimP: string; dimQ: string; dimR: string;
  doorFireRatingHardware: string;
  doorHardingActive: string;
  doorHardingInactive: string;
  electrifiedHardwareF: string;
  electrifiedHardwareD: string;

  // Lock / latch
  locksetModel: string;
  locksetType: string;
  lockBackset: string;
  deadboltModel: string;
  deadboltBackset: string;
  strikePrepType: string;
  strikeLocation: string;
  strikeSize: string;
  topOfFrameToStrike: string;

  // Flush / fire bolt
  autoFlushBoltModel: string;
  fireBoltModel: string;

  // Finish & protection
  finish: string;
  kickplateWidth: string;
  kickplateHeight: string;
  astragalMullionEdgeGuard: string;
  thresholdModel: string;
  thresholdSize: string;
  sweepsModel: string;
  addRaceway: boolean;
  autoDoorOperatorCoordinator: boolean;

  // Notes
  frameNotes: string;
  doorNotes: string;
  hardwareNotes: string;
}

function emptyOrderData(): FactoryOrderData {
  return {
    projectName: "", projectLocation: "", doorLocation: "", appointmentDate: "",
    scopeOfWork: "", customerAccount: "", address: "", contactName: "",
    contactEmail: "", contactPhone: "", salesman: "", salesmanEmail: "",
    quoteNumber: "", orderDate: new Date().toISOString().slice(0, 10),
    frameType: "single", frameManufacturer: "", frameWidth: "", frameHeight: "",
    roughOpeningWidth: "", roughOpeningHeight: "", soffit: "", throatDepth: "",
    jambDepth: "", rabbit: "", frameFace: "", frameCoating: "", frameGauge: "",
    frameFireRating: "", framePressurePositive: false, framePressureNegative: false,
    frameProfile: "", hingeType: "4.5_standard", hingeSize: "", hingeNominalSize: "",
    doorManufacturer: "", activeDoorWidth: "", activeDoorHeight: "",
    activeDoorFireRating: "", activeCutoutWidth: "", activeCutoutHeight: "",
    activeCutoutGauge: "", activeGlazing: "", activeGlazingFireRating: "",
    activeDoorEdge: "", activeVisibleGlass: "", activeTopInward: "",
    activeDoorThickness: "", activeVisibleSeam: false, activeCoreType: "",
    activeSpecies: "", activeStainColor: "",
    hasInactiveDoor: false, inactiveDoorWidth: "", inactiveDoorHeight: "",
    inactiveDoorFireRating: "", inactiveCutoutWidth: "", inactiveCutoutHeight: "",
    inactiveCutoutGauge: "", inactiveGlazing: "", inactiveGlazingFireRating: "",
    inactiveDoorEdge: "", inactiveVisibleGlass: "", inactiveTopInward: "",
    inactiveDoorThickness: "", inactiveVisibleSeam: false, inactiveCoreType: "",
    inactiveSpecies: "", inactiveStainColor: "",
    doorCloserType: "", doorCloserModel: "",
    dimA: "", dimB: "", dimC: "", dimD: "",
    dimE: "", dimF: "", dimG: "", dimH: "",
    dimI: "", dimJ: "",
    dimK: "", dimL: "", dimM: "", dimN: "",
    dimO: "", dimP: "", dimQ: "", dimR: "",
    doorFireRatingHardware: "", doorHardingActive: "", doorHardingInactive: "",
    electrifiedHardwareF: "", electrifiedHardwareD: "",
    locksetModel: "", locksetType: "", lockBackset: "", deadboltModel: "",
    deadboltBackset: "", strikePrepType: "", strikeLocation: "", strikeSize: "",
    topOfFrameToStrike: "",
    autoFlushBoltModel: "", fireBoltModel: "",
    finish: "", kickplateWidth: "", kickplateHeight: "",
    astragalMullionEdgeGuard: "", thresholdModel: "", thresholdSize: "",
    sweepsModel: "", addRaceway: false, autoDoorOperatorCoordinator: false,
    frameNotes: "", doorNotes: "", hardwareNotes: "",
  };
}

// Shared initializer: merges opening/project data into a blank form.
// Used by both the initial useState and the "Auto-populate" button so they
// are always in sync with no risk of drift.
function buildFormData(
  project: { name?: string | null; location?: string | null; scopeOfWork?: string | null } | undefined,
  opening: {
    location?: string | null; roomName?: string | null; openingNumber?: string | null;
    doorWidth?: string | null; doorHeight?: string | null; doorThickness?: string | null;
    doorFireRating?: string | null; frameWidth?: string | null; frameDepth?: string | null;
    frameType?: string | null; frameFireRating?: string | null; doorCoreType?: string | null;
    woodVeneerSpecies?: string | null; woodStainColor?: string | null;
    doorGlassType?: string | null; doorCutoutWidth?: string | null;
    doorCutoutHeight?: string | null; hingeType?: string | null;
    closerType?: string | null; revealLeft?: string | null; revealRight?: string | null;
    revealTop?: string | null; metalFinishType?: string | null;
    astragalType?: string | null; doorType?: string | null;
  } | undefined,
): FactoryOrderData {
  const d = emptyOrderData();

  if (project) {
    d.projectName = project.name || "";
    d.projectLocation = project.location || "";
    d.scopeOfWork = project.scopeOfWork || "";
  }

  if (opening) {
    d.doorLocation =
      opening.location ||
      (opening.roomName ? `${opening.roomName} - ${opening.openingNumber}` : opening.openingNumber || "");
    d.activeDoorWidth = opening.doorWidth || "";
    d.activeDoorHeight = opening.doorHeight || "";
    d.activeDoorThickness = opening.doorThickness || "";
    d.activeDoorFireRating = opening.doorFireRating || "";
    d.frameWidth = opening.frameWidth || opening.doorWidth || "";
    // Frame height: not stored separately in schema; door height is the closest proxy
    d.frameHeight = opening.doorHeight || "";
    d.jambDepth = opening.frameDepth || "";
    d.frameType = opening.frameType || "single";
    d.frameFireRating = opening.frameFireRating || "";
    d.activeDoorEdge = opening.doorThickness ? `${opening.doorThickness}" Thick` : "";
    d.activeCoreType = opening.doorCoreType || "";
    d.activeSpecies = opening.woodVeneerSpecies || "";
    d.activeStainColor = opening.woodStainColor || "";
    d.activeGlazing = opening.doorGlassType || "";
    d.activeCutoutWidth = opening.doorCutoutWidth || "";
    d.activeCutoutHeight = opening.doorCutoutHeight || "";
    d.hingeType = opening.hingeType || "4.5_standard";
    d.doorCloserType = opening.closerType || "";
    // Compute rough opening from reveals when available
    if (opening.revealLeft && opening.doorWidth) {
      const rw =
        parseFloat(opening.doorWidth) +
        parseFloat(opening.revealLeft || "0") +
        parseFloat(opening.revealRight || "0");
      d.roughOpeningWidth = Number.isNaN(rw) ? "" : String(rw);
    }
    if (opening.revealTop && opening.doorHeight) {
      const rh = parseFloat(opening.doorHeight) + parseFloat(opening.revealTop || "0");
      d.roughOpeningHeight = Number.isNaN(rh) ? "" : String(rh);
    }
    d.finish = opening.metalFinishType || opening.woodStainColor || "";
    d.astragalMullionEdgeGuard = opening.astragalType || "";
    d.hasInactiveDoor = opening.doorType?.toLowerCase().includes("pair") ?? false;
  }

  return d;
}

// ─── SVG Technical Drawing ────────────────────────────────────────────────────

interface DrawingProps {
  data: FactoryOrderData;
  mode: "combined" | "door-only" | "frame-only";
  title?: string;
}

function TechnicalDrawing({ data, mode, title }: DrawingProps) {
  const W = 340;
  const H = 480;
  const margin = 44;

  // Parse dimensions (inches, fallback to defaults)
  const fw = parseFloat(data.frameWidth || data.activeDoorWidth || "36") || 36;
  const fh = parseFloat(data.frameHeight || data.activeDoorHeight || "84") || 84;
  const dw = parseFloat(data.activeDoorWidth || "36") || 36;
  const dh = parseFloat(data.activeDoorHeight || "84") || 84;
  const thickness = parseFloat(data.activeDoorThickness || "1.75") || 1.75;
  const jd = parseFloat(data.jambDepth || "4.5") || 4.5;

  // Scale to fit in drawing area
  const drawW = W - margin * 2;
  const drawH = H - margin * 2 - 40;
  const scaleX = drawW / (fw + 8);
  const scaleY = drawH / (fh + 8);
  const scale = Math.min(scaleX, scaleY);

  const framePixW = fw * scale;
  const framePixH = fh * scale;
  const doorPixW = dw * scale;
  const doorPixH = dh * scale;

  const ox = margin + (drawW - framePixW) / 2;
  const oy = margin + 20 + (drawH - framePixH) / 2;

  const frameThick = 6;
  const doorX = ox + frameThick;
  const doorY = oy + frameThick;

  // Hinge positions (3 hinges by default, 4 if tall)
  const numHinges = fh > 90 ? 4 : 3;
  const hingeLabels = ["A", "B", "C", "D"].slice(0, numHinges);
  const hingeSpacing = doorPixH / (numHinges + 1);
  const hingeX = doorX + 8;

  // Hardware vertical positions
  const latchY = doorY + doorPixH * 0.5;
  const closerY = doorY + 30;
  const flushBoltTopY = doorY + 18;
  const flushBoltBotY = doorY + doorPixH - 18;

  const showFrame = mode === "combined" || mode === "frame-only";
  const showDoor = mode === "combined" || mode === "door-only";

  const hasGlazing = !!(data.activeGlazing || data.activeCutoutWidth);
  const glassW = parseFloat(data.activeCutoutWidth || "12") * scale;
  const glassH = parseFloat(data.activeCutoutHeight || "12") * scale;
  const glassX = doorX + (doorPixW - glassW) / 2;
  const glassY = doorY + doorPixH * 0.25;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: "monospace", background: "white" }}
    >
      {/* Title */}
      <text x={W / 2} y={16} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#1e293b">
        {title || (mode === "combined" ? "DOOR & FRAME ASSEMBLY" : mode === "door-only" ? "DOOR LEAF" : "FRAME")}
      </text>

      {/* Frame border */}
      {showFrame && (
        <>
          <rect
            x={ox} y={oy}
            width={framePixW} height={framePixH}
            fill="none" stroke="#334155" strokeWidth={frameThick}
          />
          {/* Frame dimension lines */}
          {/* Width dimension */}
          <line x1={ox} y1={oy + framePixH + 14} x2={ox + framePixW} y2={oy + framePixH + 14} stroke="#64748b" strokeWidth={0.8} />
          <line x1={ox} y1={oy + framePixH + 10} x2={ox} y2={oy + framePixH + 18} stroke="#64748b" strokeWidth={0.8} />
          <line x1={ox + framePixW} y1={oy + framePixH + 10} x2={ox + framePixW} y2={oy + framePixH + 18} stroke="#64748b" strokeWidth={0.8} />
          <text x={ox + framePixW / 2} y={oy + framePixH + 24} textAnchor="middle" fontSize={8} fill="#475569">
            {data.frameWidth || data.activeDoorWidth || "—"} W
          </text>
          {/* Height dimension */}
          <line x1={ox - 14} y1={oy} x2={ox - 14} y2={oy + framePixH} stroke="#64748b" strokeWidth={0.8} />
          <line x1={ox - 18} y1={oy} x2={ox - 10} y2={oy} stroke="#64748b" strokeWidth={0.8} />
          <line x1={ox - 18} y1={oy + framePixH} x2={ox - 10} y2={oy + framePixH} stroke="#64748b" strokeWidth={0.8} />
          <text
            x={ox - 22} y={oy + framePixH / 2}
            textAnchor="middle" fontSize={8} fill="#475569"
            transform={`rotate(-90, ${ox - 22}, ${oy + framePixH / 2})`}
          >
            {data.frameHeight || data.activeDoorHeight || "—"} H
          </text>
          {/* Frame labels */}
          <text x={ox + framePixW / 2} y={oy - 4} textAnchor="middle" fontSize={7} fill="#64748b">
            {data.frameManufacturer ? `FRAME: ${data.frameManufacturer}` : "FRAME"}
            {data.frameFireRating ? ` · ${data.frameFireRating}` : ""}
          </text>
          {/* Jamb depth label */}
          {data.jambDepth && (
            <text x={ox + framePixW + 6} y={oy + 14} fontSize={7} fill="#64748b">JD: {data.jambDepth}"</text>
          )}
          {/* Soffit label */}
          {data.soffit && (
            <text x={ox + framePixW + 6} y={oy + 24} fontSize={7} fill="#64748b">SFT: {data.soffit}"</text>
          )}
          {/* Rabbit label */}
          {data.rabbit && (
            <text x={ox + framePixW + 6} y={oy + 34} fontSize={7} fill="#64748b">RBT: {data.rabbit}"</text>
          )}
          {/* Throat depth */}
          {data.throatDepth && (
            <text x={ox + framePixW + 6} y={oy + 44} fontSize={7} fill="#64748b">THR: {data.throatDepth}"</text>
          )}
          {/* Frame type badge */}
          <rect x={ox + 4} y={oy + framePixH - 18} width={48} height={14} rx={2} fill="#e2e8f0" />
          <text x={ox + 28} y={oy + framePixH - 8} textAnchor="middle" fontSize={7} fill="#475569">
            {data.frameType?.toUpperCase() || "SINGLE"}
          </text>
        </>
      )}

      {/* Door leaf */}
      {showDoor && (
        <>
          <rect
            x={doorX} y={doorY}
            width={doorPixW} height={doorPixH}
            fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5}
          />
          {/* Door manufacturer label */}
          <text x={doorX + doorPixW / 2} y={doorY + 12} textAnchor="middle" fontSize={7} fill="#334155">
            {data.doorManufacturer ? data.doorManufacturer.toUpperCase() : "DOOR"}
          </text>
          {/* Door fire rating */}
          {data.activeDoorFireRating && (
            <text x={doorX + doorPixW / 2} y={doorY + 22} textAnchor="middle" fontSize={7} fill="#64748b">
              {data.activeDoorFireRating}
            </text>
          )}

          {/* Glazing / lite cutout */}
          {hasGlazing && glassW > 4 && glassH > 4 && glassY + glassH < doorY + doorPixH - 10 && (
            <>
              <rect x={glassX} y={glassY} width={glassW} height={glassH} fill="#bfdbfe" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3,2" />
              <text x={glassX + glassW / 2} y={glassY + glassH / 2 + 3} textAnchor="middle" fontSize={6} fill="#1d4ed8">
                {data.activeCutoutWidth && data.activeCutoutHeight ? `${data.activeCutoutWidth}×${data.activeCutoutHeight}` : "LITE"}
              </text>
            </>
          )}

          {/* Hinges — left stile */}
          {hingeLabels.map((label, i) => {
            const hy = doorY + hingeSpacing * (i + 1);
            return (
              <g key={label}>
                <rect x={doorX - 4} y={hy - 6} width={12} height={12} fill="#fef9c3" stroke="#ca8a04" strokeWidth={1} rx={1} />
                <text x={doorX + 2} y={hy + 4} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#92400e">{label}</text>
                {/* Dim label */}
                {(data as Record<string, string>)[`dim${label}`] && (
                  <text x={doorX - 10} y={hy + 4} textAnchor="end" fontSize={6} fill="#64748b">
                    {(data as Record<string, string>)[`dim${label}`]}"
                  </text>
                )}
              </g>
            );
          })}

          {/* Hinge stile dimension callouts (E, F, G, H on closer side) */}
          {["E", "F", "G", "H"].map((label, i) => {
            const hy = doorY + (doorPixH / 5) * (i + 1);
            const hasVal = !!(data as Record<string, string>)[`dim${label}`];
            if (!hasVal && mode !== "combined") return null;
            return (
              <g key={label}>
                <circle cx={doorX + doorPixW - 8} cy={hy} r={6} fill="#fce7f3" stroke="#9d174d" strokeWidth={0.8} />
                <text x={doorX + doorPixW - 8} y={hy + 3} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#831843">{label}</text>
                {hasVal && (
                  <text x={doorX + doorPixW + 6} y={hy + 3} fontSize={6} fill="#64748b">
                    {(data as Record<string, string>)[`dim${label}`]}"
                  </text>
                )}
              </g>
            );
          })}

          {/* Lock/Latch marker — I, J */}
          <g>
            <circle cx={doorX + doorPixW - 10} cy={latchY} r={7} fill="#d1fae5" stroke="#065f46" strokeWidth={1} />
            <text x={doorX + doorPixW - 10} y={latchY + 3} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#064e3b">I</text>
            {data.dimI && (
              <text x={doorX + doorPixW + 6} y={latchY + 3} fontSize={6} fill="#64748b">{data.dimI}"</text>
            )}
          </g>
          <g>
            <circle cx={doorX + doorPixW - 10} cy={latchY + 16} r={6} fill="#d1fae5" stroke="#065f46" strokeWidth={1} />
            <text x={doorX + doorPixW - 10} y={latchY + 19} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#064e3b">J</text>
            {data.dimJ && (
              <text x={doorX + doorPixW + 6} y={latchY + 19} fontSize={6} fill="#64748b">{data.dimJ}"</text>
            )}
          </g>

          {/* Door closer marker at top */}
          {data.doorCloserModel && (
            <g>
              <rect x={doorX + doorPixW / 2 - 14} y={doorY + 4} width={28} height={10} rx={2} fill="#ede9fe" stroke="#7c3aed" strokeWidth={0.8} />
              <text x={doorX + doorPixW / 2} y={doorY + 12} textAnchor="middle" fontSize={6} fill="#5b21b6">CLOSER</text>
            </g>
          )}

          {/* Flush bolt markers */}
          {data.autoFlushBoltModel && (
            <>
              <g>
                <circle cx={doorX + doorPixW / 2} cy={flushBoltTopY} r={5} fill="#fef3c7" stroke="#d97706" strokeWidth={0.8} />
                <text x={doorX + doorPixW / 2} y={flushBoltTopY + 3} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#92400e">K</text>
              </g>
              <g>
                <circle cx={doorX + doorPixW / 2} cy={flushBoltBotY} r={5} fill="#fef3c7" stroke="#d97706" strokeWidth={0.8} />
                <text x={doorX + doorPixW / 2} y={flushBoltBotY + 3} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#92400e">O</text>
              </g>
            </>
          )}

          {/* Door thickness label */}
          {data.activeDoorThickness && (
            <text x={doorX + doorPixW / 2} y={doorY + doorPixH - 6} textAnchor="middle" fontSize={6} fill="#94a3b8">
              THK: {data.activeDoorThickness}"
            </text>
          )}

          {/* Door edge label */}
          {data.activeDoorEdge && (
            <text x={doorX + doorPixW + 4} y={doorY + doorPixH - 14} fontSize={6} fill="#64748b">EDGE: {data.activeDoorEdge}</text>
          )}

          {/* Swing arc indicator */}
          <path
            d={`M ${doorX + doorPixW} ${doorY + doorPixH} A ${doorPixW * 0.3} ${doorPixW * 0.3} 0 0 1 ${doorX + doorPixW + doorPixW * 0.3} ${doorY + doorPixH - doorPixW * 0.3}`}
            fill="none" stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="3,2"
          />
        </>
      )}

      {/* Rough opening dimensions (dashed box) */}
      {showFrame && (data.roughOpeningWidth || data.roughOpeningHeight) && (
        <>
          <rect
            x={ox - 8} y={oy - 8}
            width={framePixW + 16} height={framePixH + 16}
            fill="none" stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="4,3"
          />
          <text x={ox + framePixW + 14} y={oy + framePixH / 2} fontSize={7} fill="#94a3b8">
            RO: {data.roughOpeningWidth}×{data.roughOpeningHeight}
          </text>
        </>
      )}

      {/* Legend area at bottom */}
      <line x1={8} y1={H - 32} x2={W - 8} y2={H - 32} stroke="#e2e8f0" strokeWidth={0.8} />
      <text x={8} y={H - 20} fontSize={6.5} fill="#64748b">
        {data.frameManufacturer && mode !== "door-only" ? `FRAME: ${data.frameManufacturer}` : ""}
        {data.doorManufacturer && mode !== "frame-only" ? `  DOOR: ${data.doorManufacturer}` : ""}
      </text>
      <text x={8} y={H - 11} fontSize={6.5} fill="#64748b">
        {data.finish ? `FINISH: ${data.finish}` : ""}
        {data.frameGauge ? `  GAUGE: ${data.frameGauge}` : ""}
        {data.activeCoreType ? `  CORE: ${data.activeCoreType}` : ""}
      </text>
      <text x={W - 8} y={H - 11} textAnchor="end" fontSize={6.5} fill="#94a3b8">
        {data.orderDate}
      </text>
    </svg>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text", className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="h-8 text-sm"
        data-testid={`input-fo-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
      />
    </div>
  );
}

function CheckField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        data-testid={`check-fo-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
      />
      <Label className="text-sm cursor-pointer">{label}</Label>
    </div>
  );
}

function SectionCard({
  title, icon: Icon, children, defaultOpen = true,
}: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="py-3 px-4 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      {open && <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>}
    </Card>
  );
}

function DimGrid({ pairs, data, onChange }: {
  pairs: [string, string][];
  data: FactoryOrderData;
  onChange: (field: keyof FactoryOrderData, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {pairs.map(([label, field]) => (
        <Field
          key={field}
          label={label}
          value={(data as Record<string, string>)[field] || ""}
          onChange={(v) => onChange(field as keyof FactoryOrderData, v)}
          placeholder={`${label} (in)`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function FactoryOrderPanel() {
  const { opening, project } = useOpeningDetail();
  const { toast } = useToast();
  const [showDrawings, setShowDrawings] = useState(false);

  // Initialize form from opening/project data using the shared buildFormData helper
  const [data, setData] = useState<FactoryOrderData>(() => buildFormData(project, opening));

  // Single update callback — handles both string and boolean fields
  const update = useCallback(
    (field: keyof FactoryOrderData, value: FactoryOrderData[keyof FactoryOrderData]) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Determine drawing mode
  const sameMfr =
    !data.doorManufacturer ||
    !data.frameManufacturer ||
    data.doorManufacturer.trim().toLowerCase() === data.frameManufacturer.trim().toLowerCase();

  const handleAutoPopulate = () => {
    setData(buildFormData(project, opening));
    toast({ title: "Form populated from opening data" });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = (containerEl: HTMLDivElement | null, filename: string) => {
    if (!containerEl) return;
    const svgEl = containerEl.querySelector("svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const svgCombinedRef = useRef<HTMLDivElement>(null);
  const svgDoorRef = useRef<HTMLDivElement>(null);
  const svgFrameRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4 pb-10">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Factory Order Form</h2>
          {sameMfr ? (
            <Badge variant="outline" className="text-xs">Combined Drawing</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Separate Drawings</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleAutoPopulate} data-testid="button-fo-autopopulate">
            <RefreshCw className="h-4 w-4 mr-1" />
            Auto-populate
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDrawings((v) => !v)} data-testid="button-fo-toggle-drawings">
            <Layers className="h-4 w-4 mr-1" />
            {showDrawings ? "Hide" : "Show"} Drawings
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-fo-print">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Technical drawings */}
      {showDrawings && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              Technical Drawings
              <span className="text-xs font-normal text-muted-foreground ml-2">
                {sameMfr
                  ? "Door & Frame shown together (same manufacturer)"
                  : "Drawn separately (different manufacturers)"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {sameMfr ? (
              <div className="flex flex-col items-center gap-2">
                <div ref={svgCombinedRef} className="border rounded-md overflow-hidden">
                  <TechnicalDrawing data={data} mode="combined" />
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleDownloadSvg(svgCombinedRef.current, `factory-order-${data.doorLocation || "opening"}.svg`)}
                  data-testid="button-fo-download-combined"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Drawing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Door — {data.doorManufacturer}</p>
                  <div ref={svgDoorRef} className="border rounded-md overflow-hidden">
                    <TechnicalDrawing data={data} mode="door-only" title={`DOOR LEAF — ${data.doorManufacturer}`} />
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleDownloadSvg(svgDoorRef.current, `door-${data.doorLocation || "opening"}.svg`)}
                    data-testid="button-fo-download-door"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Door Drawing
                  </Button>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Frame — {data.frameManufacturer}</p>
                  <div ref={svgFrameRef} className="border rounded-md overflow-hidden">
                    <TechnicalDrawing data={data} mode="frame-only" title={`FRAME — ${data.frameManufacturer}`} />
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleDownloadSvg(svgFrameRef.current, `frame-${data.doorLocation || "opening"}.svg`)}
                    data-testid="button-fo-download-frame"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Frame Drawing
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Project Info ─────────────────────────────────────────────── */}
      <SectionCard title="Project Information" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Project Name" value={data.projectName} onChange={(v) => update("projectName", v)} />
          <Field label="Project Location" value={data.projectLocation} onChange={(v) => update("projectLocation", v)} />
          <Field label="Door Location" value={data.doorLocation} onChange={(v) => update("doorLocation", v)} />
          <Field label="Appointment Date" value={data.appointmentDate} onChange={(v) => update("appointmentDate", v)} type="date" />
          <Field label="Quote #" value={data.quoteNumber} onChange={(v) => update("quoteNumber", v)} />
          <Field label="Order Date" value={data.orderDate} onChange={(v) => update("orderDate", v)} type="date" />
          <Field label="Customer Account" value={data.customerAccount} onChange={(v) => update("customerAccount", v)} />
          <Field label="Address" value={data.address} onChange={(v) => update("address", v)} />
          <Field label="Contact Name" value={data.contactName} onChange={(v) => update("contactName", v)} />
          <Field label="Contact Email" value={data.contactEmail} onChange={(v) => update("contactEmail", v)} type="email" />
          <Field label="Contact Phone" value={data.contactPhone} onChange={(v) => update("contactPhone", v)} type="tel" />
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope of Work</Label>
            <Textarea
              value={data.scopeOfWork}
              onChange={(e) => update("scopeOfWork", e.target.value)}
              placeholder="Describe scope of work..."
              className="text-sm min-h-[60px]"
              data-testid="textarea-fo-scope"
            />
          </div>
          <Field label="Salesman" value={data.salesman} onChange={(v) => update("salesman", v)} />
          <Field label="Salesman Email" value={data.salesmanEmail} onChange={(v) => update("salesmanEmail", v)} type="email" />
        </div>
      </SectionCard>

      {/* ── Frame Section ─────────────────────────────────────────────── */}
      <SectionCard title="Frame Specifications" icon={Frame}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frame Type</Label>
              <Select value={data.frameType} onValueChange={(v) => update("frameType", v)}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-fo-frame-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="pair">Pair</SelectItem>
                  <SelectItem value="cased_opening">Cased Opening</SelectItem>
                  <SelectItem value="borrowed_lite">Borrowed Lite</SelectItem>
                  <SelectItem value="sidelite">Sidelite</SelectItem>
                  <SelectItem value="transom_frame">Transom Frame</SelectItem>
                  <SelectItem value="transom_sidelite">Transom & Sidelite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Frame Manufacturer" value={data.frameManufacturer} onChange={(v) => update("frameManufacturer", v)} />
            <Field label="Frame Profile" value={data.frameProfile} onChange={(v) => update("frameProfile", v)} placeholder="e.g. 16 GA HM" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Frame Dimensions</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Frame Width" value={data.frameWidth} onChange={(v) => update("frameWidth", v)} placeholder='e.g. 36"' />
              <Field label="Frame Height" value={data.frameHeight} onChange={(v) => update("frameHeight", v)} placeholder='e.g. 84"' />
              <Field label="Rough Opening W" value={data.roughOpeningWidth} onChange={(v) => update("roughOpeningWidth", v)} placeholder='RO Width"' />
              <Field label="Rough Opening H" value={data.roughOpeningHeight} onChange={(v) => update("roughOpeningHeight", v)} placeholder='RO Height"' />
              <Field label="Soffit" value={data.soffit} onChange={(v) => update("soffit", v)} placeholder='Soffit"' />
              <Field label="Throat Depth" value={data.throatDepth} onChange={(v) => update("throatDepth", v)} placeholder='THD"' />
              <Field label="Jamb Depth" value={data.jambDepth} onChange={(v) => update("jambDepth", v)} placeholder='JD"' />
              <Field label="Rabbit" value={data.rabbit} onChange={(v) => update("rabbit", v)} placeholder='RBT"' />
              <Field label="Frame Face" value={data.frameFace} onChange={(v) => update("frameFace", v)} placeholder='Face"' />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Frame Properties</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Gauge" value={data.frameGauge} onChange={(v) => update("frameGauge", v)} placeholder="e.g. 16 GA" />
              <Field label="Coating" value={data.frameCoating} onChange={(v) => update("frameCoating", v)} placeholder="e.g. Primer" />
              <Field label="Fire Rating" value={data.frameFireRating} onChange={(v) => update("frameFireRating", v)} placeholder="e.g. 90 min" />
            </div>
            <div className="flex items-center gap-6 mt-3">
              <CheckField label="Positive Pressure" checked={data.framePressurePositive} onChange={(v) => update("framePressurePositive", v)} />
              <CheckField label="Negative Pressure" checked={data.framePressureNegative} onChange={(v) => update("framePressureNegative", v)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hinge Information</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hinge Type</Label>
                <Select value={data.hingeType} onValueChange={(v) => update("hingeType", v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-fo-hinge-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4.5_standard">4.5" Standard Duty</SelectItem>
                    <SelectItem value="4.5_heavy">4.5" Heavy Duty</SelectItem>
                    <SelectItem value="5.0_standard">5.0" Standard Duty</SelectItem>
                    <SelectItem value="5.0_heavy">5.0" Heavy Duty</SelectItem>
                    <SelectItem value="no_prep">No Hinge Prep</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Hinge Size" value={data.hingeSize} onChange={(v) => update("hingeSize", v)} placeholder='e.g. 4.5"' />
              <Field label="Nominal Size" value={data.hingeNominalSize} onChange={(v) => update("hingeNominalSize", v)} placeholder='e.g. 4.5 x 4.5"' />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frame Notes</Label>
            <Textarea value={data.frameNotes} onChange={(e) => update("frameNotes", e.target.value)} className="text-sm min-h-[50px]" data-testid="textarea-fo-frame-notes" />
          </div>
        </div>
      </SectionCard>

      {/* ── Active Door ───────────────────────────────────────────────── */}
      <SectionCard title="Active Door" icon={DoorOpen}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Door Manufacturer" value={data.doorManufacturer} onChange={(v) => update("doorManufacturer", v)} />
            <Field label="Width" value={data.activeDoorWidth} onChange={(v) => update("activeDoorWidth", v)} placeholder='36"' />
            <Field label="Height" value={data.activeDoorHeight} onChange={(v) => update("activeDoorHeight", v)} placeholder='84"' />
            <Field label="Thickness" value={data.activeDoorThickness} onChange={(v) => update("activeDoorThickness", v)} placeholder='1-3/4"' />
            <Field label="Fire Rating" value={data.activeDoorFireRating} onChange={(v) => update("activeDoorFireRating", v)} placeholder="e.g. 90 min" />
            <Field label="Door Edge" value={data.activeDoorEdge} onChange={(v) => update("activeDoorEdge", v)} placeholder="e.g. Beveled" />
            <Field label="Core Type" value={data.activeCoreType} onChange={(v) => update("activeCoreType", v)} placeholder="e.g. Mineral" />
            <Field label="Species (Wood)" value={data.activeSpecies} onChange={(v) => update("activeSpecies", v)} placeholder="e.g. Red Oak" />
            <Field label="Stain / Color" value={data.activeStainColor} onChange={(v) => update("activeStainColor", v)} placeholder="e.g. Dark Walnut" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Glazing / Lite Cutout</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Cutout Width" value={data.activeCutoutWidth} onChange={(v) => update("activeCutoutWidth", v)} placeholder='W"' />
              <Field label="Cutout Height" value={data.activeCutoutHeight} onChange={(v) => update("activeCutoutHeight", v)} placeholder='H"' />
              <Field label="Cutout Gauge" value={data.activeCutoutGauge} onChange={(v) => update("activeCutoutGauge", v)} placeholder="Gauge" />
              <Field label="Glazing Type" value={data.activeGlazing} onChange={(v) => update("activeGlazing", v)} placeholder="e.g. Tempered" />
              <Field label="Visible Glass W×H" value={data.activeVisibleGlass} onChange={(v) => update("activeVisibleGlass", v)} placeholder='W×H"' />
              <Field label="Glazing Fire Rating" value={data.activeGlazingFireRating} onChange={(v) => update("activeGlazingFireRating", v)} placeholder="e.g. 20 min" />
              <Field label="Top Inward" value={data.activeTopInward} onChange={(v) => update("activeTopInward", v)} placeholder="Top inward dim" />
            </div>
            <div className="flex items-center gap-4 mt-3">
              <CheckField label="Visible Seam" checked={data.activeVisibleSeam} onChange={(v) => update("activeVisibleSeam", v)} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Inactive Door ─────────────────────────────────────────────── */}
      <SectionCard title="Inactive Door (Pair)" icon={DoorOpen} defaultOpen={data.hasInactiveDoor}>
        <div className="space-y-4">
          <CheckField label="This opening has an inactive door leaf (pair)" checked={data.hasInactiveDoor} onChange={(v) => update("hasInactiveDoor", v)} />
          {data.hasInactiveDoor && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Width" value={data.inactiveDoorWidth} onChange={(v) => update("inactiveDoorWidth", v)} placeholder='36"' />
                <Field label="Height" value={data.inactiveDoorHeight} onChange={(v) => update("inactiveDoorHeight", v)} placeholder='84"' />
                <Field label="Thickness" value={data.inactiveDoorThickness} onChange={(v) => update("inactiveDoorThickness", v)} placeholder='1-3/4"' />
                <Field label="Fire Rating" value={data.inactiveDoorFireRating} onChange={(v) => update("inactiveDoorFireRating", v)} placeholder="e.g. 90 min" />
                <Field label="Door Edge" value={data.inactiveDoorEdge} onChange={(v) => update("inactiveDoorEdge", v)} placeholder="e.g. Beveled" />
                <Field label="Core Type" value={data.inactiveCoreType} onChange={(v) => update("inactiveCoreType", v)} placeholder="e.g. Mineral" />
                <Field label="Species (Wood)" value={data.inactiveSpecies} onChange={(v) => update("inactiveSpecies", v)} placeholder="e.g. Red Oak" />
                <Field label="Stain / Color" value={data.inactiveStainColor} onChange={(v) => update("inactiveStainColor", v)} placeholder="e.g. Dark Walnut" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Inactive Door Glazing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Cutout Width" value={data.inactiveCutoutWidth} onChange={(v) => update("inactiveCutoutWidth", v)} placeholder='W"' />
                  <Field label="Cutout Height" value={data.inactiveCutoutHeight} onChange={(v) => update("inactiveCutoutHeight", v)} placeholder='H"' />
                  <Field label="Cutout Gauge" value={data.inactiveCutoutGauge} onChange={(v) => update("inactiveCutoutGauge", v)} placeholder="Gauge" />
                  <Field label="Glazing Type" value={data.inactiveGlazing} onChange={(v) => update("inactiveGlazing", v)} placeholder="e.g. Tempered" />
                  <Field label="Visible Glass W×H" value={data.inactiveVisibleGlass} onChange={(v) => update("inactiveVisibleGlass", v)} placeholder='W×H"' />
                  <Field label="Glazing Fire Rating" value={data.inactiveGlazingFireRating} onChange={(v) => update("inactiveGlazingFireRating", v)} placeholder="e.g. 20 min" />
                  <Field label="Top Inward" value={data.inactiveTopInward} onChange={(v) => update("inactiveTopInward", v)} placeholder="Top inward dim" />
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <CheckField label="Visible Seam" checked={data.inactiveVisibleSeam} onChange={(v) => update("inactiveVisibleSeam", v)} />
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* ── Hardware Dimensions (A–R) ──────────────────────────────────── */}
      <SectionCard title="Hardware Dimensions & Prep" icon={Wrench}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Hinge Stile Dimensions (A–D) — Distance from top of door
            </p>
            <DimGrid
              pairs={[["A — 1st Hinge", "dimA"], ["B — 2nd Hinge", "dimB"], ["C — 3rd Hinge", "dimC"], ["D — 4th Hinge", "dimD"]]}
              data={data}
              onChange={(field, val) => update(field, val)}
            />
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Lock Stile Dimensions (E–H) — Electrified Hardware Prep
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Door Closer Type" value={data.doorCloserType} onChange={(v) => update("doorCloserType", v)} placeholder="Surface / Concealed / LCN" />
              <Field label="Door Closer Model" value={data.doorCloserModel} onChange={(v) => update("doorCloserModel", v)} placeholder="e.g. LCN 4040XP" />
            </div>
            <div className="mt-3">
              <DimGrid
                pairs={[["E — Top of Door", "dimE"], ["F — Mid Point", "dimF"], ["G — Lock Center", "dimG"], ["H — Bottom", "dimH"]]}
                data={data}
                onChange={(field, val) => update(field, val)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Electrified Hardware (F)" value={data.electrifiedHardwareF} onChange={(v) => update("electrifiedHardwareF", v)} placeholder="Specify device" />
              <Field label="Electrified Hardware (D)" value={data.electrifiedHardwareD} onChange={(v) => update("electrifiedHardwareD", v)} placeholder="Specify device" />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Door Prep — Active (I, J) & Strike Prep
            </p>
            <DimGrid
              pairs={[["I — Lockset C/L", "dimI"], ["J — Strike C/L", "dimJ"]]}
              data={data}
              onChange={(field, val) => update(field, val)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Field label="Strike Prep / Type" value={data.strikePrepType} onChange={(v) => update("strikePrepType", v)} placeholder="e.g. ANSI T-Strike" />
              <Field label="Strike Location — Center" value={data.strikeLocation} onChange={(v) => update("strikeLocation", v)} placeholder='e.g. 44" from top' />
              <Field label="Strike Size" value={data.strikeSize} onChange={(v) => update("strikeSize", v)} placeholder="e.g. 4-7/8 x 1-1/4" />
              <Field label="Top of Frame to C/L of Strike" value={data.topOfFrameToStrike} onChange={(v) => update("topOfFrameToStrike", v)} placeholder='Distance"' />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Auto Flush Bolt / Fire Bolt (K, L, M, N, O, P, Q, R)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Auto Flush Bolt Model" value={data.autoFlushBoltModel} onChange={(v) => update("autoFlushBoltModel", v)} placeholder="Mfg & Model" />
              <Field label="Fire Bolt Model" value={data.fireBoltModel} onChange={(v) => update("fireBoltModel", v)} placeholder="Mfg & Model" />
            </div>
            <div className="mt-3">
              <DimGrid
                pairs={[
                  ["K — Top Bolt C/L", "dimK"], ["L — Latch C/L", "dimL"],
                  ["M — Handle C/L", "dimM"], ["N — Bottom Rail", "dimN"],
                  ["O — Top C/L", "dimO"], ["P — Strike C/L", "dimP"],
                  ["Q — Bottom C/L", "dimQ"], ["R — Bottom Rail", "dimR"],
                ]}
                data={data}
                onChange={(field, val) => update(field, val)}
              />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lock / Latch</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lockset Type</Label>
                <Select value={data.locksetType} onValueChange={(v) => update("locksetType", v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-fo-lockset-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cylindrical">Cylindrical</SelectItem>
                    <SelectItem value="mortise">Mortise</SelectItem>
                    <SelectItem value="exit_device">Exit Device</SelectItem>
                    <SelectItem value="deadbolt">Deadbolt Only</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Lockset Model" value={data.locksetModel} onChange={(v) => update("locksetModel", v)} placeholder="Mfg & Model" />
              <Field label="Lock Backset" value={data.lockBackset} onChange={(v) => update("lockBackset", v)} placeholder='2-3/4"' />
              <Field label="Deadbolt Model" value={data.deadboltModel} onChange={(v) => update("deadboltModel", v)} placeholder="Mfg & Model" />
              <Field label="Deadbolt Backset" value={data.deadboltBackset} onChange={(v) => update("deadboltBackset", v)} placeholder='2-3/4"' />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Door Handing</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Door Handing</Label>
                <Select value={data.doorHardingActive} onValueChange={(v) => update("doorHardingActive", v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-fo-handing-active">
                    <SelectValue placeholder="Select handing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LH">LH — Left Hand</SelectItem>
                    <SelectItem value="RH">RH — Right Hand</SelectItem>
                    <SelectItem value="LHR">LHR — Left Hand Reverse</SelectItem>
                    <SelectItem value="RHR">RHR — Right Hand Reverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inactive Door Handing</Label>
                <Select value={data.doorHardingInactive} onValueChange={(v) => update("doorHardingInactive", v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-fo-handing-inactive">
                    <SelectValue placeholder="Select handing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LH">LH — Left Hand</SelectItem>
                    <SelectItem value="RH">RH — Right Hand</SelectItem>
                    <SelectItem value="LHR">LHR — Left Hand Reverse</SelectItem>
                    <SelectItem value="RHR">RHR — Right Hand Reverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hardware Notes</Label>
            <Textarea value={data.hardwareNotes} onChange={(e) => update("hardwareNotes", e.target.value)} className="text-sm min-h-[50px]" data-testid="textarea-fo-hw-notes" />
          </div>
        </div>
      </SectionCard>

      {/* ── Finish & Protection ───────────────────────────────────────── */}
      <SectionCard title="Finish, Protection & Accessories" icon={Layers}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Finish" value={data.finish} onChange={(v) => update("finish", v)} placeholder="e.g. 628 Satin Aluminum" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kickplate / Mop Plate / Armor Plate</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width" value={data.kickplateWidth} onChange={(v) => update("kickplateWidth", v)} placeholder='Width"' />
              <Field label="Height" value={data.kickplateHeight} onChange={(v) => update("kickplateHeight", v)} placeholder='Height"' />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Astragal / Mullion / Edge Guard" value={data.astragalMullionEdgeGuard} onChange={(v) => update("astragalMullionEdgeGuard", v)} placeholder="Model & Type" />
            <Field label="Threshold Model & Size" value={data.thresholdModel} onChange={(v) => update("thresholdModel", v)} placeholder="Model & Size" />
            <Field label="Threshold Size" value={data.thresholdSize} onChange={(v) => update("thresholdSize", v)} placeholder="Dimensions" />
            <Field label="Sweeps / Shoes / Bottoms Model" value={data.sweepsModel} onChange={(v) => update("sweepsModel", v)} placeholder="Model & Type" />
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <CheckField label="Add Raceway" checked={data.addRaceway} onChange={(v) => update("addRaceway", v)} />
            <CheckField label="Automatic Door Operator / Coordinator" checked={data.autoDoorOperatorCoordinator} onChange={(v) => update("autoDoorOperatorCoordinator", v)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Door Notes</Label>
            <Textarea value={data.doorNotes} onChange={(e) => update("doorNotes", e.target.value)} className="text-sm min-h-[50px]" data-testid="textarea-fo-door-notes" />
          </div>
        </div>
      </SectionCard>

      {/* ── Manufacturer Summary ──────────────────────────────────────── */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <SplitSquareHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">Drawing Output:</span>
            </div>
            {sameMfr ? (
              <div className="space-y-1">
                <Badge variant="secondary">Combined Door + Frame Drawing</Badge>
                <p className="text-xs text-muted-foreground">
                  {data.doorManufacturer || data.frameManufacturer
                    ? `Manufacturer: ${data.doorManufacturer || data.frameManufacturer}`
                    : "Set door and/or frame manufacturer above to label the drawing"}
                </p>
              </div>
            ) : (
              <div className="flex gap-3 flex-wrap">
                <div className="space-y-1">
                  <Badge variant="outline">Door Drawing</Badge>
                  <p className="text-xs text-muted-foreground">{data.doorManufacturer}</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">Frame Drawing</Badge>
                  <p className="text-xs text-muted-foreground">{data.frameManufacturer}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
