import { useState } from "react";
import { Activity, HardDrive, Globe, Play, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays } from "date-fns";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const AdminTraffic = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("30");

  const fromDate = subDays(new Date(), parseInt(period)).toISOString();

  const { data: trafficLogs = [] } = useQuery({
    queryKey: ["traffic-logs", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traffic_logs")
        .select("*")
        .gte("created_at", fromDate)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: storageData } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_contents")
        .select("id, video_url, video_provider, content_type");
      if (error) throw error;
      return data;
    },
  });

  const totalPageViews = trafficLogs.filter((l) => l.event_type === "page_view").length;
  const totalContentAccess = trafficLogs.filter((l) => l.event_type === "content_access").length;
  const uniqueUsers = new Set(trafficLogs.map((l) => l.user_id)).size;

  const contentLogs = trafficLogs.filter((l) => l.event_type === "content_access");
  const externalAccess = contentLogs.filter((l) => (l.metadata as any)?.is_external).length;
  const selfHostedAccess = contentLogs.length - externalAccess;

  const cdnBytes = contentLogs
    .filter((l) => !(l.metadata as any)?.is_external)
    .reduce((sum, l) => sum + (Number(l.estimated_bytes) || 0), 0);

  const webBytes = trafficLogs
    .filter((l) => l.event_type === "page_view")
    .reduce((sum, l) => sum + (Number(l.estimated_bytes) || 0), 0);

  const totalContents = storageData?.length || 0;
  const videoContents = storageData?.filter((c) => c.content_type === "video").length || 0;
  const docContents = storageData?.filter((c) => c.content_type === "document").length || 0;

  const dailyMap = new Map<string, { views: number; access: number; bytes: number }>();
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const day = format(subDays(new Date(), i), "MM/dd");
    dailyMap.set(day, { views: 0, access: 0, bytes: 0 });
  }
  trafficLogs.forEach((l) => {
    const day = format(new Date(l.created_at!), "MM/dd");
    const entry = dailyMap.get(day);
    if (entry) {
      if (l.event_type === "page_view") entry.views++;
      if (l.event_type === "content_access") entry.access++;
      entry.bytes += Number(l.estimated_bytes) || 0;
    }
  });
  const dailyChartData = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
    bytesGB: parseFloat((data.bytes / (1024 * 1024 * 1024)).toFixed(3)),
  }));

  const pageMap = new Map<string, number>();
  trafficLogs
    .filter((l) => l.event_type === "page_view")
    .forEach((l) => {
      pageMap.set(l.page_path!, (pageMap.get(l.page_path!) || 0) + 1);
    });
  const topPages = Array.from(pageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const stats = [
    { label: "웹 트래픽 (전송량)", value: formatBytes(webBytes), icon: Globe },
    { label: "자체 CDN 전송량", value: formatBytes(cdnBytes), icon: Play },
    { label: "총 전송량 (자체)", value: formatBytes(webBytes + cdnBytes), icon: TrendingUp },
    { label: "저장 콘텐츠", value: `${totalContents}개`, icon: HardDrive },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />
              트래픽 모니터링
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              CDN 전송량, 저장공간, 웹트래픽 현황을 확인합니다
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">최근 7일</SelectItem>
                <SelectItem value="30">최근 30일</SelectItem>
                <SelectItem value="90">최근 90일</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {stats.map((s, i) => (
            <div key={i} className="stat-card !p-3 sm:!p-5" role="group" aria-label={s.label}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <s.icon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground opacity-60 shrink-0" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="stat-card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">페이지 조회수</p>
            <p className="text-lg font-semibold text-foreground">{totalPageViews.toLocaleString()}</p>
          </div>
          <div className="stat-card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">콘텐츠 재생</p>
            <p className="text-lg font-semibold text-foreground">{totalContentAccess.toLocaleString()}</p>
          </div>
          <div className="stat-card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">활성 사용자</p>
            <p className="text-lg font-semibold text-foreground">{uniqueUsers}</p>
          </div>
          <div className="stat-card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">외부 플랫폼 / 자체 호스팅</p>
            <p className="text-lg font-semibold text-foreground">{externalAccess} / {selfHostedAccess}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">YouTube·Vimeo·망고보드 = 전송 비용 없음</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium">일별 트래픽 추이</CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-6">
              <div className="h-[220px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={35} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" name="페이지 조회" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="access" name="콘텐츠 접근" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium">일별 전송량 (GB)</CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-6">
              <div className="h-[220px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={35} />
                    <Tooltip formatter={(value: number) => `${value} GB`} />
                    <Bar dataKey="bytesGB" name="전송량" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage breakdown */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">저장공간 현황</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">영상 콘텐츠</span>
                  <span className="font-medium">{videoContents}개</span>
                </div>
                <Progress value={totalContents > 0 ? (videoContents / totalContents) * 100 : 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">문서/플립러닝</span>
                  <span className="font-medium">{docContents}개</span>
                </div>
                <Progress value={totalContents > 0 ? (docContents / totalContents) * 100 : 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">기타</span>
                  <span className="font-medium">{totalContents - videoContents - docContents}개</span>
                </div>
                <Progress value={totalContents > 0 ? ((totalContents - videoContents - docContents) / totalContents) * 100 : 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">인기 페이지 TOP 10</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">아직 트래픽 데이터가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:-mx-6">
                <div className="min-w-[450px] px-3 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>페이지 경로</TableHead>
                        <TableHead className="text-right">조회수</TableHead>
                        <TableHead className="text-right w-[100px] hidden sm:table-cell">비율</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map(([path, count], i) => (
                        <TableRow key={path}>
                          <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs break-all">{path}</TableCell>
                          <TableCell className="text-right text-sm">{count.toLocaleString()}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={(count / totalPageViews) * 100} className="h-1.5 w-16" />
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {((count / totalPageViews) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminTraffic;
