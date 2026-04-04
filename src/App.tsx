import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedRedirect from "@/components/RoleBasedRedirect";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentAssignments from "./pages/student/StudentAssignments";
import StudentAchievements from "./pages/student/StudentAchievements";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import CreateCourse from "./pages/teacher/CreateCourse";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherStudentDetail from "./pages/teacher/TeacherStudentDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLearning from "./pages/admin/AdminLearning";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminCompletion from "./pages/admin/AdminCompletion";
import DeptAdminDashboard from "./pages/DeptAdminDashboard";
import CourseDetail from "./pages/CourseDetail";
import ContentPlayer from "./pages/ContentPlayer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />

            {/* Student */}
            <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/courses" element={<ProtectedRoute><StudentCourses /></ProtectedRoute>} />
            <Route path="/dashboard/assignments" element={<ProtectedRoute><StudentAssignments /></ProtectedRoute>} />
            <Route path="/dashboard/achievements" element={<ProtectedRoute><StudentAchievements /></ProtectedRoute>} />

            {/* Teacher */}
            <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute><TeacherCourses /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute><TeacherAssignments /></ProtectedRoute>} />
            <Route path="/teacher/courses/new" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/students/:studentId" element={<ProtectedRoute><TeacherStudentDetail /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute><AdminCourses /></ProtectedRoute>} />
            <Route path="/admin/courses/new" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />

            {/* Dept Admin */}
            <Route path="/dept-admin" element={<ProtectedRoute><DeptAdminDashboard /></ProtectedRoute>} />

            {/* Course Detail & Player */}
            <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/courses/:courseId/content/:contentId" element={<ProtectedRoute><ContentPlayer /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
