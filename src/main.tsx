import { createRoot } from "react-dom/client";
import { useEffect, useState, type ComponentType } from "react";
import "./i18n";
import "./index.css";

const BootFallback = ({ failed }: { failed?: boolean }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="w-full max-w-sm text-center space-y-3">
      <div className="mx-auto h-10 w-10 rounded-full border border-border bg-muted" aria-hidden="true" />
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
        {failed ? "페이지를 불러오지 못했습니다" : "페이지를 불러오는 중입니다"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {failed ? "최신 화면을 다시 불러와 주세요." : "잠시만 기다려 주세요."}
      </p>
      {failed && (
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          onClick={() => window.location.reload()}
        >
          새로고침
        </button>
      )}
    </div>
  </div>
);

const AppBootstrap = () => {
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadApp = async () => {
      try {
        const module = await import("./App.tsx");
        if (mounted) setAppComponent(() => module.default);
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
          const module = await import("./App.tsx");
          if (mounted) setAppComponent(() => module.default);
        } catch (retryError) {
          console.error("App bootstrap failed:", retryError);
          if (mounted) setFailed(true);
        }
      }
    };

    loadApp();

    return () => {
      mounted = false;
    };
  }, []);

  if (!AppComponent) return <BootFallback failed={failed} />;

  return <AppComponent />;
};

createRoot(document.getElementById("root")!).render(<AppBootstrap />);
