import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Video as VideoIcon, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface VideoAsset {
  id: string;
  title: string;
  video_url: string;
  video_provider: string;
  duration_minutes: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (video: { url: string; provider: string; title: string; duration_minutes: number | null }) => void;
}

export default function VideoLibraryPicker({ open, onOpenChange, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["video-library-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_assets")
        .select("id,title,video_url,video_provider,duration_minutes,thumbnail_url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VideoAsset[];
    },
    enabled: open,
  });

  const filtered = videos.filter((v) => {
    const q = search.toLowerCase();
    return !q || v.title.toLowerCase().includes(q) || v.video_url.toLowerCase().includes(q);
  });

  const selected = videos.find((v) => v.id === selectedId) || null;

  const handleConfirm = () => {
    if (!selected) return;
    onSelect({
      url: selected.video_url,
      provider: selected.video_provider,
      title: selected.title,
      duration_minutes: selected.duration_minutes,
    });
    onOpenChange(false);
    setSelectedId(null);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSelectedId(null); setSearch(""); } }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>동영상 라이브러리에서 선택</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="제목 또는 URL로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border divide-y">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">불러오는 중...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">등록된 동영상이 없습니다.</p>
            ) : (
              filtered.map((v) => {
                const isSelected = v.id === selectedId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${isSelected ? "bg-accent" : "hover:bg-muted/50"}`}
                  >
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="h-12 w-20 rounded object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="h-12 w-20 rounded bg-muted flex items-center justify-center shrink-0">
                        <VideoIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.video_url}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{v.video_provider}</Badge>
                        {v.duration_minutes ? (
                          <span className="text-[10px] text-muted-foreground">{v.duration_minutes}분</span>
                        ) : null}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleConfirm} disabled={!selected}>선택 적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}