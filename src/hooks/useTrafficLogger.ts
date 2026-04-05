import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export const useTrafficLogger = () => {
  const { user, profile } = useUser();
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (!user?.id || location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    supabase
      .from("traffic_logs")
      .insert({
        user_id: user.id,
        tenant_id: profile?.tenant_id || null,
        event_type: "page_view",
        page_path: location.pathname,
        estimated_bytes: 5000, // ~5KB avg page load
      })
      .then(() => {});
  }, [location.pathname, user?.id, profile?.tenant_id]);
};

/**
 * Log content access with accurate CDN byte estimation.
 *
 * - YouTube / Vimeo: CDN bytes = 0 (external platform handles streaming)
 * - Upload / Custom: estimated based on content type
 * - Document (mangoboard etc.): external iframe, CDN bytes = 0
 */
export const logContentAccess = async (
  userId: string,
  contentId: string,
  courseId: string,
  contentType: string,
  videoProvider?: string | null,
  tenantId?: string | null,
) => {
  const isExternalVideo =
    videoProvider === "youtube" || videoProvider === "vimeo";
  const isExternalDoc = contentType === "document"; // mangoboard iframe

  let byteEstimate = 0;

  if (isExternalVideo || isExternalDoc) {
    // External platforms handle CDN — no cost to us
    byteEstimate = 0;
  } else if (contentType === "video" && videoProvider === "upload") {
    byteEstimate = 50_000_000; // ~50MB self-hosted video
  } else if (contentType === "video" && videoProvider === "custom") {
    byteEstimate = 30_000_000; // ~30MB custom CDN video
  } else {
    byteEstimate = 500_000; // ~500KB other
  }

  await supabase.from("traffic_logs").insert({
    user_id: userId,
    tenant_id: tenantId || null,
    event_type: "content_access",
    content_id: contentId,
    course_id: courseId,
    estimated_bytes: byteEstimate,
    metadata: {
      content_type: contentType,
      video_provider: videoProvider || null,
      is_external: isExternalVideo || isExternalDoc,
    },
  });
};
