import { useEffect, useState } from "react";
import { Activity, X } from "lucide-react";
import type { Metric } from "web-vitals";

type VitalKey = "FCP" | "LCP" | "CLS" | "INP" | "TTFB";

interface VitalState {
  value: number | null;
  rating: "good" | "needs-improvement" | "poor" | null;
}

const initialVitals: Record<VitalKey, VitalState> = {
  FCP: { value: null, rating: null },
  LCP: { value: null, rating: null },
  CLS: { value: null, rating: null },
  INP: { value: null, rating: null },
  TTFB: { value: null, rating: null },
};

const formatValue = (key: VitalKey, value: number | null) => {
  if (value === null) return "—";
  if (key === "CLS") return value.toFixed(2);
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

const ratingClasses = (rating: VitalState["rating"]) => {
  switch (rating) {
    case "good":
      return "bg-success/10 text-success border-success/20";
    case "needs-improvement":
      return "bg-warning/10 text-warning border-warning/20";
    case "poor":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const STORAGE_KEY = "web-vitals-monitor-open";

const WebVitalsMonitor = () => {
  const [vitals, setVitals] = useState<Record<VitalKey, VitalState>>(initialVitals);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  // Lazy-load web-vitals only when the panel is opened, after idle.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const start = async () => {
      const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
      if (cancelled) return;
      const update = (key: VitalKey) => (metric: Metric) => {
        setVitals((prev) => ({
          ...prev,
          [key]: { value: metric.value, rating: metric.rating },
        }));
      };
      onFCP(update("FCP"));
      onLCP(update("LCP"));
      onCLS(update("CLS"));
      onINP(update("INP"));
      onTTFB(update("TTFB"));
    };
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
    }).requestIdleCallback;
    const id = ric ? ric(start) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (!ric) clearTimeout(id);
    };
  }, [open]);

  const togglePanel = (next: boolean) => {
    setOpen(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
  };

  if (!open) {
    return (
      <button
        onClick={() => togglePanel(true)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Web Vitals 열기"
        title="Web Vitals"
      >
        <Activity className="h-4 w-4 text-foreground" />
      </button>
    );
  }

  const order: VitalKey[] = ["FCP", "LCP", "CLS", "INP", "TTFB"];

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 max-w-xs"
      role="complementary"
      aria-label="Web Vitals 모니터"
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground flex-1">Web Vitals</span>
        <button
          onClick={() => togglePanel(false)}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
          {order.map((key) => {
            const v = vitals[key];
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${ratingClasses(v.rating)}`}
                title={v.rating ?? "측정 중"}
              >
                <span className="font-semibold">{key}</span>
                <span>{formatValue(key, v.value)}</span>
              </span>
            );
          })}
      </div>
    </div>
  );
};

export default WebVitalsMonitor;