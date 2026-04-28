import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages, Wand2, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { translateKoToEn } from "@/lib/translate";
import { toast } from "sonner";

type Category = "course" | "content" | "assessment" | "announcement" | "board" | "category";

interface Row {
  id: string;
  category: Category;
  ko_title: string;
  ko_body: string;
  en_title: string | null;
  en_body: string | null;
  status: "missing" | "partial" | "complete";
}

const CATEGORY_LABELS: Record<Category, string> = {
  course: "강의",
  content: "차시",
  assessment: "평가",
  announcement: "공지",
  board: "게시판",
  category: "분류",
};

async function fetchAllRows(): Promise<Row[]> {
  const rows: Row[] = [];

  // 1) Courses
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, title, description")
    .order("created_at", { ascending: false });
  const courses = ((coursesData as unknown) as Array<{ id: string; title: string | null; description: string | null }>) ?? [];
  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: courseI18n } = courseIds.length
    ? await supabase
        .from("course_i18n" as any)
        .select("course_id, title, description")
        .eq("language_code", "en")
        .in("course_id", courseIds)
    : { data: [] as any[] };
  const courseEnMap = new Map<string, any>();
  (courseI18n ?? []).forEach((r: any) => courseEnMap.set(r.course_id, r));
  courses.forEach((c) => {
    const en = courseEnMap.get(c.id);
    rows.push(buildRow("course", c.id, c.title ?? "", c.description ?? "", en?.title ?? null, en?.description ?? null));
  });

  // 2) Course contents (lessons / 차시)
  const { data: contentsData } = await supabase
    .from("course_contents" as any)
    .select("id, title, description")
    .order("created_at", { ascending: false });
  const contents = ((contentsData as unknown) as Array<{ id: string; title: string | null; description: string | null }>) ?? [];
  const contentIds = (contents ?? []).map((c) => c.id);
  const { data: contentI18n } = contentIds.length
    ? await supabase
        .from("course_content_i18n" as any)
        .select("content_id, title, description")
        .eq("language_code", "en")
        .in("content_id", contentIds)
    : { data: [] as any[] };
  const contentEnMap = new Map<string, any>();
  (contentI18n ?? []).forEach((r: any) => contentEnMap.set(r.content_id, r));
  contents.forEach((c) => {
    const en = contentEnMap.get(c.id);
    rows.push(buildRow("content", c.id, c.title ?? "", c.description ?? "", en?.title ?? null, en?.description ?? null));
  });

  // 3) Assessments
  const { data: assessmentsData } = await supabase
    .from("assessments")
    .select("id, title, description")
    .order("created_at", { ascending: false });
  const assessments = ((assessmentsData as unknown) as Array<{ id: string; title: string | null; description: string | null }>) ?? [];
  const assIds = (assessments ?? []).map((a) => a.id);
  const { data: assI18n } = assIds.length
    ? await supabase
        .from("assessment_i18n" as any)
        .select("assessment_id, title, description")
        .eq("language_code", "en")
        .in("assessment_id", assIds)
    : { data: [] as any[] };
  const assEnMap = new Map<string, any>();
  (assI18n ?? []).forEach((r: any) => assEnMap.set(r.assessment_id, r));
  assessments.forEach((a) => {
    const en = assEnMap.get(a.id);
    rows.push(buildRow("assessment", a.id, a.title ?? "", a.description ?? "", en?.title ?? null, en?.description ?? null));
  });

  // 4) Announcements
  const { data: annsData } = await supabase
    .from("announcements")
    .select("id, title, content")
    .order("created_at", { ascending: false });
  const anns = ((annsData as unknown) as Array<{ id: string; title: string | null; content: string | null }>) ?? [];
  const annIds = (anns ?? []).map((a) => a.id);
  const { data: annI18n } = annIds.length
    ? await supabase
        .from("announcement_i18n" as any)
        .select("announcement_id, title, content")
        .eq("language_code", "en")
        .in("announcement_id", annIds)
    : { data: [] as any[] };
  const annEnMap = new Map<string, any>();
  (annI18n ?? []).forEach((r: any) => annEnMap.set(r.announcement_id, r));
  anns.forEach((a) => {
    const en = annEnMap.get(a.id);
    rows.push(buildRow("announcement", a.id, a.title ?? "", a.content ?? "", en?.title ?? null, en?.content ?? null));
  });

  // 5) Board posts
  const { data: postsData } = await supabase
    .from("board_posts")
    .select("id, title, content")
    .order("created_at", { ascending: false });
  const posts = ((postsData as unknown) as Array<{ id: string; title: string | null; content: string | null }>) ?? [];
  const postIds = (posts ?? []).map((p) => p.id);
  const { data: postI18n } = postIds.length
    ? await supabase
        .from("board_post_i18n" as any)
        .select("post_id, title, content")
        .eq("language_code", "en")
        .in("post_id", postIds)
    : { data: [] as any[] };
  const postEnMap = new Map<string, any>();
  (postI18n ?? []).forEach((r: any) => postEnMap.set(r.post_id, r));
  posts.forEach((p) => {
    const en = postEnMap.get(p.id);
    rows.push(buildRow("board", p.id, p.title ?? "", p.content ?? "", en?.title ?? null, en?.content ?? null));
  });

  return rows;
}

