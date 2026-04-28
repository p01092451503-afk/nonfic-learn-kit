import { useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import WebVitalsMonitor from "./WebVitalsMonitor";

/**
 * Mount the Web Vitals monitor only for admin / super_admin users
 * AND only when they're on /admin pages.
 */
const AdminWebVitalsGate = () => {
  const { isAdmin } = useUserRole();
  const location = useLocation();
  if (!isAdmin) return null;
  if (!location.pathname.startsWith("/admin")) return null;
  return <WebVitalsMonitor />;
};

export default AdminWebVitalsGate;