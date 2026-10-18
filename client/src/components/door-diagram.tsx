import type { DoorOpening } from "@shared/schema";

interface DoorDiagramProps {
  opening: DoorOpening;
}

function safeParseFloat(value: string | null | undefined, defaultValue: number): number {
  if (!value || value.trim() === "") return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function safeParseInt(value: string | null | undefined, defaultValue: number): number {
  if (!value || value.trim() === "") return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function DoorDiagram({ opening }: DoorDiagramProps) {
  const doorWidth = safeParseFloat(opening.doorWidth, 36);
  const doorHeight = safeParseFloat(opening.doorHeight, 80);
  const frameDepth = safeParseFloat(opening.frameDepth, 4.75);
  const hingeCount = safeParseInt(opening.hingeCount, 3);
  
  const sideliteLeft = opening.sideliteLeft === "yes";
  const sideliteRight = opening.sideliteRight === "yes";
  const sideliteLeftWidth = safeParseFloat(opening.sideliteLeftWidth, 12);
  const sideliteRightWidth = safeParseFloat(opening.sideliteRightWidth, 12);
  
  const transomPresent = opening.transomPresent === "yes";
  const transomHeight = safeParseFloat(opening.transomHeight, 12);
  
  const visionLitePresent = opening.visionLitePresent === "yes";
  const visionLiteWidth = safeParseFloat(opening.visionLiteWidth, 12);
  const visionLiteHeight = safeParseFloat(opening.visionLiteHeight, 24);
  const visionLiteLocation = opening.visionLiteLocation || "center";

  const scale = 4;
  const offsetX = 100;
  const offsetY = 100;

  const totalWidth = (sideliteLeft ? sideliteLeftWidth : 0) + doorWidth + (sideliteRight ? sideliteRightWidth : 0);
  const transomWidth = safeParseFloat(opening.transomWidth, totalWidth);
  const totalHeight = doorHeight + (transomPresent ? transomHeight : 0);
  
  const viewBoxWidth = totalWidth * scale + offsetX * 2;
  const viewBoxHeight = totalHeight * scale + offsetY * 2 + 100;

  const standardLockCenterline = 38;
  const hingeEdgeOffset = 2;

  const getHingePositions = () => {
    if (hingeCount === 2) {
      return [7, doorHeight - 11];
    } else if (hingeCount === 3) {
      return [7, doorHeight / 2, doorHeight - 11];
    } else if (hingeCount === 4) {
      return [7, doorHeight / 3, (2 * doorHeight) / 3, doorHeight - 11];
    }
    return [7, doorHeight / 2, doorHeight - 11];
  };

  const hingePositions = getHingePositions();

  const getVisionLiteY = () => {
    if (visionLiteLocation === "top") {
      return 12;
    } else if (visionLiteLocation === "bottom") {
      return doorHeight - visionLiteHeight - 12;
    } else {
      return (doorHeight - visionLiteHeight) / 2;
    }
  };

  let currentX = offsetX;
  if (sideliteLeft) {
    currentX += sideliteLeftWidth * scale;
  }
  const doorX = currentX;
  const doorY = offsetY + (transomPresent ? transomHeight * scale : 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full max-w-4xl mx-auto"
        style={{ minWidth: "400px" }}
      >
        <defs>
          <pattern id="glassPattern" patternUnits="userSpaceOnUse" width="20" height="20">
            <line x1="0" y1="0" x2="20" y2="20" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.3" />
            <line x1="20" y1="0" x2="0" y2="20" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))" />
          </marker>
        </defs>

        {sideliteLeft && (
          <g>
            <rect
              x={offsetX}
              y={doorY}
              width={sideliteLeftWidth * scale}
              height={doorHeight * scale}
              fill="url(#glassPattern)"
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
            />
            <text
              x={offsetX + (sideliteLeftWidth * scale) / 2}
              y={doorY - 10}
              textAnchor="middle"
              fontSize="12"
              fill="hsl(var(--foreground))"
              fontFamily="JetBrains Mono, monospace"
            >
              {sideliteLeftWidth}"
            </text>
            <text
              x={offsetX + (sideliteLeftWidth * scale) / 2}
              y={doorY + (doorHeight * scale) / 2}
              textAnchor="middle"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
            >
              Left Sidelite
            </text>
            {opening.sideliteGlassType && (
              <text
                x={offsetX + (sideliteLeftWidth * scale) / 2}
                y={doorY + (doorHeight * scale) / 2 + 15}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {opening.sideliteGlassType}
              </text>
            )}
          </g>
        )}

        {sideliteRight && (
          <g>
            <rect
              x={doorX + doorWidth * scale}
              y={doorY}
              width={sideliteRightWidth * scale}
              height={doorHeight * scale}
              fill="url(#glassPattern)"
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
            />
            <text
              x={doorX + doorWidth * scale + (sideliteRightWidth * scale) / 2}
              y={doorY - 10}
              textAnchor="middle"
              fontSize="12"
              fill="hsl(var(--foreground))"
              fontFamily="JetBrains Mono, monospace"
            >
              {sideliteRightWidth}"
            </text>
            <text
              x={doorX + doorWidth * scale + (sideliteRightWidth * scale) / 2}
              y={doorY + (doorHeight * scale) / 2}
              textAnchor="middle"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
            >
              Right Sidelite
            </text>
            {opening.sideliteGlassType && (
              <text
                x={doorX + doorWidth * scale + (sideliteRightWidth * scale) / 2}
                y={doorY + (doorHeight * scale) / 2 + 15}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {opening.sideliteGlassType}
              </text>
            )}
          </g>
        )}

        {transomPresent && (() => {
          const transomX = offsetX + (totalWidth - transomWidth) * scale / 2;
          return (
            <g>
              <rect
                x={transomX}
                y={offsetY}
                width={transomWidth * scale}
                height={transomHeight * scale}
                fill="url(#glassPattern)"
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
              />
              <text
                x={transomX + (transomWidth * scale) / 2}
                y={offsetY + (transomHeight * scale) / 2}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--muted-foreground))"
              >
                Transom {transomHeight}" × {transomWidth}"
              </text>
              {opening.transomGlassType && (
                <text
                  x={transomX + (transomWidth * scale) / 2}
                  y={offsetY + (transomHeight * scale) / 2 + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  {opening.transomGlassType}
                </text>
              )}
            </g>
          );
        })()}

        <g>
          <rect
            x={doorX}
            y={doorY}
            width={doorWidth * scale}
            height={doorHeight * scale}
            fill="hsl(var(--card))"
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
          />

          {visionLitePresent && (
            <g>
              <rect
                x={doorX + (doorWidth - visionLiteWidth) * scale / 2}
                y={doorY + getVisionLiteY() * scale}
                width={visionLiteWidth * scale}
                height={visionLiteHeight * scale}
                fill="url(#glassPattern)"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.5"
              />
              <text
                x={doorX + (doorWidth * scale) / 2}
                y={doorY + (getVisionLiteY() + visionLiteHeight / 2) * scale}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {visionLiteWidth}" × {visionLiteHeight}"
              </text>
              {opening.visionLiteGlassType && (
                <text
                  x={doorX + (doorWidth * scale) / 2}
                  y={doorY + (getVisionLiteY() + visionLiteHeight / 2) * scale + 12}
                  textAnchor="middle"
                  fontSize="8"
                  fill="hsl(var(--muted-foreground))"
                >
                  {opening.visionLiteGlassType}
                </text>
              )}
            </g>
          )}

          {hingePositions.map((pos, idx) => (
            <g key={idx}>
              <rect
                x={doorX + hingeEdgeOffset * scale}
                y={doorY + pos * scale - 2}
                width="8"
                height="4"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="0.5"
              />
              <circle
                cx={doorX + hingeEdgeOffset * scale + 4}
                cy={doorY + pos * scale}
                r="1.5"
                fill="hsl(var(--background))"
              />
            </g>
          ))}

          {opening.lockType && (
            <g>
              <circle
                cx={doorX + (doorWidth - 2.75) * scale}
                cy={doorY + standardLockCenterline * scale}
                r="6"
                fill="hsl(var(--accent))"
                stroke="hsl(var(--accent-foreground))"
                strokeWidth="1"
              />
              <line
                x1={doorX + (doorWidth - 2.75) * scale - 3}
                y1={doorY + standardLockCenterline * scale}
                x2={doorX + (doorWidth - 2.75) * scale + 3}
                y2={doorY + standardLockCenterline * scale}
                stroke="hsl(var(--accent-foreground))"
                strokeWidth="1"
              />
              <line
                x1={doorX + (doorWidth - 2.75) * scale}
                y1={doorY + standardLockCenterline * scale - 3}
                x2={doorX + (doorWidth - 2.75) * scale}
                y2={doorY + standardLockCenterline * scale + 3}
                stroke="hsl(var(--accent-foreground))"
                strokeWidth="1"
              />
              <text
                x={doorX + (doorWidth - 2.75) * scale + 15}
                y={doorY + standardLockCenterline * scale + 3}
                fontSize="9"
                fill="hsl(var(--foreground))"
                fontFamily="JetBrains Mono, monospace"
              >
                {standardLockCenterline}" CL
              </text>
            </g>
          )}

          <line
            x1={doorX - 30}
            y1={doorY}
            x2={doorX - 30}
            y2={doorY + doorHeight * scale}
            stroke="hsl(var(--foreground))"
            strokeWidth="1"
            markerStart="url(#arrowhead)"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={doorX - 40}
            y={doorY + (doorHeight * scale) / 2}
            textAnchor="middle"
            fontSize="14"
            fill="hsl(var(--foreground))"
            fontFamily="JetBrains Mono, monospace"
            transform={`rotate(-90, ${doorX - 40}, ${doorY + (doorHeight * scale) / 2})`}
          >
            {doorHeight}"
          </text>

          <line
            x1={doorX}
            y1={doorY + doorHeight * scale + 20}
            x2={doorX + doorWidth * scale}
            y2={doorY + doorHeight * scale + 20}
            stroke="hsl(var(--foreground))"
            strokeWidth="1"
            markerStart="url(#arrowhead)"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={doorX + (doorWidth * scale) / 2}
            y={doorY + doorHeight * scale + 35}
            textAnchor="middle"
            fontSize="14"
            fill="hsl(var(--foreground))"
            fontFamily="JetBrains Mono, monospace"
          >
            {doorWidth}"
          </text>
        </g>

        <text
          x={viewBoxWidth / 2}
          y={viewBoxHeight - 40}
          textAnchor="middle"
          fontSize="12"
          fill="hsl(var(--muted-foreground))"
        >
          {opening.doorType || "Door"} - {opening.doorMaterial || "Material Not Specified"}
        </text>
        {opening.frameDepth && (
          <text
            x={viewBoxWidth / 2}
            y={viewBoxHeight - 20}
            textAnchor="middle"
            fontSize="10"
            fill="hsl(var(--muted-foreground))"
          >
            Frame Depth: {opening.frameDepth}"
          </text>
        )}
      </svg>
    </div>
  );
}