function buildRow(
  category: Category,
  id: string,
  koTitle: string,
  koBody: string,
  enTitle: string | null,
  enBody: string | null,
): Row {
  const hasEnTitle = !!enTitle?.trim();
  const hasEnBody = !!enBody?.trim() || !koBody.trim();
  let status: Row["status"] = "missing";
  if (hasEnTitle && hasEnBody) status = "complete";
  else if (hasEnTitle || (enBody?.trim())) status = "partial";
  return {
    id,
    category,
    ko_title: koTitle,
    ko_body: koBody,
    en_title: enTitle,
    en_body: enBody,
    status,
  };
}

async function upsertTranslation(row: Row, enTitle: string, enBody: string) {
  const payload: any = { language_code: "en", title: enTitle, content: enBody };
  switch (row.category) {
    case "course":
      return supabase
        .from("course_i18n" as any)
        .upsert({ course_id: row.id, language_code: "en", title: enTitle, description: enBody }, { onConflict: "course_id,language_code" });
    case "content":
      return supabase
        .from("course_content_i18n" as any)
        .upsert({ content_id: row.id, language_code: "en", title: enTitle, description: enBody }, { onConflict: "content_id,language_code" });
    case "assessment":
      return supabase
        .from("assessment_i18n" as any)
        .upsert({ assessment_id: row.id, language_code: "en", title: enTitle, description: enBody }, { onConflict: "assessment_id,language_code" });
    case "announcement":
      return supabase
        .from("announcement_i18n" as any)
        .upsert({ announcement_id: row.id, language_code: "en", title: enTitle, content: enBody }, { onConflict: "announcement_id,language_code" });
    case "board":
      return supabase
        .from("board_post_i18n" as any)
        .upsert({ post_id: row.id, language_code: "en", title: enTitle, content: enBody }, { onConflict: "post_id,language_code" });
  }
}

