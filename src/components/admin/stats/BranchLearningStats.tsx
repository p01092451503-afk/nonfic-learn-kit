import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const BranchLearningStats = () => {
  const isMobile = useIsMobile();

  const { data: branches = [] } = useQuery({
    queryKey: ["stat-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, name_en")
        .eq("is_active", true)
        .is("parent_department_id", null)
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["stat-branch-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, department_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["stat-branch-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("user_id, progress, completed_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: contentProgress = [] } = useQuery({
    queryKey: ["stat-branch-content-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_progress")
        .select("user_id, completed")
        .eq("completed", true);
      if (error) throw error;
      return data;
    },
  });

  // Build user->branch map
  const userBranchMap = new Map<string, string>();
  profiles.forEach((p: any) => {
    if (p.department_id) userBranchMap.set(p.user_id, p.department_id);
  });

  // Content completions per user
  const userContentMap = new Map<string, number>();
  contentProgress.forEach((cp: any) => {
    userContentMap.set(cp.user_id, (userContentMap.get(cp.user_id) || 0) + 1);
  });

  // Aggregate per branch
  const branchStats = branches.map((b: any) => {
    const branchUserIds = profiles
      .filter((p: any) => p.department_id === b.id)
      .map((p: any) => p.user_id);
    const userSet = new Set(branchUserIds);

    const branchEnrollments = enrollments.filter((e: any) => userSet.has(e.user_id));
    const totalEnroll = branchEnrollments.length;
    const completed = branchEnrollments.filter((e: any) => e.completed_at).length;
    const avgProgress = totalEnroll > 0
      ? Math.round(branchEnrollments.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / totalEnroll)
      : 0;
    const completionRate = totalEnroll > 0 ? Math.round((completed / totalEnroll) * 100) : 0;

    const totalContentCompletions = branchUserIds.reduce(
      (s: number, uid: string) => s + (userContentMap.get(uid) || 0), 0
    );

    return {
      name: b.name,
      members: userSet.size,
      enrollments: totalEnroll,
      completed,
      avgProgress,
      completionRate,
      contentCompletions: totalContentCompletions,
    };
  }).filter((b) => b.members > 0);

  const chartData = branchStats.map((b) => ({
    name: b.name.length > 6 ? b.name.slice(0, 6) + "…" : b.name,
    이수율: b.completionRate,
    평균진도: b.avgProgress,
  }));

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm font-medium">지점별 학습 현황</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-5">
        {branchStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">지점 데이터가 없습니다.</p>
        ) : (
          <>
            {/* Chart */}
            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={isMobile ? { top: 4, right: 4, left: 0, bottom: 0 } : { top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickMargin={6} />
                  <YAxis tick={{ fontSize: 10 }} width={30} hide={isMobile} domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="이수율" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="평균진도" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {branchStats.map((b) => (
                <div key={b.name} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{b.name}</span>
                    <span className="text-xs text-muted-foreground">{b.members}명</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">수강</p>
                      <p className="text-sm font-bold text-foreground">{b.enrollments}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">이수</p>
                      <p className="text-sm font-bold text-foreground">{b.completed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">차시</p>
                      <p className="text-sm font-bold text-foreground">{b.contentCompletions}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">평균 진도율</span>
                      <span className="font-medium">{b.avgProgress}%</span>
                    </div>
                    <Progress value={b.avgProgress} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">이수율</span>
                      <span className="font-medium">{b.completionRate}%</span>
                    </div>
                    <Progress value={b.completionRate} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>지점</TableHead>
                    <TableHead className="text-right">인원</TableHead>
                    <TableHead className="text-right">수강 건수</TableHead>
                    <TableHead className="text-right">이수 완료</TableHead>
                    <TableHead className="text-right">차시 이수</TableHead>
                    <TableHead className="text-right">평균 진도율</TableHead>
                    <TableHead className="text-right w-[140px]">이수율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchStats.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-right">{b.members}명</TableCell>
                      <TableCell className="text-right">{b.enrollments}</TableCell>
                      <TableCell className="text-right">{b.completed}</TableCell>
                      <TableCell className="text-right">{b.contentCompletions}</TableCell>
                      <TableCell className="text-right">{b.avgProgress}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={b.completionRate} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{b.completionRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchLearningStats;
