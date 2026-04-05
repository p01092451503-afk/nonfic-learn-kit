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
import { format, subDays, startOfDay, startOfMonth, endOfMonth } from "date-fns";

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

  // Fetch traffic logs
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

  // Fetch storage usage
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

  // Calculate stats
  const totalPageViews = trafficLogs.filter((l) => l.event_type === "page_view").length;
  const totalContentAccess = trafficLogs.filter((l) => l.event_type === "content_access").length;
  const totalEstimatedBytes = trafficLogs.reduce((sum, l) => sum + (Number(l.estimated_bytes) || 0), 0);
  const uniqueUsers = new Set(trafficLogs.map((l) => l.user_id)).size;

  const contentLogs = trafficLogs.filter((l) => l.event_type === "content_access");
  const externalAccess = contentLogs.filter((l) => (l.metadata as any)?.is_external).length;
  const selfHostedAccess = contentLogs.length - externalAccess;

  const videoAccess = contentLogs.filter((l) => (l.metadata as any)?.content_type === "video").length;
  const docAccess = contentLogs.filter((l) => (l.metadata as any)?.content_type === "document").length;

  // CDN estimate (only self-hosted content incurs cost)
  const cdnBytes = contentLogs
    .filter((l) => !(l.metadata as any)?.is_external)
    .reduce((sum, l) => sum + (Number(l.estimated_bytes) || 0), 0);

  // Web traffic estimate (page view bytes)
  const webBytes = trafficLogs
    .filter((l) => l.event_type === "page_view")
    .reduce((sum, l) => sum + (Number(l.estimated_bytes) || 0), 0);

  // Storage content count
  const totalContents = storageData?.length || 0;
  const videoContents = storageData?.filter((c) => c.content_type === "video").length || 0;
  const docContents = storageData?.filter((c) => c.content_type === "document").length || 0;

  // Daily chart data
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

  // Top pages
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
    { label: "웹 트래픽 (전송량)", value: formatBytes(webBytes), icon: Globe, color: "text-blue-600" },
    { label: "CDN 전송량 (추정)", value: formatBytes(cdnBytes), icon: Play, color: "text-purple-600" },
    { label: "총 전송량", value: formatBytes(totalEstimatedBytes), icon: TrendingUp, color: "text-green-600" },
    { label: "저장 콘텐츠", value: `${totalContents}개`, icon: HardDrive, color: "text-orange-600" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              트래픽 모니터링
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              CDN 전송량, 저장공간, 웹트래픽 현황을 확인합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">페이지 조회수</p>
              <p className="text-lg font-semibold">{totalPageViews.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">콘텐츠 재생</p>
              <p className="text-lg font-semibold">{totalContentAccess.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">활성 사용자</p>
              <p className="text-lg font-semibold">{uniqueUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">영상 / 문서 재생</p>
              <p className="text-lg font-semibold">{videoAccess} / {docAccess}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Traffic Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">일별 트래픽 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" name="페이지 조회" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="access" name="콘텐츠 접근" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Transfer Volume */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">일별 전송량 (GB)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">저장공간 현황</CardTitle>
          </CardHeader>
          <CardContent>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">인기 페이지 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">아직 트래픽 데이터가 없습니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>페이지 경로</TableHead>
                    <TableHead className="text-right">조회수</TableHead>
                    <TableHead className="text-right w-[120px]">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map(([path, count], i) => (
                    <TableRow key={path}>
                      <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{path}</TableCell>
                      <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminTraffic;
