import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, X, Share, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const hostname = typeof window !== "undefined" ? window.location.hostname : "";
const isPreviewHost = hostname.includes("id-preview--") || hostname.includes("lovableproject.com");

const isStandalone = (() => {
  if (typeof window === "undefined") return false;
  // @ts-ignore
  if (window.navigator.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
})();

const isIOS = (() => {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
})();

const IOS_DISMISS_KEY = "pwa-ios-install-dismissed-at";
const IOS_DISMISS_TTL = 1000 * 60 * 60 * 24 * 7;

const PWAUpdatePrompt = () => {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isInIframe || isPreviewHost) {
      // Defensive: clean up any previously registered SW in preview
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      }
      return;
    }
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore - virtual module from vite-plugin-pwa
        const { registerSW } = await import("virtual:pwa-register");
        const update = registerSW({
          onNeedRefresh() { if (!cancelled) setNeedRefresh(true); },
          onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
            if (registration) {
              setInterval(() => { registration.update().catch(() => {}); }, 60 * 60 * 1000);
            }
          },
        });
        if (!cancelled) setUpdateSW(() => update);
      } catch (err) {
        console.debug("[PWA] SW registration skipped:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallEvent(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!isIOS || isStandalone) return;
    if (isInIframe || isPreviewHost) return;
    const dismissedAt = Number(localStorage.getItem(IOS_DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < IOS_DISMISS_TTL) return;
    const timer = setTimeout(() => setShowIOSHint(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = async () => {
    if (updateSW) await updateSW(true);
    else window.location.reload();
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismissIOSHint = () => {
    localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()));
    setShowIOSHint(false);
  };

  if (isInIframe || isPreviewHost) return null;

  return (
    <>
      {needRefresh && (
        <div role="status" aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,420px)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-foreground text-background rounded-xl shadow-2xl p-4 flex items-start gap-3 border border-border/20">
            <RefreshCw className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t("pwa.updateTitle", "새 버전이 있습니다")}</p>
              <p className="text-xs opacity-80 mt-0.5">{t("pwa.updateDesc", "최신 기능과 보안 패치를 받으려면 새로고침하세요.")}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold" onClick={handleUpdate}>
                  {t("pwa.updateNow", "지금 업데이트")}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-background/70 hover:text-background hover:bg-background/10" onClick={() => setNeedRefresh(false)}>
                  {t("pwa.later", "나중에")}
                </Button>
              </div>
            </div>
            <button type="button" onClick={() => setNeedRefresh(false)} className="text-background/60 hover:text-background shrink-0" aria-label={t("common.close", "닫기")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {installEvent && !isStandalone && (
        <div role="dialog" aria-label={t("pwa.installTitle", "앱 설치")}
          className="fixed bottom-4 right-4 z-[9998] w-[min(92vw,360px)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-background border-2 border-border rounded-xl shadow-xl p-4 flex items-start gap-3">
            <Download className="h-5 w-5 mt-0.5 text-foreground shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{t("pwa.installTitle", "홈화면에 NONFICTION 설치")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("pwa.installDesc", "앱처럼 빠르게 실행하고 오프라인에서도 일부 기능을 사용할 수 있습니다.")}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-8 text-xs font-semibold" onClick={handleInstall}>
                  {t("pwa.install", "설치")}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setInstallEvent(null)}>
                  {t("pwa.notNow", "다음에")}
                </Button>
              </div>
            </div>
            <button type="button" onClick={() => setInstallEvent(null)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={t("common.close", "닫기")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showIOSHint && (
        <div role="dialog" aria-label={t("pwa.iosHintTitle", "iOS 설치 안내")}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[min(92vw,420px)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-background border-2 border-border rounded-xl shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{t("pwa.iosHintTitle", "홈화면에 추가하세요")}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t("pwa.iosHintIntro", "Safari 하단의")}
                  <Share className="inline h-3.5 w-3.5 mx-1 -mt-0.5" aria-hidden="true" />
                  {t("pwa.iosHintMid", "공유 버튼 →")}
                  <Plus className="inline h-3.5 w-3.5 mx-1 -mt-0.5" aria-hidden="true" />
                  <span className="font-medium">{t("pwa.iosHintAdd", "\"홈 화면에 추가\"")}</span>
                  {t("pwa.iosHintTail", "를 선택해 주세요.")}
                </p>
              </div>
              <button type="button" onClick={dismissIOSHint} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={t("common.close", "닫기")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAUpdatePrompt;
