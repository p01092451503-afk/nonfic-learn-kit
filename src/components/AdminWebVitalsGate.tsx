import { useUserRole } from "@/hooks/useUserRole";
import WebVitalsMonitor from "./WebVitalsMonitor";

/**
 * Mount the Web Vitals monitor only for admin / super_admin users.
 */
const AdminWebVitalsGate = () => {
  const { roles } = useUserRole();
  const isAdmin = roles?.some((r) => r === "admin" || r === "super_admin");
  if (!isAdmin) return null;
  return <WebVitalsMonitor />;
};

export default AdminWebVitalsGate;