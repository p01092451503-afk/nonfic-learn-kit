import { useUser } from "@/contexts/UserContext";

export const useUserRole = () => {
  const { roles } = useUser();

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");
  const isStudent = roles.includes("student");

  const primaryRole = isAdmin ? "admin" : isTeacher ? "teacher" : "student";

  return { roles, isAdmin, isTeacher, isStudent, primaryRole };
};
