import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, Video as VideoIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ItemStatus = "queued" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseId: string;
  startOrderIndex: number;
}

const MAX_VIDEO_MB = 5120; // 5GB

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const cleanTitle = (filename: string) =>
  filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

export default function VodBulkUploadDialog({ open, onOpenChange, courseId, startOrderIndex }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => { setItems([]); setUploading(false); };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: UploadItem[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("video/")) return;
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast({ title: `${f.name}: 파일이 너무 큽니다 (최대 ${MAX_VIDEO_MB}MB)`, variant: "destructive" });
        return;
      }
      next.push({ id: crypto.randomUUID(), file: f, status: "queued", progress: 0 });
    });
    setItems((prev) => [...prev, ...next]);
  };

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    if (uploading) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const uploadOne = (item: UploadItem, orderIndex: number) =>
    new Promise<void>(async (resolve, reject) => {
      try {
        updateItem(item.id, { status: "uploading", progress: 2 });
        const { data: token, error: tokenErr } = await supabase.functions.invoke("bunny-create-video", {
          body: { title: item.file.name },
        });
        if (tokenErr || !token?.uploadUrl) throw new Error(tokenErr?.message || token?.error || "업로드 토큰 발급 실패");

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", token.uploadUrl, true);
        xhr.setRequestHeader("AccessKey", token.accessKey);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 95);
            updateItem(item.id, { progress: Math.max(2, pct) });
          }
        };
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const cdn = token.cdnHostname as string | null;
            const playUrl = cdn
              ? `https://${cdn}/${token.videoId}/playlist.m3u8`
              : `https://iframe.mediadelivery.net/play/${token.libraryId}/${token.videoId}`;
            const { error: dbErr } = await supabase.from("course_contents").insert({
              course_id: courseId,
              title: cleanTitle(item.file.name),
              content_type: "video",
              video_provider: "bunny" as any,
              video_url: playUrl,
              order_index: orderIndex,
              is_published: true,
            });
            if (dbErr) return reject(dbErr);
            updateItem(item.id, { status: "done", progress: 100 });
            resolve();
          } else {
            reject(new Error(`Bunny 업로드 실패 HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.send(item.file);
      } catch (e) {
        reject(e);
      }
    });

  const startUpload = async () => {
    if (!items.length) return;
    setUploading(true);
    let order = startOrderIndex;
    for (const item of items) {
      if (item.status === "done") continue;
      try {
        await uploadOne(item, order);
        order += 1;
      } catch (e) {
        updateItem(item.id, { status: "error", error: e instanceof Error ? e.message : "업로드 실패" });
      }
    }
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["course-contents", courseId] });
    const okCount = items.filter((i) => i.status === "done").length + 1;
    toast({ title: `차시 업로드 완료`, description: `${okCount - 1}개 차시가 추가되었습니다.` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            VOD 일괄 업로드
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); if (!uploading) addFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">동영상 파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-xs text-muted-foreground mt-1">
              영상 파일 1개당 최대 5GB · 파일명이 차시 제목으로 자동 설정됩니다
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="video/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {items.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 border-b-2 border-border/80 pb-2">
                  <div className="shrink-0 h-8 w-8 rounded bg-muted flex items-center justify-center">
                    <VideoIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{cleanTitle(it.file.name)}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(it.file.size)}</p>
                    {(it.status === "uploading" || it.status === "done") && (
                      <Progress value={it.progress} className="h-1 mt-1" />
                    )}
                    {it.status === "error" && (
                      <p className="text-xs text-destructive mt-1 truncate">{it.error}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {it.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : it.status === "error" ? <AlertCircle className="h-4 w-4 text-destructive" />
                      : it.status === "uploading" ? <Upload className="h-4 w-4 text-muted-foreground" />
                      : (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={uploading}>닫기</Button>
          </DialogClose>
          <Button onClick={startUpload} disabled={uploading || items.length === 0}>
            {uploading ? "업로드 중..." : `${items.length}개 차시 업로드 시작`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}