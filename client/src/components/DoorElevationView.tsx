import { memo, useCallback, useMemo } from "react";
import type {
  DoorElevationOverlay,
  OverlayStatus,
  DoorElevationOverlayHardwareMarker
} from "../types/doorElevationOverlay";

type Props = {
  overlay: DoorElevationOverlay;
  className?: string;
  onMarkerClick?: (marker: DoorElevationOverlayHardwareMarker) => void;
};

const STATUS_COLORS: Record<OverlayStatus, { fill: string; className: string }> = {
  pass: { fill: "hsl(142, 76%, 36%)", className: "text-green-600 dark:text-green-400" },
  violation: { fill: "hsl(0, 84%, 60%)", className: "text-red-600 dark:text-red-400" },
  unknown: { fill: "hsl(220, 9%, 46%)", className: "text-slate-500 dark:text-slate-400" }
};

const STATUS_LABEL: Record<OverlayStatus, string> = {
  pass: "Pass",
  violation: "Violation",
  unknown: "Unknown"
};

const VIEW_BOX_WIDTH = 100;
const VIEW_BOX_HEIGHT = 220;
const DOOR_INSET_X = 13;
const DOOR_INSET_Y = 13;
const DOOR_WIDTH = VIEW_BOX_WIDTH - 26;
const DOOR_HEIGHT = VIEW_BOX_HEIGHT - 26;
const FALLBACK_X = VIEW_BOX_WIDTH * 0.7;
const FALLBACK_SPACING = 12;

const SHORT_TYPE_MAP: Record<string, string> = {
  lever: "LV",
  lockset: "LV",
  panic_device: "PD",
  fire_exit_device: "PD",
  door_viewer: "DV",
  threshold: "TH",
  door_closer: "CL",
  auto_operator_actuator_plate: "AP",
};

function getShortType(type: string): string {
  return SHORT_TYPE_MAP[type] ?? type.slice(0, 2).toUpperCase();
}

export const DoorElevationView: React.FC<Props> = memo(function DoorElevationView({
  overlay,
  className,
  onMarkerClick
}) {
  const markerPositions = useMemo(() => 
    overlay.markers.map((marker, index) => {
      const bbox = marker.bboxDoorSpace;
      const fallbackY = 24 + index * FALLBACK_SPACING;

      const cx = bbox && typeof bbox.x === "number"
        ? DOOR_INSET_X + bbox.x * DOOR_WIDTH + (bbox.width ?? 0) * DOOR_WIDTH * 0.5
        : FALLBACK_X;

      const cy = bbox && typeof bbox.y === "number"
        ? DOOR_INSET_Y + bbox.y * DOOR_HEIGHT + (bbox.height ?? 0) * DOOR_HEIGHT * 0.5
        : fallbackY;

      const label = `${marker.type}: ${STATUS_LABEL[marker.status]}${
        marker.violations.length > 0 ? `, ${marker.violations.length} violation(s)` : ""
      }`;

      return { marker, index, cx, cy, label };
    }),
    [overlay.markers]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent, marker: DoorElevationOverlayHardwareMarker) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onMarkerClick?.(marker);
    }
  }, [onMarkerClick]);

  return (
    <div 
      className={className ?? "flex flex-col gap-3"} 
      data-testid="door-elevation-view"
      role="figure"
      aria-label={`Door elevation view for opening ${overlay.openingId} with ${overlay.markers.length} hardware markers`}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-primary font-semibold">
            DoorSurvey Pro – LiDAR View
          </span>
          <span className="font-medium text-foreground">
            Opening <span className="font-semibold">#{overlay.openingId}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" role="legend" aria-label="Status legend">
          <LegendItem status="pass" />
          <LegendItem status="violation" />
          <LegendItem status="unknown" />
        </div>
      </div>

      <div className="border border-border rounded-xl bg-muted/50 p-4 shadow-sm">
        <svg
          viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
          className="w-full h-auto block"
          data-testid="door-elevation-svg"
          role="img"
          aria-label="Door elevation diagram showing hardware positions and compliance status"
        >
          <defs>
            <linearGradient id="doorFrameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className="[stop-color:hsl(var(--muted))]" />
              <stop offset="100%" className="[stop-color:hsl(var(--border))]" />
            </linearGradient>
          </defs>

          <rect
            x={8}
            y={8}
            width={VIEW_BOX_WIDTH - 16}
            height={VIEW_BOX_HEIGHT - 16}
            rx={3}
            ry={3}
            className="fill-muted stroke-border"
            strokeWidth={1.2}
          />

          <rect
            x={DOOR_INSET_X}
            y={DOOR_INSET_Y}
            width={DOOR_WIDTH}
            height={DOOR_HEIGHT}
            rx={2}
            ry={2}
            className="fill-background stroke-border"
            strokeWidth={0.9}
          />

          <rect
            x={DOOR_INSET_X}
            y={DOOR_INSET_Y}
            width={2}
            height={DOOR_HEIGHT}
            className="fill-primary/25"
          />

          {markerPositions.map(({ marker, index, cx, cy, label }) => {
            const statusColor = STATUS_COLORS[marker.status];

            return (
              <g
                key={marker.hardwareId ?? `${marker.type}-${index}`}
                onClick={() => onMarkerClick?.(marker)}
                onKeyDown={(e) => handleKeyDown(e, marker)}
                style={{ cursor: onMarkerClick ? "pointer" : "default" }}
                data-testid={`marker-${marker.hardwareId ?? marker.type}-${index}`}
                role={onMarkerClick ? "button" : "img"}
                tabIndex={onMarkerClick ? 0 : undefined}
                aria-label={label}
              >
                {marker.status === "violation" && (
                  <circle cx={cx} cy={cy} r={6} fill={statusColor.fill} opacity={0.15} />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={marker.status === "violation" ? 4 : 3}
                  fill={statusColor.fill}
                  className="stroke-foreground/40"
                  strokeWidth={0.4}
                />

                <text
                  x={cx + 4}
                  y={cy + 1.5}
                  fontSize={3}
                  className="fill-foreground"
                  style={{ userSelect: "none" }}
                  aria-hidden="true"
                >
                  {getShortType(marker.type)}
                </text>

                <title>{label}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});

const LegendItem = memo(function LegendItem({ status }: { status: OverlayStatus }) {
  return (
    <div 
      className="flex items-center gap-1" 
      data-testid={`legend-${status}`}
      aria-label={`${STATUS_LABEL[status]} status indicator`}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[status].fill }}
        aria-hidden="true"
      />
      <span className={STATUS_COLORS[status].className}>{STATUS_LABEL[status]}</span>
    </div>
  );
});

export default DoorElevationView;
