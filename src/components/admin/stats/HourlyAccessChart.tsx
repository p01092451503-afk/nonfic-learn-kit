import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

const HourlyAccessChart = () => {
  const isMobile = useIsMobile();
  const todayStart = startOfDay(new Date()).toISOString();

  const { data: hourlyData = [] } = useQuery({
    queryKey: ["stat-hourly-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traffic_logs")
        .select("created_at")
        .eq("event_type", "page_view")
        .gte("created_at", todayStart);
      if (error) throw error;

      const hours = Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2, "0")}시`,
        count: 0,
      }));

      data.forEach((l: any) => {
        const h = new Date(l.created_at).getHours();
        hours[h].count++;
      });

      return hours;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm font-medium">오늘 시간대별 접속 현황</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-[180px] sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={isMobile ? { top: 4, right: 4, left: 0, bottom: 0 } : { top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickMargin={6} interval={isMobile ? 3 : 1} />
              <YAxis tick={{ fontSize: 10 }} width={30} hide={isMobile} />
              <Tooltip formatter={(value: number) => [`${value}건`, "접속"]} />
              <Bar dataKey="count" name="접속" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyAccessChart;
