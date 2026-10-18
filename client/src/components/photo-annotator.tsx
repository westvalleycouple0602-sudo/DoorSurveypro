import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Ruler,
  Type,
  ArrowRight,
  Square,
  Circle,
  Pencil,
  Shield,
  Trash2,
  Save,
  Undo,
  ZoomIn,
  ZoomOut,
  Move,
  Crosshair,
  DoorOpen,
  RectangleHorizontal,
  Wrench,
} from "lucide-react";

export type ElementType = "hardware" | "door" | "frame";
export type ElementStatus = "replaced" | "reinstalled" | "untouched" | "integrated";

export const STATUS_COLORS: Record<ElementStatus, string> = {
  replaced: "#f97316",
  reinstalled: "#3b82f6",
  untouched: "#22c55e",
  integrated: "#8b5cf6",
};

export const STATUS_LABELS: Record<ElementStatus, string> = {
  replaced: "Replace",
  reinstalled: "Reinstall",
  untouched: "Untouched",
  integrated: "Integrate",
};

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  hardware: "Hardware",
  door: "Door",
  frame: "Frame",
};

export const SEVERITY_COLORS: Record<string, string> = {
  pass: "#22c55e",
  warning: "#f59e0b",
  violation: "#ef4444",
};

export interface CalloutInfo {
  title: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  notes?: string;
  hardwareItemId?: string;
}

export interface Annotation {
  id: string;
  type: "measurement" | "text" | "arrow" | "rectangle" | "circle" | "freehand" | "compliance" | "element-highlight";
  points: { x: number; y: number }[];
  text?: string;
  measurement?: number;
  unit?: string;
  color: string;
  lineWidth: number;
  complianceStandard?: "NFPA 80" | "ADA" | "IBC" | "NFPA 101";
  complianceSeverity?: "pass" | "warning" | "violation";
  elementType?: ElementType;
  elementStatus?: ElementStatus;
  callout?: CalloutInfo;
}

export interface HardwareItemRef {
  id: string;
  itemType: string;
  manufacturer?: string | null;
  model?: string | null;
  description: string;
  condition?: string | null;
  finish?: string | null;
}

interface PhotoAnnotatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl: string;
  existingAnnotations?: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  pixelsPerInch?: number;
  hardwareItems?: HardwareItemRef[];
  doorInfo?: { doorType?: string | null; doorMaterial?: string | null; doorWidth?: string | null; doorHeight?: string | null };
  frameInfo?: { frameType?: string | null; frameMaterial?: string | null; frameWidth?: string | null; frameDepth?: string | null };
}

