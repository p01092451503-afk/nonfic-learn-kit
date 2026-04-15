import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Plus, Search, Trash2, Copy, Edit, ExternalLink, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

interface VideoAsset {
  id: string;
  title: string;
  video_url: string;
  video_provider: string;
  duration_minutes: number | null;
  file_size_mb: number | null;
  description: string | null;
  thumbnail_url: string | null;
  uploaded_by: string;
  created_at: string;
}

const providerLabels: Record<string, string> = {
  custom: "CDN / 직접입력",
  youtube: "YouTube",
  vimeo: "Vimeo",
  upload: "업로드(CDN)",
  bunny: "Bunny CDN",
  cloudflare: "Cloudflare Stream",
  kollus: "Kollus (카테노이드)",
};

const AdminVideos = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    video_url: "",
    video_provider: "custom",
    duration_minutes: "",
    file_size_mb: "",
    description: "",
    thumbnail_url: "",
  });

  const resetForm = () => {
    setForm({ title: "", video_url: "", video_provider: "custom", duration_minutes: "", file_size_mb: "", description: "", thumbnail_url: "" });
    setEditingId(null);
  };

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["video-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VideoAsset[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        video_url: form.video_url,
        video_provider: form.video_provider,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        file_size_mb: form.file_size_mb ? parseFloat(form.file_size_mb) : null,
        description: form.description || null,
        thumbnail_url: form.thumbnail_url || null,
        uploaded_by: user!.id,
      };
      if (editingId) {
        const { error } = await supabase.from("video_assets").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("video_assets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-assets"] });
      toast({ title: editingId ? "동영상 정보가 수정되었습니다" : "동영상이 등록되었습니다" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "저장 실패", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("video_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-assets"] });
      toast({ title: "동영상이 삭제되었습니다" });
      setDeleteId(null);
    },
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL이 클립보드에 복사되었습니다" });
  };

  const openEdit = (v: VideoAsset) => {
    setForm({
      title: v.title,
      video_url: v.video_url,
      video_provider: v.video_provider,
      duration_minutes: v.duration_minutes?.toString() || "",
      file_size_mb: v.file_size_mb?.toString() || "",
      description: v.description || "",
      thumbnail_url: v.thumbnail_url || "",
    });
    setEditingId(v.id);
    setDialogOpen(true);
  };

  const filtered = videos.filter((v) => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) || v.video_url.toLowerCase().includes(search.toLowerCase());
    const matchProvider = providerFilter === "all" || v.video_provider === providerFilter;
    return matchSearch && matchProvider;
  });

  const totalSizeMb = videos.reduce((sum, v) => sum + (v.file_size_mb || 0), 0);
  const totalDuration = videos.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6" /> 동영상 관리
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              CDN 동영상 URL을 등록하고 강좌에서 활용할 수 있습니다
            </p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> 동영상 등록
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">총 동영상</p>
            <p className="text-2xl font-bold">{videos.length}개</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">총 용량</p>
            <p className="text-2xl font-bold">{totalSizeMb >= 1024 ? `${(totalSizeMb / 1024).toFixed(1)}GB` : `${totalSizeMb.toFixed(0)}MB`}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">총 재생시간</p>
            <p className="text-2xl font-bold">{Math.floor(totalDuration / 60)}시간 {totalDuration % 60}분</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="제목 또는 URL 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="제공자 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="custom">CDN / 직접입력</SelectItem>
              <SelectItem value="upload">업로드(CDN)</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
              <SelectItem value="bunny">Bunny CDN</SelectItem>
              <SelectItem value="cloudflare">Cloudflare Stream</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead className="hidden md:table-cell">제공자</TableHead>
                <TableHead className="hidden md:table-cell">재생시간</TableHead>
                <TableHead className="hidden lg:table-cell">용량</TableHead>
                <TableHead className="hidden lg:table-cell">등록일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">로딩 중...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">등록된 동영상이 없습니다</TableCell></TableRow>
              ) : filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="h-10 w-16 rounded object-cover bg-muted" />
                      ) : (
                        <div className="h-10 w-16 rounded bg-muted flex items-center justify-center"><Video className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{v.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{v.video_url}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">{providerLabels[v.video_provider] || v.video_provider}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{v.duration_minutes ? `${v.duration_minutes}분` : "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{v.file_size_mb ? `${v.file_size_mb}MB` : "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{new Date(v.created_at).toLocaleDateString("ko")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyUrl(v.video_url)} title="URL 복사">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="열기">
                        <a href={v.video_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="수정">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(v.id)} title="삭제">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "동영상 수정" : "동영상 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">제목 *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="동영상 제목" />
            </div>
            <div>
              <label className="text-sm font-medium">동영상 URL *</label>
              <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://cdn.example.com/video.mp4" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">제공자</label>
                <Select value={form.video_provider} onValueChange={(v) => setForm({ ...form, video_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">CDN / 직접입력</SelectItem>
                    <SelectItem value="upload">업로드(CDN)</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="bunny">Bunny CDN</SelectItem>
                    <SelectItem value="cloudflare">Cloudflare Stream</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">재생시간 (분)</label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">파일 용량 (MB)</label>
                <Input type="number" value={form.file_size_mb} onChange={(e) => setForm({ ...form, file_size_mb: e.target.value })} placeholder="200" />
              </div>
              <div>
                <label className="text-sm font-medium">썸네일 URL</label>
                <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="동영상 설명 (선택)" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.video_url || saveMutation.isPending}>
              {saveMutation.isPending ? "저장 중..." : editingId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>동영상 삭제</AlertDialogTitle>
            <AlertDialogDescription>이 동영상 정보를 삭제하시겠습니까? 실제 CDN 파일은 삭제되지 않습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminVideos;
