import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Save, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const LearningNotes = ({ userId, contentId, courseId }: LearningNotesProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["learning-notes", userId, contentId],
    enabled: !!userId && !!contentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("learning_notes")
        .select("id, note, created_at, updated_at")
        .eq("user_id", userId!)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as NoteRow[];
    },
  });

  useEffect(() => {
    setDraft("");
    setEditingId(null);
  }, [contentId]);

  const addMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await (supabase as any)
        .from("learning_notes")
        .insert({ user_id: userId, content_id: contentId, course_id: courseId, note: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["learning-notes", userId, contentId] });
      toast({ title: t("notes.saved", "메모 저장됨") });
    },
    onError: (e: any) => toast({ title: t("common.error", "오류"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await (supabase as any)
        .from("learning_notes")
        .update({ note: text })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["learning-notes", userId, contentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("learning_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-notes", userId, contentId] }),
  });

  if (!userId) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center gap-2 mb-4">
        <NotebookPen className="h-4 w-4 text-foreground" />
        <h3 className="text-base font-semibold text-foreground">{t("notes.title", "학습 노트")}</h3>
        {notes.length > 0 && (
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        )}
      </header>

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("notes.placeholder", "학습 중 떠오른 생각이나 핵심 내용을 메모하세요...")}
          rows={3}
          className="resize-none text-sm"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => draft.trim() && addMutation.mutate(draft.trim())}
            disabled={!draft.trim() || addMutation.isPending}
            className="rounded-xl gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {t("notes.save", "저장")}
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("notes.empty", "아직 작성된 노트가 없습니다.")}
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-border/80 bg-background p-3">
              {editingId === n.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      onClick={() =>
                        editingText.trim() &&
                        updateMutation.mutate({ id: n.id, text: editingText.trim() })
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {n.note}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setEditingId(n.id);
                          setEditingText(n.note);
                        }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground"
                        aria-label="edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(n.id)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground"
                        aria-label="delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default LearningNotes;