const AdminI18n = () => {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<Category>("course");
  const [filter, setFilter] = useState<"missing" | "all">("missing");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-i18n-rows"],
    queryFn: fetchAllRows,
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const c: Record<Category, { total: number; missing: number; partial: number; complete: number }> = {
      course: { total: 0, missing: 0, partial: 0, complete: 0 },
      content: { total: 0, missing: 0, partial: 0, complete: 0 },
      assessment: { total: 0, missing: 0, partial: 0, complete: 0 },
      announcement: { total: 0, missing: 0, partial: 0, complete: 0 },
      board: { total: 0, missing: 0, partial: 0, complete: 0 },
    };
    rows.forEach((r) => {
      c[r.category].total += 1;
      c[r.category][r.status] += 1;
    });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    return rows
      .filter((r) => r.category === activeCategory)
      .filter((r) => (filter === "missing" ? r.status !== "complete" : true));
  }, [rows, activeCategory, filter]);

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) visible.forEach((r) => next.delete(r.id));
    else visible.forEach((r) => next.add(r.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const translateRows = async (targets: Row[]) => {
    if (targets.length === 0) return { ok: 0, fail: 0 };
    let ok = 0;
    let fail = 0;
    // Process in chunks of 5 for stability
    const chunkSize = 5;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      // Build a single batch: [t1, b1, t2, b2, ...]
      const inputs: string[] = [];
      chunk.forEach((r) => {
        inputs.push(r.ko_title || "");
        inputs.push(r.ko_body || "");
      });
      try {
        const out = await translateKoToEn(inputs);
        for (let j = 0; j < chunk.length; j++) {
          const enTitle = out[j * 2] || chunk[j].ko_title;
          const enBody = out[j * 2 + 1] || chunk[j].ko_body;
          const { error } = await upsertTranslation(chunk[j], enTitle, enBody);
          if (error) fail++;
          else ok++;
        }
      } catch (e) {
        console.error(e);
        fail += chunk.length;
      }
    }
    return { ok, fail };
  };

  const handleTranslateOne = async (row: Row) => {
    setRowBusy(row.id);
    try {
      const { ok } = await translateRows([row]);
      if (ok > 0) {
        toast.success("번역이 완료되었습니다.");
        await queryClient.invalidateQueries({ queryKey: ["admin-i18n-rows"] });
      } else {
        toast.error("번역에 실패했습니다.");
      }
    } finally {
      setRowBusy(null);
    }
  };

  const handleBulk = async (mode: "selected" | "all-missing") => {
    let targets: Row[] = [];
    if (mode === "selected") {
      targets = rows.filter((r) => selected.has(r.id));
      if (targets.length === 0) {
        toast.error("항목을 선택하세요.");
        return;
      }
    } else {
      targets = rows.filter((r) => r.status !== "complete");
      if (targets.length === 0) {
        toast.success("번역할 항목이 없습니다.");
        return;
      }
    }
    setBulkBusy(true);
    toast.info(`${targets.length}개 항목 번역을 시작합니다…`);
    try {
      const { ok, fail } = await translateRows(targets);
      if (fail === 0) toast.success(`${ok}개 항목이 번역되었습니다.`);
      else toast.warning(`${ok}개 성공, ${fail}개 실패`);
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["admin-i18n-rows"] });
    } finally {
      setBulkBusy(false);
    }
  };

  const totalMissing = (Object.keys(counts) as Category[]).reduce(
    (acc, k) => acc + counts[k].missing + counts[k].partial,
    0,
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-md bg-muted">
              <Languages className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold">다국어 관리</h1>
              <p className="text-sm text-muted-foreground mt-1">
                한국어 콘텐츠의 영어 번역 상태를 한눈에 확인하고 일괄 번역할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              새로고침
            </Button>
            <Button
              size="sm"
              onClick={() => handleBulk("all-missing")}
              disabled={bulkBusy || totalMissing === 0}
              className="gap-1"
            >
              <Wand2 className="h-4 w-4" />
              전체 자동 번역 ({totalMissing})
            </Button>
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
            const c = counts[cat];
            const incomplete = c.missing + c.partial;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelected(new Set());
                }}
                className={`text-left rounded-lg border p-4 transition ${
                  isActive ? "border-foreground ring-1 ring-foreground/40" : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-xs text-muted-foreground">전체 {c.total}</span>
                </div>
                <div className="text-2xl font-semibold mt-2">{incomplete}</div>
                <div className="text-[11px] text-muted-foreground mt-1">EN 누락/부분</div>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">{CATEGORY_LABELS[activeCategory]} 상세 목록</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  필요한 항목을 선택하여 한 번에 자동 번역하세요.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="missing" className="text-xs h-6">
                      누락/부분
                    </TabsTrigger>
                    <TabsTrigger value="all" className="text-xs h-6">
                      전체
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBulk("selected")}
                  disabled={bulkBusy || selected.size === 0}
                  className="gap-1"
                >
                  <Wand2 className="h-4 w-4" />
                  선택 항목 번역 ({selected.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3" role="status" aria-live="polite">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">해당 조건의 항목이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border/80 text-left">
                      <th className="py-2 pr-2 w-8">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={toggleAll}
                          aria-label="전체 선택"
                        />
                      </th>
                      <th className="py-2 px-2 w-20">상태</th>
                      <th className="py-2 px-2">한국어 원문</th>
                      <th className="py-2 px-2">영어 번역</th>
                      <th className="py-2 pl-2 w-32 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={`${r.category}-${r.id}`} className="border-b-2 border-border/80 align-top">
                        <td className="py-3 pr-2">
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={() => toggleOne(r.id)}
                            aria-label="선택"
                          />
                        </td>
                        <td className="py-3 px-2">
                          {r.status === "complete" ? (
                            <Badge variant="secondary" className="whitespace-nowrap">완료</Badge>
                          ) : r.status === "partial" ? (
                            <Badge variant="outline" className="whitespace-nowrap">부분</Badge>
                          ) : (
                            <Badge variant="destructive" className="whitespace-nowrap">누락</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 max-w-md">
                          <div className="font-medium truncate">{r.ko_title || "(제목 없음)"}</div>
                          {r.ko_body && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.ko_body}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 max-w-md">
                          {r.en_title || r.en_body ? (
                            <>
                              <div className="font-medium truncate">{r.en_title || "(no title)"}</div>
                              {r.en_body && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.en_body}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleTranslateOne(r)}
                            disabled={rowBusy === r.id || bulkBusy}
                          >
                            <Languages className="h-3 w-3" />
                            번역
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminI18n;