import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export const useTrafficLogger = () => {
  const { user } = useUser();
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (!user?.id || location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    supabase
      .from("traffic_logs")
      .insert({
        user_id: user.id,
        event_type: "page_view",
        page_path: location.pathname,
        estimated_bytes: 5000, // ~5KB avg page load
      })
      .then(() => {});
  }, [location.pathname, user?.id]);
};

export const logContentAccess = async (
  userId: string,
  contentId: string,
  courseId: string,
  contentType: string,
  estimatedBytes: number = 0,
) => {
  const byteEstimate =
    contentType === "video"
      ? 50_000_000 // ~50MB video
      : contentType === "document"
        ? 2_000_000 // ~2MB document/iframe
        : 500_000; // ~500KB other

  await supabase.from("traffic_logs").insert({
    user_id: userId,
    event_type: "content_access",
    content_id: contentId,
    course_id: courseId,
    estimated_bytes: estimatedBytes || byteEstimate,
    metadata: { content_type: contentType },
  });
};
