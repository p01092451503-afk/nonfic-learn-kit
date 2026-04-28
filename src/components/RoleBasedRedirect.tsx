import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import RouteSkeleton from "@/components/RouteSkeleton";

const RoleBasedRedirect = () => {
  const { user, isLoading } = useUser();
  const { primaryRole } = useUserRole();
  const { teacherRoleEnabled, isLoading: settingsLoading } = useSystemSettings();

  if (isLoading || settingsLoading) {
    return <RouteSkeleton />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  switch (primaryRole) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "teacher":
      return <Navigate to={teacherRoleEnabled ? "/teacher" : "/student"} replace />;
    default:
      return <Navigate to="/student" replace />;
  }
};

export default RoleBasedRedirect;
