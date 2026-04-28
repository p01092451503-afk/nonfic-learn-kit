import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  /** Stroke color (any valid CSS color, including hsl(var(--...))) */
  color?: string;
  /** Whether to fill the area beneath the line */
  area?: boolean;
  width?: number;
  height?: number;
  /** Show a small dot at the last data point */
  showLastDot?: boolean;
  strokeWidth?: number;
}

/**
 * Dependency-free SVG sparkline.
 * Renders a tiny trend line + optional area fill from a numeric series.
 * Uses viewBox so it scales fluidly inside any container.
 */
export const Sparkline = ({
  data,
  className,
  color = "hsl(var(--primary))",
  area = true,
  width = 100,
  height = 28,
  showLastDot = true,
  strokeWidth = 1.5,
}: SparklineProps) => {
  const { linePath, areaPath, lastPoint, isFlat } = useMemo(() => {
    if (!data || data.length === 0) {
      return { linePath: "", areaPath: "", lastPoint: null as null | { x: number; y: number }, isFlat: true };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    // Pad the y-axis so flat lines don't sit on the edge
    const padY = 3;
    const innerH = height - padY * 2;

    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return { x, y };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    const areaPath =
      points.length > 1
        ? `${linePath} L${points[points.length - 1].x.toFixed(2)},${height} L0,${height} Z`
        : "";

    return {
      linePath,
      areaPath,
      lastPoint: points[points.length - 1],
      isFlat: max === min,
    };
  }, [data, width, height]);

  if (!data || data.length === 0) return null;

  // Stable id for gradient (color + length is enough; collisions are visually identical)
  const gradId = `spark-grad-${Math.abs(
    color.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  )}-${data.length}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("block w-full h-7 overflow-visible", className)}
      aria-hidden="true"
    >
      {area && !isFlat && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLastDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2}
          fill={color}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
};

export default Sparkline;