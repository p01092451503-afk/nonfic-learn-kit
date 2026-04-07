import { useUser } from "@/contexts/UserContext";

export const useUserRole = () => {
  const { roles } = useUser();

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isTeacher = roles.includes("teacher");
  const isStudent = roles.includes("student");

  const primaryRole = isAdmin ? "admin" : isTeacher ? "teacher" : "student";

  return { roles, isSuperAdmin, isAdmin, isTeacher, isStudent, primaryRole };
};
