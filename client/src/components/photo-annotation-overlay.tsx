import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Pencil, Crosshair } from "lucide-react";
import type { Annotation } from "./photo-annotator";
import { STATUS_COLORS, STATUS_LABELS, ELEMENT_TYPE_LABELS, SEVERITY_COLORS } from "./photo-annotator";
import type { ElementStatus } from "./photo-annotator";

interface PhotoAnnotationOverlayProps {
  photoUrl: string;
  annotations: Annotation[];
  className?: string;
  showIndicators?: boolean;
}

export function PhotoAnnotationOverlay({
  photoUrl,
  annotations,
  className = "",
  showIndicators = true,
}: PhotoAnnotationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!annotations || annotations.length === 0) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      canvas.width = containerWidth;
      canvas.height = containerHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scaleX = containerWidth / img.width;
      const scaleY = containerHeight / img.height;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (containerWidth - img.width * scale) / 2;
      const offsetY = (containerHeight - img.height * scale) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      annotations.forEach((annotation) => {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        ctx.strokeStyle = annotation.color;
        ctx.fillStyle = annotation.color;
        ctx.lineWidth = annotation.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const points = annotation.points;

        if (annotation.type === "measurement" && points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
        } else if (annotation.type === "arrow" && points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
        } else if (annotation.type === "rectangle" && points.length >= 2) {
          ctx.beginPath();
          ctx.rect(
            points[0].x,
            points[0].y,
            points[1].x - points[0].x,
            points[1].y - points[0].y
          );
          ctx.stroke();
        } else if (annotation.type === "circle" && points.length >= 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) +
              Math.pow(points[1].y - points[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (annotation.type === "freehand" && points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        } else if (annotation.type === "compliance" && points.length >= 1) {
          const pos = points[0];
          const markerColor =
            SEVERITY_COLORS[annotation.complianceSeverity || "warning"];

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
          ctx.fillStyle = markerColor;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (annotation.type === "element-highlight" && points.length >= 2) {
          const [start, end] = points;
          const width = end.x - start.x;
          const height = end.y - start.y;
          const statusColor = annotation.elementStatus ? STATUS_COLORS[annotation.elementStatus] : annotation.color;

          ctx.globalAlpha = 0.2;
          ctx.fillStyle = statusColor;
          ctx.fillRect(start.x, start.y, width, height);
          ctx.globalAlpha = 1;

          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.rect(start.x, start.y, width, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      });
    };
    img.src = photoUrl;
  }, [photoUrl, annotations]);

  const complianceFlags = annotations.filter((a) => a.type === "compliance");
  const violationCount = complianceFlags.filter(
    (a) => a.complianceSeverity === "violation"
  ).length;
  const warningCount = complianceFlags.filter(
    (a) => a.complianceSeverity === "warning"
  ).length;
  const passCount = complianceFlags.filter(
    (a) => a.complianceSeverity === "pass"
  ).length;
  const elementHighlights = annotations.filter((a) => a.type === "element-highlight");
  const drawingCount = annotations.filter(
    (a) => a.type !== "compliance" && a.type !== "element-highlight"
  ).length;

  const statusCounts: Partial<Record<ElementStatus, number>> = {};
  elementHighlights.forEach(a => {
    if (a.elementStatus) {
      statusCounts[a.elementStatus] = (statusCounts[a.elementStatus] || 0) + 1;
    }
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {annotations.length > 0 && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          data-testid="canvas-annotation-overlay"
        />
      )}

      {showIndicators && annotations.length > 0 && (
        <div className="absolute bottom-2 right-2 flex gap-1 z-20 flex-wrap" data-testid="annotation-indicators">
          {drawingCount > 0 && (
            <Badge variant="secondary" className="bg-background/90 text-foreground border text-xs">
              <Pencil className="h-3 w-3 mr-1" />
              {drawingCount}
            </Badge>
          )}
          {(Object.entries(statusCounts) as [ElementStatus, number][]).map(([status, count]) => (
            <Badge
              key={status}
              className="text-white border-0 text-xs"
              style={{ backgroundColor: STATUS_COLORS[status] + "e6" }}
              data-testid={`badge-status-${status}`}
            >
              <Crosshair className="h-3 w-3 mr-1" />
              {count} {STATUS_LABELS[status]}
            </Badge>
          ))}
          {violationCount > 0 && (
            <Badge className="bg-red-500/90 text-white border-0 text-xs" data-testid="badge-violations">
              <Shield className="h-3 w-3 mr-1" />
              {violationCount}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-amber-500/90 text-white border-0 text-xs" data-testid="badge-warnings">
              <Shield className="h-3 w-3 mr-1" />
              {warningCount}
            </Badge>
          )}
          {passCount > 0 && (
            <Badge className="bg-green-500/90 text-white border-0 text-xs" data-testid="badge-passes">
              <Shield className="h-3 w-3 mr-1" />
              {passCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
