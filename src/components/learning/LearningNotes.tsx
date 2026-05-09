import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Check, Loader2, CloudOff, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface LearningNotesProps {
  userId: string | undefined;
  contentId: string;
  courseId: string;
}

interface NoteRow {
  id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

type SaveStatus = "idle" | "typing" | "saving" | "saved" | "error";

const LearningNotes = ({ userId, contentId, courseId }: LearningNotesProps) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialisedRef = useRef(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["learning-notes", userId, contentId],
    enabled: !!userId && !!contentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("learning_notes")
        .select("id, note, created_at, updated_at")
        .eq("user_id", userId!)
        .eq("content_id", contentId)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data || []) as NoteRow[];
    },
  });

  // Hydrate from latest note when content changes
  useEffect(() => {
    if (isLoading) return;
    const latest = notes[0];
    noteIdRef.current = latest?.id ?? null;
    const initial = latest?.note ?? "";
    setText(initial);
    lastSavedRef.current = initial;
    setSavedAt(latest ? new Date(latest.updated_at) : null);
    setStatus("idle");
    initialisedRef.current = true;
    return () => {
      initialisedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, isLoading]);

  const persist = useCallback(
    async (value: string) => {
      if (!userId) return;
      const trimmed = value;
      setStatus("saving");
      try {
        if (noteIdRef.current) {
          if (trimmed.trim() === "") {
            const { error } = await (supabase as any)
              .from("learning_notes")
              .delete()
              .eq("id", noteIdRef.current);
            if (error) throw error;
            noteIdRef.current = null;
          } else {
            const { error } = await (supabase as any)
              .from("learning_notes")
              .update({ note: trimmed })
              .eq("id", noteIdRef.current);
            if (error) throw error;
          }
        } else if (trimmed.trim() !== "") {
          const { data, error } = await (supabase as any)
            .from("learning_notes")
            .insert({ user_id: userId, content_id: contentId, course_id: courseId, note: trimmed })
            .select("id")
            .single();
          if (error) throw error;
          noteIdRef.current = data?.id ?? null;
        }
        lastSavedRef.current = trimmed;
        setSavedAt(new Date());
        setStatus("saved");
        qc.invalidateQueries({ queryKey: ["learning-notes", userId, contentId] });
      } catch (e) {
        console.error("[LearningNotes] save error", e);
        setStatus("error");
      }
    },
    [userId, contentId, courseId, qc]
  );

  // Debounced autosave on text change
  useEffect(() => {
    if (!initialisedRef.current) return;
    if (text === lastSavedRef.current) return;
    setStatus("typing");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persist(text);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, persist]);

  // Flush on unmount / content switch
  useEffect(() => {
    return () => {
      if (debounceRef.current && text !== lastSavedRef.current && initialisedRef.current) {
        clearTimeout(debounceRef.current);
        persist(text);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const handleClear = async () => {
    setText("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await persist("");
  };

  if (!userId) return null;

  const StatusIndicator = () => {
    switch (status) {
      case "typing":
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {t("notes.typing", "입력 중…")}
          </span>
        );
      case "saving":
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("notes.saving", "저장 중…")}
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
            <Check className="h-3 w-3" />
            {savedAt
              ? t("notes.savedAt", "{{time}}에 자동 저장됨", { time: savedAt.toLocaleTimeString() })
              : t("notes.savedShort", "자동 저장됨")}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <CloudOff className="h-3 w-3" />
            {t("notes.saveError", "저장 실패 — 다시 시도해주세요")}
          </span>
        );
      default:
        return savedAt ? (
          <span className="text-xs text-muted-foreground">
            {t("notes.lastSaved", "마지막 저장: {{time}}", { time: savedAt.toLocaleTimeString() })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("notes.autosaveHint", "입력 시 자동 저장됩니다")}
          </span>
        );
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            {t("notes.title", "학습 노트")}
          </h3>
        </div>
        <StatusIndicator />
      </header>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : (
        <>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(
              "notes.placeholder",
              "학습 중 떠오른 생각이나 핵심 내용을 메모하세요... (자동 저장됩니다)"
            )}
            rows={5}
            className="resize-none text-sm leading-relaxed"
          />
          {text.length > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {text.length} {t("notes.chars", "자")}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                {t("notes.clear", "비우기")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default LearningNotes;