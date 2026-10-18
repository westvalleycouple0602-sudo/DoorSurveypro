import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Eye,
  Crosshair,
  DoorOpen,
  RectangleHorizontal,
  Wrench,
  FileText,
} from "lucide-react";
import type { Annotation } from "./photo-annotator";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  ELEMENT_TYPE_LABELS,
} from "./photo-annotator";
import type { ElementStatus, ElementType } from "./photo-annotator";

interface AnnotatedPhotoExportProps {
  photoUrl: string;
  photoName: string;
  annotations: Annotation[];
  openingNumber?: string;
  openingLocation?: string;
  projectName?: string;
}

const ELEMENT_TYPE_ICONS: Record<ElementType, typeof Wrench> = {
  hardware: Wrench,
  door: DoorOpen,
  frame: RectangleHorizontal,
};

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function AnnotatedPhotoExport({
  photoUrl,
  photoName,
  annotations,
  openingNumber,
  openingLocation,
  projectName,
}: AnnotatedPhotoExportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const elementHighlights = annotations.filter(
    (a) => a.type === "element-highlight"
  );

  const statusSummary: Record<ElementStatus, { count: number; items: Annotation[] }> = {
    replaced: { count: 0, items: [] },
    reinstalled: { count: 0, items: [] },
    untouched: { count: 0, items: [] },
    integrated: { count: 0, items: [] },
  };

  elementHighlights.forEach((a) => {
    if (a.elementStatus) {
      statusSummary[a.elementStatus].count++;
      statusSummary[a.elementStatus].items.push(a);
    }
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maxWidth = 800;
      const aspectRatio = img.height / img.width;
      const width = Math.min(img.width, maxWidth);
      const height = width * aspectRatio;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      const scaleX = width / img.width;
      const scaleY = height / img.height;

      annotations.forEach((annotation) => {
        ctx.save();
        ctx.scale(scaleX, scaleY);

        if (annotation.type === "element-highlight" && annotation.points.length >= 2) {
          const [start, end] = annotation.points;
          const w = end.x - start.x;
          const h = end.y - start.y;
          const statusColor = annotation.elementStatus
            ? STATUS_COLORS[annotation.elementStatus]
            : annotation.color;

          ctx.globalAlpha = 0.15;
          ctx.fillStyle = statusColor;
          ctx.fillRect(start.x, start.y, w, h);
          ctx.globalAlpha = 1;

          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.rect(start.x, start.y, w, h);
          ctx.stroke();
          ctx.setLineDash([]);

          const cornerSize = 12;
          ctx.lineWidth = 3;
          [
            { x: start.x, y: start.y, dx: 1, dy: 1 },
            { x: start.x + w, y: start.y, dx: -1, dy: 1 },
            { x: start.x, y: start.y + h, dx: 1, dy: -1 },
            { x: start.x + w, y: start.y + h, dx: -1, dy: -1 },
          ].forEach((c) => {
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + c.dy * cornerSize);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(c.x + c.dx * cornerSize, c.y);
            ctx.stroke();
          });

          const badgeText = annotation.elementType
            ? ELEMENT_TYPE_LABELS[annotation.elementType]
            : "Element";
          const statusText = annotation.elementStatus
            ? STATUS_LABELS[annotation.elementStatus]
            : "";
          ctx.font = "bold 11px Inter, sans-serif";
          const fullText = statusText ? `${badgeText} - ${statusText}` : badgeText;
          const tw = ctx.measureText(fullText).width;
          const bw = tw + 12;
          const bh = 18;

          ctx.fillStyle = statusColor;
          drawRoundRect(ctx, start.x, start.y - bh - 2, bw, bh, 3);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(fullText, start.x + 6, start.y - bh / 2 - 2);

          if (annotation.callout) {
            const callout = annotation.callout;
            const cx = start.x + w + 10;
            const cy = start.y;
            const lineH = 14;
            const padding = 8;
            const lines: string[] = [];
            if (callout.title) lines.push(callout.title);
            if (callout.manufacturer && callout.model)
              lines.push(`${callout.manufacturer} ${callout.model}`);
            else if (callout.manufacturer) lines.push(callout.manufacturer);
            else if (callout.model) lines.push(callout.model);
            if (callout.description) {
              const desc = callout.description.length > 45 ? callout.description.substring(0, 42) + "..." : callout.description;
              lines.push(desc);
            }
            if (callout.notes) {
              const note = callout.notes.length > 45 ? callout.notes.substring(0, 42) + "..." : callout.notes;
              lines.push(note);
            }

            const calloutH = lines.length * lineH + padding * 2;
            let calloutW = 0;
            ctx.font = "12px Inter, sans-serif";
            lines.forEach((l) => {
              const lw = ctx.measureText(l).width;
              if (lw > calloutW) calloutW = lw;
            });
            calloutW = Math.min(calloutW + padding * 2, 220);

            ctx.globalAlpha = 0.92;
            ctx.fillStyle = "#1a1a2e";
            drawRoundRect(ctx, cx, cy, calloutW, calloutH, 4);
            ctx.fill();
            ctx.strokeStyle = statusColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.strokeStyle = statusColor;
            ctx.lineWidth = 1.5;
            ctx.moveTo(start.x + w, start.y + Math.min(h / 2, 20));
            ctx.lineTo(cx, cy + calloutH / 2);
            ctx.stroke();

            lines.forEach((line, i) => {
              ctx.font = i === 0 ? "bold 12px Inter, sans-serif" : "11px Inter, sans-serif";
              ctx.fillStyle = i === 0 ? "#FFFFFF" : "#d1d5db";
              ctx.textAlign = "left";
              ctx.textBaseline = "top";
              ctx.fillText(line, cx + padding, cy + padding + i * lineH, calloutW - padding * 2);
            });
          }
        } else if (annotation.type === "measurement" && annotation.points.length >= 2) {
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
          ctx.lineTo(annotation.points[1].x, annotation.points[1].y);
          ctx.stroke();
        } else if (annotation.type === "rectangle" && annotation.points.length >= 2) {
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(
            annotation.points[0].x,
            annotation.points[0].y,
            annotation.points[1].x - annotation.points[0].x,
            annotation.points[1].y - annotation.points[0].y
          );
          ctx.stroke();
        }

        ctx.restore();
      });

      setCanvasReady(true);
    };
    img.src = photoUrl;
  }, [photoUrl, annotations]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `annotated-${photoName || "photo"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Card data-testid="card-annotated-export">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          Annotated View
        </CardTitle>
        <div className="flex items-center gap-2">
          {projectName && (
            <span className="text-xs text-muted-foreground">{projectName}</span>
          )}
          {openingNumber && (
            <Badge variant="secondary" className="text-xs">
              {openingNumber}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!canvasReady}
            data-testid="button-download-annotated"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md overflow-hidden border bg-muted">
          <canvas
            ref={canvasRef}
            className="w-full h-auto"
            data-testid="canvas-annotated-export"
          />
        </div>

        {elementHighlights.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Scope of Work Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(statusSummary) as [ElementStatus, { count: number; items: Annotation[] }][]).map(
                  ([status, { count }]) =>
                    count > 0 ? (
                      <div
                        key={status}
                        className="flex items-center gap-2 rounded-md border p-2"
                        data-testid={`summary-${status}`}
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[status] }}
                        />
                        <div>
                          <p className="text-xs font-medium">{STATUS_LABELS[status]}</p>
                          <p className="text-xs text-muted-foreground">
                            {count} item{count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    ) : null
                )}
              </div>

              <div className="space-y-2">
                {elementHighlights.map((highlight, idx) => {
                  const Icon = highlight.elementType
                    ? ELEMENT_TYPE_ICONS[highlight.elementType]
                    : Crosshair;
                  return (
                    <div
                      key={highlight.id}
                      className="flex items-start gap-3 rounded-md border p-3"
                      data-testid={`highlight-detail-${idx}`}
                    >
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: highlight.elementStatus ? STATUS_COLORS[highlight.elementStatus] + "20" : "#f3f4f6" }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color: highlight.elementStatus ? STATUS_COLORS[highlight.elementStatus] : "#6b7280" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {highlight.callout?.title ||
                              (highlight.elementType ? ELEMENT_TYPE_LABELS[highlight.elementType] : "Element")}
                          </p>
                          {highlight.elementStatus && (
                            <Badge
                              className="text-white border-0 text-xs"
                              style={{ backgroundColor: STATUS_COLORS[highlight.elementStatus] }}
                            >
                              {STATUS_LABELS[highlight.elementStatus]}
                            </Badge>
                          )}
                        </div>
                        {highlight.callout?.manufacturer && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {highlight.callout.manufacturer}
                            {highlight.callout.model ? ` ${highlight.callout.model}` : ""}
                          </p>
                        )}
                        {highlight.callout?.description && (
                          <p className="text-xs text-muted-foreground">
                            {highlight.callout.description}
                          </p>
                        )}
                        {highlight.callout?.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {highlight.callout.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t flex-wrap">
          <span className="font-medium">Legend:</span>
          {(Object.entries(STATUS_COLORS) as [ElementStatus, string][]).map(([status, clr]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: clr }} />
              <span>{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
