import { useId } from "react";
import type { Inputs } from "../model";

export function SectionDrawing({
  inputs,
  section = 2,
  water,
  natural,
  compact = false,
}: {
  inputs: Inputs;
  section?: number;
  water?: number;
  natural?: number;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const points = inputs.sections[section].points,
    b = inputs.bridge;
  const minX = points[0].station,
    maxX = points[points.length - 1].station;
  const minZ = Math.min(...points.map((p) => p.elevation)) - 0.5;
  const maxZ = Math.max(
    b.deck + 1,
    ...points.map((p) => p.elevation),
    water ?? -Infinity,
  );
  const width = 920,
    height = compact ? 280 : 390;
  const x = (n: number) => 55 + ((n - minX) / Math.max(1, maxX - minX)) * 810;
  const y = (n: number) =>
    height - 42 - ((n - minZ) / Math.max(1, maxZ - minZ)) * (height - 85);
  const ground = points
    .map((p) => `${x(p.station)},${y(p.elevation)}`)
    .join(" ");
  const land = `${ground} 865,${height - 42} 55,${height - 42}`;
  const left = x(b.left),
    right = x(b.right),
    soffit = y(b.soffit),
    deck = y(b.deck);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${inputs.sections[section].name} cross-section in metres${water !== undefined ? `, water level ${water.toFixed(3)} metres` : ""}`}
      className="section-drawing"
    >
      <defs>
        <pattern
          id={`${id}hatch`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="7"
            stroke="var(--drawing-hatch)"
            strokeWidth="1"
          />
        </pattern>
        <clipPath id={`${id}air`}>
          <polygon
            points={`55,20 865,20 ${[...points]
              .reverse()
              .map((p) => `${x(p.station)},${y(p.elevation)}`)
              .join(" ")}`}
          />
        </clipPath>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const z = minZ + ((maxZ - minZ) * i) / 4;
        return (
          <g key={i}>
            <line
              x1="55"
              x2="865"
              y1={y(z)}
              y2={y(z)}
              stroke="var(--drawing-grid)"
              strokeDasharray="3 5"
            />
            <text x="42" y={y(z) + 4} textAnchor="end" className="axis-label">
              {z.toFixed(1)}
            </text>
          </g>
        );
      })}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const s = minX + ((maxX - minX) * i) / 6;
        return (
          <g key={i}>
            <line
              x1={x(s)}
              x2={x(s)}
              y1="35"
              y2={height - 42}
              stroke="var(--drawing-grid)"
            />
            <text
              x={x(s)}
              y={height - 21}
              textAnchor="middle"
              className="axis-label"
            >
              {s.toFixed(1)}
            </text>
          </g>
        );
      })}
      <text x="14" y="20" className="axis-label">
        RL · m
      </text>
      <text x="865" y={height - 3} textAnchor="end" className="axis-label">
        Station · m
      </text>
      {water !== undefined && (
        <g clipPath={`url(#${id}air)`}>
          <rect
            x="55"
            y={y(water)}
            width="810"
            height={Math.max(0, height - y(water) - 42)}
            fill="var(--drawing-water)"
            fillOpacity="0.18"
          />
          <line
            x1="55"
            x2="865"
            y1={y(water)}
            y2={y(water)}
            stroke="var(--drawing-water)"
            strokeWidth="2"
          />
        </g>
      )}
      {natural !== undefined && (
        <line
          clipPath={`url(#${id}air)`}
          x1="55"
          x2="865"
          y1={y(natural)}
          y2={y(natural)}
          stroke="var(--muted)"
          strokeDasharray="7 5"
          strokeWidth="1.5"
        />
      )}
      <polygon points={land} fill="var(--drawing-ground)" />
      <polygon points={land} fill={`url(#${id}hatch)`} />
      <polyline
        points={ground}
        fill="none"
        stroke="var(--drawing-outline)"
        strokeWidth="2"
      />
      {(section === 1 || section === 2) && (
        <>
          <rect
            x={left - 18}
            y={deck}
            width={Math.max(1, right - left + 36)}
            height={Math.max(1, soffit - deck)}
            fill="var(--drawing-structure)"
          />
          <rect
            x={left - 11}
            y={soffit}
            width="11"
            height={Math.max(1, height - 42 - soffit)}
            fill="var(--drawing-pier)"
          />
          <rect
            x={right}
            y={soffit}
            width="11"
            height={Math.max(1, height - 42 - soffit)}
            fill="var(--drawing-pier)"
          />
          {b.piers.map((p, i) => (
            <rect
              key={i}
              x={x(p.station - p.width / 2)}
              y={soffit}
              width={Math.max(
                2,
                x(p.station + p.width / 2) - x(p.station - p.width / 2),
              )}
              height={Math.max(1, height - 42 - soffit)}
              fill="var(--drawing-pier)"
            />
          ))}
          <line
            x1={left}
            x2={right}
            y1={deck - 20}
            y2={deck - 20}
            stroke="var(--drawing-outline)"
          />
          <path
            d={`M${left},${deck - 24}v8 M${right},${deck - 24}v8`}
            stroke="var(--drawing-outline)"
          />
          <text
            x={(left + right) / 2}
            y={deck - 28}
            textAnchor="middle"
            className="drawing-note"
          >
            {(b.right - b.left).toFixed(2)} m opening
          </text>
          <text x={right + 22} y={soffit + 4} className="drawing-note">
            Soffit {b.soffit.toFixed(2)}
          </text>
        </>
      )}
    </svg>
  );
}
