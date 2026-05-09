import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Video as VideoIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Provider = string | null | undefined;

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([^&?#/]+)/);
  return m ? m[1] : null;
}
function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
function isHls(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url);
}
function deriveBunnyThumbnail(url: string): string | null {
  // Pattern: https://<host>/<videoId>/playlist.m3u8 → https://<host>/<videoId>/thumbnail.jpg
  const m = url.match(/^(https?:\/\/[^/]+\/[^/]+)\/playlist\.m3u8/i);
  return m ? `${m[1]}/thumbnail.jpg` : null;
}

function getThumbnailUrl(url: string, provider: Provider): string | null {
  if (!url) return null;
  const yt = getYouTubeId(url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  if (provider === "upload" || provider === "bunny" || isHls(url)) {
    return deriveBunnyThumbnail(url);
  }
  return null;
}

interface Props {
  videoUrl: string;
  provider?: Provider;
  title?: string;
}

export default function VideoPreview({ videoUrl, provider, title }: Props) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const thumb = getThumbnailUrl(videoUrl, provider);
  const [thumbBroken, setThumbBroken] = useState(false);

  const yt = getYouTubeId(videoUrl);
  const vm = getVimeoId(videoUrl);
  const hls = isHls(videoUrl);

  useEffect(() => {
    if (!open || !hls || yt || vm) return;
    const v = videoRef.current;
    if (!v) return;
    if (Hls.isSupported()) {
      const h = new Hls();
      h.loadSource(videoUrl);
      h.attachMedia(v);
      hlsRef.current = h;
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = videoUrl;
    }
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [open, hls, videoUrl, yt, vm]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-lg border border-border bg-muted aspect-video"
        aria-label={`${title || "동영상"} 미리보기`}
      >
        {thumb && !thumbBroken ? (
          <img
            src={thumb}
            alt={title || "video thumbnail"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setThumbBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <VideoIcon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="h-12 w-12 rounded-full bg-white/95 flex items-center justify-center shadow-md">
            <Play className="h-5 w-5 text-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm font-medium truncate">{title || "동영상 미리보기"}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {yt ? (
              <iframe
                src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
                className="w-full h-full"
                title={title || "youtube"}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : vm ? (
              <iframe
                src={`https://player.vimeo.com/video/${vm}?autoplay=1`}
                className="w-full h-full"
                title={title || "vimeo"}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : hls ? (
              <video ref={videoRef} controls autoPlay playsInline className="w-full h-full bg-black" />
            ) : (
              <video src={videoUrl} controls autoPlay playsInline className="w-full h-full bg-black" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}