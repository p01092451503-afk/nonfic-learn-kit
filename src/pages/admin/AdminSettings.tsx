import { Settings, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "react-i18next";

const AdminSettings = () => {
  const { t } = useTranslation();

  const settingSections = [
    {
      title: t("admin.generalSettings"),
      icon: Settings,
      items: [
        { label: t("admin.platformName"), value: "NONFICTION LMS", type: "text" },
        { label: t("admin.defaultLanguage"), value: "한국어", type: "select" },
        { label: t("admin.timezone"), value: "Asia/Seoul (UTC+9)", type: "select" },
      ],
    },
    {
      title: t("admin.notificationSettings"),
      icon: Bell,
      items: [
        { label: t("admin.newSignupNotif"), value: true, type: "toggle" },
        { label: t("admin.assignmentSubmitNotif"), value: true, type: "toggle" },
        { label: t("admin.completionNotif"), value: true, type: "toggle" },
      ],
    },
    {
      title: t("admin.securitySettings"),
      icon: Shield,
      items: [
        { label: t("admin.minPasswordLength"), value: "8", type: "text" },
        { label: t("admin.sessionExpiry"), value: "24h", type: "select" },
        { label: t("admin.twoFactorAuth"), value: false, type: "toggle" },
      ],
    },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("admin.settingsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.settingsDesc")}</p>
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
                    <button className={`h-6 w-11 rounded-full transition-colors ${item.value ? "bg-foreground" : "bg-border"} relative`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${item.value ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  ) : (
                    <Input defaultValue={item.value as string} className="w-48 h-9 rounded-xl border-border text-sm text-right" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <Button className="rounded-xl">{t("admin.saveSettings")}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;