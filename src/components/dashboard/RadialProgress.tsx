import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface Props {
  value: number; // 0-100
  label?: string;
  sublabel?: string;
  color?: string;
  size?: number;
}

/** Donut-style progress ring with centered value. */
export const RadialProgress = ({
  value,
  label,
  sublabel,
  color = "hsl(var(--primary))",
  size = 160,
}: Props) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const data = [{ name: "v", value: v, fill: color }];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <RadialBarChart innerRadius="78%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={12} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums text-foreground leading-none">{v}<span className="text-base text-muted-foreground">%</span></span>
        {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
        {sublabel && <span className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
};

export default RadialProgress;