export function PhotoAnnotator({
  open,
  onOpenChange,
  photoUrl,
  existingAnnotations = [],
  onSave,
  pixelsPerInch = 96,
  hardwareItems = [],
  doorInfo,
  frameInfo,
}: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [currentTool, setCurrentTool] = useState<Annotation["type"]>("measurement");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState("#FF0000");
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingTextAnnotation, setPendingTextAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [showComplianceInput, setShowComplianceInput] = useState(false);
  const [pendingComplianceAnnotation, setPendingComplianceAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<"NFPA 80" | "ADA" | "IBC" | "NFPA 101">("NFPA 80");
  const [selectedSeverity, setSelectedSeverity] = useState<"pass" | "warning" | "violation">("warning");
  const [complianceNote, setComplianceNote] = useState("");
  const [showElementInput, setShowElementInput] = useState(false);
  const [pendingElementAnnotation, setPendingElementAnnotation] = useState<{ points: { x: number; y: number }[] } | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<ElementType>("hardware");
  const [selectedElementStatus, setSelectedElementStatus] = useState<ElementStatus>("replaced");
  const [selectedHardwareItemId, setSelectedHardwareItemId] = useState<string>("");
  const [calloutTitle, setCalloutTitle] = useState("");
  const [calloutNotes, setCalloutNotes] = useState("");

  useEffect(() => {
    setAnnotations(existingAnnotations);
  }, [existingAnnotations]);

  useEffect(() => {
    if (open && photoUrl) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setImageLoaded(true);
        fitImageToCanvas(img);
      };
      img.src = photoUrl;
    } else {
      setImageLoaded(false);
      setImage(null);
    }
  }, [open, photoUrl]);

  useEffect(() => {
    if (imageLoaded && image) {
      drawCanvas();
    }
  }, [imageLoaded, image, annotations, scale, offset, currentPoints, isDrawing]);

  const fitImageToCanvas = (img: HTMLImageElement) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight - 100;
    
    const scaleX = containerWidth / img.width;
    const scaleY = containerHeight / img.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    
    setScale(newScale);
    setOffset({
      x: (containerWidth - img.width * newScale) / 2,
      y: (containerHeight - img.height * newScale) / 2,
    });
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation);
    });

    if (isDrawing && currentPoints.length > 0) {
      const tempAnnotation: Annotation = {
        id: "temp",
        type: currentTool,
        points: currentPoints,
        color,
        lineWidth: 2,
      };
      drawAnnotation(ctx, tempAnnotation);
    }
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = annotation.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const points = annotation.points;

    if (annotation.type === "measurement" && points.length >= 2) {
      const [start, end] = points;
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const totalInches = Math.round(distance / pixelsPerInch);
      const feet = Math.floor(totalInches / 12);
      const remainingInches = totalInches % 12;
      
      const measurementText = feet > 0 
        ? `${feet}' ${remainingInches}"`
        : `${remainingInches}"`;

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      ctx.font = "bold 16px Inter";
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      ctx.strokeText(measurementText, midX, midY - 10);
      ctx.fillStyle = annotation.color;
      ctx.fillText(measurementText, midX, midY - 10);

      drawArrowHead(ctx, start, end, annotation.color);
      drawArrowHead(ctx, end, start, annotation.color);
    } else if (annotation.type === "arrow" && points.length >= 2) {
      const [start, end] = points;
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      drawArrowHead(ctx, start, end, annotation.color);
    } else if (annotation.type === "rectangle" && points.length >= 2) {
      const [start, end] = points;
      const width = end.x - start.x;
      const height = end.y - start.y;
      
      ctx.beginPath();
      ctx.rect(start.x, start.y, width, height);
      ctx.stroke();
    } else if (annotation.type === "circle" && points.length >= 2) {
      const [center, edge] = points;
      const radius = Math.sqrt(
        Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
      );
      
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (annotation.type === "freehand" && points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    } else if (annotation.type === "compliance" && points.length >= 1) {
      const [position] = points;
      const severityColors: Record<string, string> = {
        pass: "#22c55e",
        warning: "#f59e0b",
        violation: "#ef4444",
      };
      const markerColor = severityColors[annotation.complianceSeverity || "warning"];

      ctx.beginPath();
      ctx.arc(position.x, position.y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = markerColor;
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const icon = annotation.complianceSeverity === "pass" ? "\u2713" : annotation.complianceSeverity === "violation" ? "!" : "?";
      ctx.fillText(icon, position.x, position.y);

      const label = annotation.complianceStandard || "CODE";
      ctx.font = "bold 12px Inter";
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.strokeText(label, position.x + 18, position.y - 8);
      ctx.fillStyle = markerColor;
      ctx.fillText(label, position.x + 18, position.y - 8);

      if (annotation.text) {
        ctx.font = "11px Inter";
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeText(annotation.text, position.x + 18, position.y + 6);
        ctx.fillStyle = markerColor;
        ctx.fillText(annotation.text, position.x + 18, position.y + 6);
      }
    } else if (annotation.type === "element-highlight" && points.length >= 2) {
      const [start, end] = points;
      const width = end.x - start.x;
      const height = end.y - start.y;
      const statusColor = annotation.elementStatus ? STATUS_COLORS[annotation.elementStatus] : annotation.color;

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = statusColor;
      ctx.fillRect(start.x, start.y, width, height);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.rect(start.x, start.y, width, height);
      ctx.stroke();
      ctx.setLineDash([]);

      const cornerSize = 12;
      ctx.lineWidth = 3;
      const corners = [
        { x: start.x, y: start.y, dx: 1, dy: 1 },
        { x: start.x + width, y: start.y, dx: -1, dy: 1 },
        { x: start.x, y: start.y + height, dx: 1, dy: -1 },
        { x: start.x + width, y: start.y + height, dx: -1, dy: -1 },
      ];
      corners.forEach(c => {
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

      ctx.font = "bold 11px Inter";
      const badgeFullText = statusText ? `${badgeText} - ${statusText}` : badgeText;
      const textWidth = ctx.measureText(badgeFullText).width;
      const badgePadX = 6;
      const badgePadY = 3;
      const badgeH = 18;
      const badgeW = textWidth + badgePadX * 2;

      ctx.fillStyle = statusColor;
      const badgeRadius = 3;
      const bx = start.x;
      const by = start.y - badgeH - 2;
      ctx.beginPath();
      ctx.moveTo(bx + badgeRadius, by);
      ctx.lineTo(bx + badgeW - badgeRadius, by);
      ctx.quadraticCurveTo(bx + badgeW, by, bx + badgeW, by + badgeRadius);
      ctx.lineTo(bx + badgeW, by + badgeH - badgeRadius);
      ctx.quadraticCurveTo(bx + badgeW, by + badgeH, bx + badgeW - badgeRadius, by + badgeH);
      ctx.lineTo(bx + badgeRadius, by + badgeH);
      ctx.quadraticCurveTo(bx, by + badgeH, bx, by + badgeH - badgeRadius);
      ctx.lineTo(bx, by + badgeRadius);
      ctx.quadraticCurveTo(bx, by, bx + badgeRadius, by);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeFullText, bx + badgePadX, by + badgeH / 2);

      if (annotation.callout) {
        const callout = annotation.callout;
        const calloutX = start.x + width + 10;
        const calloutY = start.y;
        const maxCalloutW = 220;
        const lineH = 14;
        const calloutPadding = 8;

        const lines: string[] = [];
        if (callout.title) lines.push(callout.title);
        if (callout.manufacturer && callout.model) lines.push(`${callout.manufacturer} ${callout.model}`);
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

        const calloutH = lines.length * lineH + calloutPadding * 2;
        let calloutW = 0;
        ctx.font = "12px Inter";
        lines.forEach(l => {
          const w = ctx.measureText(l).width;
          if (w > calloutW) calloutW = w;
        });
        calloutW = Math.min(calloutW + calloutPadding * 2, maxCalloutW);

        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "#1a1a2e";
        ctx.beginPath();
        const cr = 4;
        ctx.moveTo(calloutX + cr, calloutY);
        ctx.lineTo(calloutX + calloutW - cr, calloutY);
        ctx.quadraticCurveTo(calloutX + calloutW, calloutY, calloutX + calloutW, calloutY + cr);
        ctx.lineTo(calloutX + calloutW, calloutY + calloutH - cr);
        ctx.quadraticCurveTo(calloutX + calloutW, calloutY + calloutH, calloutX + calloutW - cr, calloutY + calloutH);
        ctx.lineTo(calloutX + cr, calloutY + calloutH);
        ctx.quadraticCurveTo(calloutX, calloutY + calloutH, calloutX, calloutY + calloutH - cr);
        ctx.lineTo(calloutX, calloutY + cr);
        ctx.quadraticCurveTo(calloutX, calloutY, calloutX + cr, calloutY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 1.5;
        ctx.moveTo(start.x + width, start.y + Math.min(height / 2, 20));
        ctx.lineTo(calloutX, calloutY + calloutH / 2);
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        lines.forEach((line, i) => {
          ctx.font = i === 0 ? "bold 12px Inter" : "11px Inter";
          ctx.fillStyle = i === 0 ? "#FFFFFF" : "#d1d5db";
          ctx.fillText(line, calloutX + calloutPadding, calloutY + calloutPadding + i * lineH, calloutW - calloutPadding * 2);
        });
      }
    } else if (annotation.type === "text" && points.length >= 1) {
      const [position] = points;
      
      ctx.font = "bold 20px Inter";
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      if (annotation.text) {
        ctx.strokeText(annotation.text, position.x, position.y);
        ctx.fillStyle = annotation.color;
        ctx.fillText(annotation.text, position.x, position.y);
      }
    }

    ctx.restore();
  };

  const drawArrowHead = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string
  ) => {
    const headLength = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    
    if (currentTool === "text") {
      setPendingTextAnnotation(coords);
      setShowTextInput(true);
      return;
    }

    if (currentTool === "compliance") {
      setPendingComplianceAnnotation(coords);
      setShowComplianceInput(true);
      return;
    }

    if (currentTool === "element-highlight") {
      setIsDrawing(true);
      setCurrentPoints([coords]);
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([coords]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    
    if (currentTool === "freehand") {
      setCurrentPoints([...currentPoints, coords]);
    } else if (currentTool === "measurement" || currentTool === "arrow" || 
        currentTool === "rectangle" || currentTool === "circle" || currentTool === "element-highlight") {
      setCurrentPoints([currentPoints[0], coords]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      return;
    }

    if (currentTool === "element-highlight") {
      setPendingElementAnnotation({ points: [...currentPoints] });
      setShowElementInput(true);
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: currentTool,
      points: currentPoints,
      color,
      lineWidth: 2,
    };

    setAnnotations([...annotations, newAnnotation]);
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleAddCompliance = () => {
    if (!pendingComplianceAnnotation) return;
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: "compliance",
      points: [pendingComplianceAnnotation],
      text: complianceNote || undefined,
      color: selectedSeverity === "pass" ? "#22c55e" : selectedSeverity === "violation" ? "#ef4444" : "#f59e0b",
      lineWidth: 2,
      complianceStandard: selectedStandard,
      complianceSeverity: selectedSeverity,
    };
    setAnnotations([...annotations, newAnnotation]);
    setComplianceNote("");
    setShowComplianceInput(false);
    setPendingComplianceAnnotation(null);
  };

  const handleAddText = () => {
    if (!textInput.trim() || !pendingTextAnnotation) return;

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: "text",
      points: [pendingTextAnnotation],
      text: textInput,
      color,
      lineWidth: 2,
    };

    setAnnotations([...annotations, newAnnotation]);
    setTextInput("");
    setShowTextInput(false);
    setPendingTextAnnotation(null);
  };

  const handleAddElement = () => {
    if (!pendingElementAnnotation) return;
    const statusColor = STATUS_COLORS[selectedElementStatus];
    let callout: CalloutInfo | undefined;

    if (selectedElementType === "hardware" && selectedHardwareItemId) {
      const hwItem = hardwareItems.find(h => h.id === selectedHardwareItemId);
      if (hwItem) {
        callout = {
          title: calloutTitle || hwItem.description,
          manufacturer: hwItem.manufacturer || undefined,
          model: hwItem.model || undefined,
          description: hwItem.description,
          notes: calloutNotes || undefined,
          hardwareItemId: hwItem.id,
        };
      }
    } else if (selectedElementType === "door" && doorInfo) {
      callout = {
        title: calloutTitle || `Door - ${doorInfo.doorType || "Unknown"}`,
        description: [doorInfo.doorMaterial, doorInfo.doorWidth && doorInfo.doorHeight ? `${doorInfo.doorWidth} x ${doorInfo.doorHeight}` : null].filter(Boolean).join(" | ") || undefined,
        notes: calloutNotes || undefined,
      };
    } else if (selectedElementType === "frame" && frameInfo) {
      callout = {
        title: calloutTitle || `Frame - ${frameInfo.frameType || "Unknown"}`,
        description: [frameInfo.frameMaterial, frameInfo.frameWidth && frameInfo.frameDepth ? `${frameInfo.frameWidth} x ${frameInfo.frameDepth}` : null].filter(Boolean).join(" | ") || undefined,
        notes: calloutNotes || undefined,
      };
    }

    if (!callout && calloutTitle) {
      callout = {
        title: calloutTitle,
        notes: calloutNotes || undefined,
      };
    }

    const [p0, p1] = pendingElementAnnotation.points;
    const normalizedPoints = [
      { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
      { x: Math.max(p0.x, p1.x), y: Math.max(p0.y, p1.y) },
    ];

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: "element-highlight",
      points: normalizedPoints,
      color: statusColor,
      lineWidth: 3,
      elementType: selectedElementType,
      elementStatus: selectedElementStatus,
      callout,
    };

    setAnnotations([...annotations, newAnnotation]);
    setShowElementInput(false);
    setPendingElementAnnotation(null);
    setCalloutTitle("");
    setCalloutNotes("");
    setSelectedHardwareItemId("");
  };

  const cancelElementInput = () => {
    setShowElementInput(false);
    setPendingElementAnnotation(null);
    setCalloutTitle("");
    setCalloutNotes("");
    setSelectedHardwareItemId("");
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.1));
  };

  const handleUndo = () => {
    if (annotations.length > 0) {
      setAnnotations(annotations.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAnnotations([]);
  };

  const handleSave = () => {
    onSave(annotations);
    onOpenChange(false);
  };

  const handleReset = () => {
    if (image) {
      fitImageToCanvas(image);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Annotate Photo
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pb-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Tabs value={currentTool} onValueChange={(v) => setCurrentTool(v as Annotation["type"])}>
                <TabsList>
                  <TabsTrigger value="measurement" data-testid="tool-measurement">
                    <Ruler className="h-4 w-4 mr-1" />
                    Measure
                  </TabsTrigger>
                  <TabsTrigger value="text" data-testid="tool-text">
                    <Type className="h-4 w-4 mr-1" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="arrow" data-testid="tool-arrow">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Arrow
                  </TabsTrigger>
                  <TabsTrigger value="rectangle" data-testid="tool-rectangle">
                    <Square className="h-4 w-4 mr-1" />
                    Box
                  </TabsTrigger>
                  <TabsTrigger value="circle" data-testid="tool-circle">
                    <Circle className="h-4 w-4 mr-1" />
                    Circle
                  </TabsTrigger>
                  <TabsTrigger value="freehand" data-testid="tool-freehand">
                    <Pencil className="h-4 w-4 mr-1" />
                    Draw
                  </TabsTrigger>
                  <TabsTrigger value="compliance" data-testid="tool-compliance">
                    <Shield className="h-4 w-4 mr-1" />
                    Flag
                  </TabsTrigger>
                  <TabsTrigger value="element-highlight" data-testid="tool-element-highlight">
                    <Crosshair className="h-4 w-4 mr-1" />
                    Highlight
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Separator orientation="vertical" className="h-8" />

              <div className="flex items-center gap-2">
                <Label htmlFor="color-picker" className="text-sm">Color:</Label>
                <Input
                  id="color-picker"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-8 p-1 cursor-pointer"
                  data-testid="input-color"
                />
              </div>

              <Separator orientation="vertical" className="h-8" />

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  data-testid="button-reset-view"
                >
                  <Move className="h-4 w-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8" />

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={annotations.length === 0}
                  data-testid="button-undo"
                >
                  <Undo className="h-4 w-4 mr-1" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={annotations.length === 0}
                  data-testid="button-clear"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              <Badge variant="secondary" className="ml-auto">
                {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {showComplianceInput && (
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedStandard} onValueChange={(v) => setSelectedStandard(v as any)}>
                  <SelectTrigger className="w-[130px]" data-testid="select-compliance-standard">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NFPA 80">NFPA 80</SelectItem>
                    <SelectItem value="ADA">ADA</SelectItem>
                    <SelectItem value="IBC">IBC</SelectItem>
                    <SelectItem value="NFPA 101">NFPA 101</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSeverity} onValueChange={(v) => setSelectedSeverity(v as any)}>
                  <SelectTrigger className="w-[120px]" data-testid="select-compliance-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="violation">Violation</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Note (optional)..."
                  value={complianceNote}
                  onChange={(e) => setComplianceNote(e.target.value)}
                  className="flex-1 min-w-[150px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCompliance();
                    else if (e.key === "Escape") {
                      setShowComplianceInput(false);
                      setComplianceNote("");
                      setPendingComplianceAnnotation(null);
                    }
                  }}
                  data-testid="input-compliance-note"
                />
                <Button onClick={handleAddCompliance} data-testid="button-add-compliance">
                  Place Flag
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowComplianceInput(false);
                    setComplianceNote("");
                    setPendingComplianceAnnotation(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {showTextInput && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter text annotation..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddText();
                    } else if (e.key === "Escape") {
                      setShowTextInput(false);
                      setTextInput("");
                      setPendingTextAnnotation(null);
                    }
                  }}
                  autoFocus
                  data-testid="input-text-annotation"
                />
                <Button
                  onClick={handleAddText}
                  disabled={!textInput.trim()}
                  data-testid="button-add-text"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTextInput(false);
                    setTextInput("");
                    setPendingTextAnnotation(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {currentTool === "element-highlight" && !showElementInput && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                <Crosshair className="h-4 w-4 shrink-0" />
                <span>Draw a rectangle around the hardware, door, or frame you want to highlight</span>
                <div className="flex gap-1 ml-auto shrink-0">
                  {(Object.entries(STATUS_COLORS) as [ElementStatus, string][]).map(([status, clr]) => (
                    <div key={status} className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: clr }} />
                      <span className="text-xs">{STATUS_LABELS[status]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showElementInput && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Crosshair className="h-4 w-4" />
                  Configure Element Highlight
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Element Type</Label>
                    <Select value={selectedElementType} onValueChange={(v) => {
                      setSelectedElementType(v as ElementType);
                      setSelectedHardwareItemId("");
                    }}>
                      <SelectTrigger data-testid="select-element-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hardware">
                          <span className="flex items-center gap-2"><Wrench className="h-3 w-3" /> Hardware</span>
                        </SelectItem>
                        <SelectItem value="door">
                          <span className="flex items-center gap-2"><DoorOpen className="h-3 w-3" /> Door</span>
                        </SelectItem>
                        <SelectItem value="frame">
                          <span className="flex items-center gap-2"><RectangleHorizontal className="h-3 w-3" /> Frame</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={selectedElementStatus} onValueChange={(v) => setSelectedElementStatus(v as ElementStatus)}>
                      <SelectTrigger data-testid="select-element-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_LABELS) as [ElementStatus, string][]).map(([status, label]) => (
                          <SelectItem key={status} value={status}>
                            <span className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedElementType === "hardware" && hardwareItems.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Link Hardware Item</Label>
                    <Select value={selectedHardwareItemId} onValueChange={setSelectedHardwareItemId}>
                      <SelectTrigger data-testid="select-hardware-item">
                        <SelectValue placeholder="Select hardware item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hardwareItems.map(hw => (
                          <SelectItem key={hw.id} value={hw.id}>
                            <span className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">{hw.itemType}</Badge>
                              {hw.manufacturer ? `${hw.manufacturer} ` : ""}{hw.description.substring(0, 40)}{hw.description.length > 40 ? "..." : ""}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Callout Title</Label>
                  <Input
                    placeholder={
                      selectedElementType === "hardware" && selectedHardwareItemId
                        ? hardwareItems.find(h => h.id === selectedHardwareItemId)?.description || "Title..."
                        : selectedElementType === "door" ? (doorInfo?.doorType || "Door") + " - " + (doorInfo?.doorMaterial || "")
                        : selectedElementType === "frame" ? (frameInfo?.frameType || "Frame") + " - " + (frameInfo?.frameMaterial || "")
                        : "Enter title..."
                    }
                    value={calloutTitle}
                    onChange={(e) => setCalloutTitle(e.target.value)}
                    data-testid="input-callout-title"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes (for technicians/proposals)</Label>
                  <Textarea
                    placeholder="Installation notes, special instructions..."
                    value={calloutNotes}
                    onChange={(e) => setCalloutNotes(e.target.value)}
                    className="resize-none text-sm"
                    rows={2}
                    data-testid="input-callout-notes"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={cancelElementInput}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddElement} data-testid="button-add-element">
                    <Crosshair className="h-3 w-3 mr-1" />
                    Add Highlight
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div
            ref={containerRef}
            className="flex-1 bg-muted relative overflow-hidden"
          >
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-muted-foreground">Loading image...</div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setIsDrawing(false);
                setIsPanning(false);
              }}
              style={{ cursor: isPanning ? "grabbing" : "crosshair" }}
            />
          </div>
        </div>

        <DialogFooter className="p-4 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-annotations">
            <Save className="h-4 w-4 mr-2" />
            Save Annotations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
