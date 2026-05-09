import { ChevronRight, PlayCircle, Clock, Sparkles, Lock as LockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NextContentPreviewProps {
  next: {
    id: string;
    title: string;
    description?: string | null;
    duration_minutes?: number | null;
    content_type?: string | null;
  };
  onClick: () => void;
  locked?: boolean;
}

const NextContentPreview = ({ next, onClick, locked }: NextContentPreviewProps) => {
  const { t } = useTranslation();

  const desc = (next.description || "").replace(/^\[card-content\].*$/s, "").trim();
  const trimmed = desc.length > 120 ? desc.slice(0, 120) + "…" : desc;

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-foreground" />
        <h3 className="text-base font-semibold text-foreground">
          {t("nextPreview.title", "다음 차시 예고")}
        </h3>
      </div>

      <button
        type="button"
        onClick={() => !locked && onClick()}
        disabled={locked}
        className={`group relative w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background to-muted/40 p-5 text-left transition-all ${
          locked
            ? "opacity-60 cursor-not-allowed"
            : "hover:border-foreground/40 hover:shadow-md"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            {locked ? <LockIcon className="h-6 w-6" /> : <PlayCircle className="h-7 w-7" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              <span>{t("nextPreview.upNext", "Up Next")}</span>
              {next.duration_minutes ? (
                <span className="inline-flex items-center gap-0.5">
                  · <Clock className="h-2.5 w-2.5" /> {next.duration_minutes}
                  {t("common.minutes", "분")}
                </span>
              ) : null}
            </div>
            <h4 className="text-base font-semibold text-foreground truncate">
              {next.title}
            </h4>
            {trimmed && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {trimmed}
              </p>
            )}
          </div>

          <ChevronRight
            className={`h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform ${
              !locked && "group-hover:translate-x-1 group-hover:text-foreground"
            }`}
          />
        </div>

        {locked && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t("course.sequentialLockedShort", "이전 차시 완료 후 학습 가능")}
          </p>
        )}
      </button>
    </section>
  );
};

export default NextContentPreview;