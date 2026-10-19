import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, AlertTriangle, CheckCircle2, Info, Target, Ruler } from "lucide-react";

const APRILTAG_36H11_PATTERNS: Record<number, number[][]> = {
  0: [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,0,1,0,0,1],
    [1,0,0,1,1,0,1,0,0,1],
    [1,0,1,0,0,1,0,1,0,1],
    [1,0,0,1,0,1,1,0,0,1],
    [1,0,1,0,1,0,0,1,0,1],
    [1,0,0,0,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  1: [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,0,1,0,1,0,1],
    [1,0,1,0,1,1,0,0,0,1],
    [1,0,0,0,1,0,1,1,0,1],
    [1,0,1,1,0,0,1,0,0,1],
    [1,0,0,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  2: [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,0,0,1],
    [1,0,0,1,0,0,1,1,0,1],
    [1,0,1,1,0,1,0,0,0,1],
    [1,0,0,0,1,1,0,1,0,1],
    [1,0,1,0,0,0,1,1,0,1],
    [1,0,0,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  3: [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,1,0,1,0,1],
    [1,0,1,1,0,0,0,0,0,1],
    [1,0,0,1,0,1,1,0,0,1],
    [1,0,1,0,1,0,0,1,0,1],
    [1,0,0,0,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
};

function AprilTagSVG({ markerId, sizeMM }: { markerId: number; sizeMM: number }) {
  const pattern = APRILTAG_36H11_PATTERNS[markerId];
  if (!pattern) return null;

  const gridSize = 10;
  const cellSize = sizeMM / gridSize;
  const svgSize = sizeMM;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="border border-border"
        style={{ width: `${sizeMM}mm`, height: `${sizeMM}mm` }}
        data-testid={`svg-apriltag-${markerId}`}
      >
        {pattern.map((row, y) =>
          row.map((cell, x) => (
            <rect
              key={`${y}-${x}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill={cell === 1 ? "black" : "white"}
            />
          ))
        )}
      </svg>
      <span className="text-xs text-muted-foreground print:text-black">
        Tag ID: {markerId} | {sizeMM}mm
      </span>
    </div>
  );
}

interface PrintCalibrationMarkersProps {
  markerSizeMM?: number;
  children?: React.ReactNode;
}

export default function PrintCalibrationMarkers({ markerSizeMM = 75, children }: PrintCalibrationMarkersProps) {
  const [selectedSize, setSelectedSize] = useState(String(markerSizeMM));
  const [selectedCount, setSelectedCount] = useState("4");

  const handlePrint = () => {
    const printContent = document.getElementById("calibration-print-area");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const size = parseInt(selectedSize);
    const count = parseInt(selectedCount);
    const markerIds = Object.keys(APRILTAG_36H11_PATTERNS).slice(0, count).map(Number);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DoorSurvey Pro - Calibration Markers</title>
        <style>
          @page { margin: 15mm; }
          body { font-family: 'Inter', Arial, sans-serif; color: #111; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 10mm; padding-bottom: 5mm; border-bottom: 1px solid #ccc; }
          .header h1 { font-size: 18pt; margin: 0 0 3mm 0; }
          .header p { font-size: 10pt; color: #555; margin: 0; }
          .markers-grid { display: flex; flex-wrap: wrap; gap: 15mm; justify-content: center; margin: 10mm 0; }
          .marker-container { display: flex; flex-direction: column; align-items: center; gap: 2mm; page-break-inside: avoid; }
          .marker-label { font-size: 8pt; color: #333; text-align: center; }
          .marker-border { border: 2px solid #000; padding: 5mm; background: white; }
          .cut-guide { border: 1px dashed #999; padding: 3mm; }
          .guidelines { page-break-before: always; }
          .guidelines h2 { font-size: 14pt; margin: 0 0 5mm 0; }
          .guidelines h3 { font-size: 11pt; margin: 8mm 0 3mm 0; color: #333; }
          .guidelines ul { font-size: 10pt; line-height: 1.8; padding-left: 5mm; }
          .guidelines li { margin-bottom: 1mm; }
          .warning { background: #FFF3CD; border: 1px solid #FFECB5; padding: 3mm 5mm; border-radius: 2mm; font-size: 9pt; margin: 5mm 0; }
          .tip { background: #D1ECF1; border: 1px solid #BEE5EB; padding: 3mm 5mm; border-radius: 2mm; font-size: 9pt; margin: 5mm 0; }
          .spec-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 5mm 0; }
          .spec-table th, .spec-table td { border: 1px solid #ccc; padding: 2mm 3mm; text-align: left; }
          .spec-table th { background: #f5f5f5; font-weight: 600; }
          svg rect { shape-rendering: crispEdges; }
          .footer { margin-top: 10mm; padding-top: 5mm; border-top: 1px solid #ccc; font-size: 8pt; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Calibration Marker Sheet</h1>
          <p>AprilTag 36h11 Family | ${size}mm markers | DoorSurvey Pro</p>
        </div>

        <div class="markers-grid">
          ${markerIds.map(id => {
            const pattern = APRILTAG_36H11_PATTERNS[id];
            const cellSize = size / 10;
            const cells = pattern.map((row, y) =>
              row.map((cell, x) =>
                `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${cell === 1 ? 'black' : 'white'}"/>`
              ).join('')
            ).join('');
            return `
              <div class="marker-container">
                <div class="cut-guide">
                  <div class="marker-border">
                    <svg width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                      ${cells}
                    </svg>
                  </div>
                </div>
                <div class="marker-label">Tag ID: ${id} | Size: ${size}mm x ${size}mm</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="guidelines">
          <h2>Printing & Usage Guidelines</h2>

          <div class="warning">
            <strong>Important:</strong> Print accuracy is critical for calibration quality. Incorrect marker sizes will produce measurement errors in your LiDAR scans.
          </div>

          <h3>Paper & Printer Requirements</h3>
          <ul>
            <li><strong>Use matte paper only</strong> — glossy or semi-gloss paper causes reflections that interfere with marker detection by the camera and LiDAR sensor</li>
            <li><strong>Standard weight paper (80-120 gsm)</strong> — thicker cardstock (160+ gsm) is ideal for durability but not required</li>
            <li><strong>White paper only</strong> — off-white, cream, or colored paper reduces contrast and detection reliability</li>
            <li><strong>Laser printer preferred</strong> — produces sharper edges than inkjet; if using inkjet, select "Best" or "High Quality" print mode</li>
            <li><strong>Print at 100% scale</strong> — do NOT use "Fit to Page" or "Scale to Fit" as this will resize the markers and invalidate calibration</li>
          </ul>

          <h3>Print Settings Checklist</h3>
          <table class="spec-table">
            <tr><th>Setting</th><th>Required Value</th><th>Why</th></tr>
            <tr><td>Scale / Zoom</td><td>100% (Actual Size)</td><td>Markers must be exactly ${size}mm for accurate calibration</td></tr>
            <tr><td>Paper Type</td><td>Matte / Plain</td><td>Glossy surfaces reflect LiDAR and camera light</td></tr>
            <tr><td>Color Mode</td><td>Black & White</td><td>Maximum contrast for reliable detection</td></tr>
            <tr><td>Quality</td><td>High / Best</td><td>Sharp edges improve detection accuracy</td></tr>
            <tr><td>Orientation</td><td>Portrait</td><td>Markers are laid out for portrait orientation</td></tr>
          </table>

          <div class="tip">
            <strong>Tip:</strong> After printing, measure a marker with a ruler to verify it is exactly ${size}mm. If it is off by more than 1mm, check your printer scaling settings.
          </div>

          <h3>Marker Placement on Door Frame</h3>
          <ul>
            <li>Place <strong>at least 3 markers</strong> on the door frame — one near the top, one in the middle, and one near the bottom</li>
            <li>Attach markers <strong>flat against the frame surface</strong> — any curling or wrinkling reduces accuracy</li>
            <li>Use <strong>painter's tape or removable adhesive</strong> to avoid damaging the frame finish</li>
            <li>Ensure markers are <strong>fully visible and unobstructed</strong> during the LiDAR scan</li>
            <li>Keep markers at least <strong>50mm from frame edges</strong> to ensure the full marker is captured</li>
            <li>All markers should be oriented the <strong>same direction</strong> (do not rotate individual markers)</li>
            <li>Avoid placing markers where <strong>shadows or direct sunlight</strong> fall — even lighting produces the best results</li>
          </ul>

          <h3>Storage & Reuse</h3>
          <ul>
            <li>Laminate markers with a <strong>matte lamination</strong> for repeated field use — do NOT use glossy lamination</li>
            <li>Store flat in a folder or rigid sleeve — creased or bent markers will not detect properly</li>
            <li>Replace markers if they become <strong>stained, faded, or wrinkled</strong></li>
            <li>Consider mounting on thin rigid board (foamcore or chipboard) for best flatness in the field</li>
          </ul>

          <h3>Troubleshooting</h3>
          <ul>
            <li><strong>Markers not detected?</strong> — Ensure adequate lighting and that markers are flat, clean, and at least 50mm from edges</li>
            <li><strong>Low calibration score?</strong> — Verify marker size with a ruler; reprint if off by more than 1mm</li>
            <li><strong>Partial calibration?</strong> — Add more markers (minimum 3 recommended, 4 ideal) and ensure even spacing</li>
            <li><strong>Scan too far from frame?</strong> — Keep device within 1-2 meters of the door frame during scanning</li>
          </ul>
        </div>

        <div class="footer">
          Generated by DoorSurvey Pro | AprilTag 36h11 Family | ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const size = parseInt(selectedSize);
  const count = parseInt(selectedCount);
  const markerIds = Object.keys(APRILTAG_36H11_PATTERNS).slice(0, count).map(Number);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" data-testid="button-print-markers">
            <Printer className="h-4 w-4 mr-1" />
            Print Markers
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Calibration Marker Sheet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Marker Size</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger data-testid="select-marker-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50mm (Small)</SelectItem>
                  <SelectItem value="75">75mm (Standard)</SelectItem>
                  <SelectItem value="100">100mm (Large)</SelectItem>
                  <SelectItem value="150">150mm (Extra Large)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Markers to Print</label>
              <Select value={selectedCount} onValueChange={setSelectedCount}>
                <SelectTrigger data-testid="select-marker-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Markers</SelectItem>
                  <SelectItem value="3">3 Markers</SelectItem>
                  <SelectItem value="4">4 Markers (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div id="calibration-print-area">
            <div className="flex flex-wrap gap-4 justify-center p-4 rounded-md bg-muted/30">
              {markerIds.map((id) => (
                <AprilTagSVG key={id} markerId={id} sizeMM={size} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Printing Requirements
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong>Matte paper only</strong> — glossy or semi-gloss paper causes reflections that interfere with marker detection</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong>Print at 100% scale</strong> — do not use "Fit to Page" or the marker dimensions will be wrong</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong>Laser printer preferred</strong> — sharper edges than inkjet; use "Best Quality" if inkjet</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong>White paper, 80-160 gsm</strong> — colored or thin paper reduces detection reliability</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong>Black & white mode</strong> — maximum contrast for reliable detection</span>
              </div>
            </div>

            <h3 className="text-sm font-medium flex items-center gap-2 pt-2">
              <Ruler className="h-4 w-4" />
              Placement
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>Place at least 3 markers on the door frame — top, middle, and bottom</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>Tape flat against the frame surface using painter's tape</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>Keep markers 50mm from edges, all facing the same direction</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>For reuse, laminate with matte lamination (not glossy)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Badge variant="secondary" data-testid="badge-marker-family">AprilTag 36h11</Badge>
            <Button onClick={handlePrint} data-testid="button-print-sheet">
              <Printer className="h-4 w-4 mr-2" />
              Print Marker Sheet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
