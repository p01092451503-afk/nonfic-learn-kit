import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const MemberStatsCard = () => {
  const { data: roleCounts = [] } = useQuery({
    queryKey: ["stat-role-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((r: any) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      const labels: Record<string, string> = {
        student: "학습자",
        teacher: "강사",
        admin: "관리자",
        super_admin: "슈퍼관리자",
      };
      return Object.entries(counts).map(([role, count]) => ({
        name: labels[role] || role,
        value: count,
      }));
    },
  });

  const { data: deptCounts = [] } = useQuery({
    queryKey: ["stat-dept-distribution"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("department_id");
      if (pErr) throw pErr;
      const { data: depts, error: dErr } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true);
      if (dErr) throw dErr;
      const deptMap = new Map(depts.map((d: any) => [d.id, d.name]));
      const counts: Record<string, number> = {};
      profiles.forEach((p: any) => {
        const name = p.department_id ? deptMap.get(p.department_id) || "기타" : "미지정";
        counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    },
  });

  const total = roleCounts.reduce((s, r) => s + r.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm font-medium">회원 분포</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Role pie chart */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">역할별</p>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={2}>
                    {roleCounts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}명`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
              {roleCounts.map((r, i) => (
                <span key={r.name} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {r.name} {r.value}명
                </span>
              ))}
            </div>
          </div>

          {/* Dept breakdown */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">지점/부서별</p>
            <div className="space-y-2">
              {deptCounts.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground shrink-0">{d.value}명</span>
                </div>
              ))}
              {deptCounts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">데이터 없음</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberStatsCard;
