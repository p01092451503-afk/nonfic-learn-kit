import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";

const RoleBasedRedirect = () => {
  const { user, isLoading } = useUser();
  const { primaryRole } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="h-8 w-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  switch (primaryRole) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "teacher":
      return <Navigate to="/teacher" replace />;
    default:
      return <Navigate to="/student" replace />;
  }
};

export default RoleBasedRedirect;
