import { useUserRole } from "@/hooks/useUserRole";
import WebVitalsMonitor from "./WebVitalsMonitor";

/**
 * Mount the Web Vitals monitor only for admin / super_admin users.
 */
const AdminWebVitalsGate = () => {
  const { isAdmin } = useUserRole();
  if (!isAdmin) return null;
  return <WebVitalsMonitor />;
};

export default AdminWebVitalsGate;