import { Settings, Bell, Shield, Globe, Palette, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const settingSections = [
  {
    title: "일반 설정",
    icon: Settings,
    items: [
      { label: "플랫폼 이름", value: "NONFICTION LMS", type: "text" },
      { label: "기본 언어", value: "한국어", type: "select" },
      { label: "시간대", value: "Asia/Seoul (UTC+9)", type: "select" },
    ],
  },
  {
    title: "알림 설정",
    icon: Bell,
    items: [
      { label: "신규 가입 알림", value: true, type: "toggle" },
      { label: "과제 제출 알림", value: true, type: "toggle" },
      { label: "수료 완료 알림", value: true, type: "toggle" },
    ],
  },
  {
    title: "보안 설정",
    icon: Shield,
    items: [
      { label: "비밀번호 최소 길이", value: "8", type: "text" },
      { label: "세션 만료 시간", value: "24시간", type: "select" },
      { label: "2단계 인증", value: false, type: "toggle" },
    ],
  },
];

const AdminSettings = () => {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">설정</h1>
          <p className="text-sm text-muted-foreground mt-1">플랫폼 설정을 관리하세요.</p>
        </div>

        {settingSections.map((section) => (
          <div key={section.title} className="stat-card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <section.icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            </div>
            <div className="space-y-4">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <label className="text-sm text-foreground">{item.label}</label>
                  {item.type === "toggle" ? (
                    <button
                      className={`h-6 w-11 rounded-full transition-colors ${
                        item.value ? "bg-foreground" : "bg-border"
                      } relative`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          item.value ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  ) : (
                    <Input
                      defaultValue={item.value as string}
                      className="w-48 h-9 rounded-xl border-border text-sm text-right"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button className="rounded-xl">설정 저장</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
