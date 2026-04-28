import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import RoleBasedRedirect from "@/components/RoleBasedRedirect";
import Auth from "./pages/Auth"; // keep eager: first paint
import TrafficLogger from "./components/TrafficLogger";
import AdminWebVitalsGate from "./components/AdminWebVitalsGate";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentAssignments from "./pages/student/StudentAssignments";
import StudentAchievements from "./pages/student/StudentAchievements";
import CourseCatalog from "./pages/student/CourseCatalog";
import MyPage from "./pages/student/MyPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import CreateCourse from "./pages/teacher/CreateCourse";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherStudentDetail from "./pages/teacher/TeacherStudentDetail";
import TeacherNotifications from "./pages/teacher/TeacherNotifications";
import TeacherAnnouncements from "./pages/teacher/TeacherAnnouncements";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLearning from "./pages/admin/AdminLearning";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminCompletion from "./pages/admin/AdminCompletion";
import AdminTraffic from "./pages/admin/AdminTraffic";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import StudentAnnouncements from "./pages/student/StudentAnnouncements";
import AdminBoard from "./pages/admin/AdminBoard";
import AdminSurveys from "./pages/admin/AdminSurveys";
import AdminVideos from "./pages/admin/AdminVideos";
import StudentBoard from "./pages/student/StudentBoard";
import DeptAdminDashboard from "./pages/DeptAdminDashboard";
import CourseDetail from "./pages/CourseDetail";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import ContentPlayer from "./pages/ContentPlayer";
import AssessmentPage from "./pages/AssessmentPage";
import NotFound from "./pages/NotFound";
import CourseRedirect from "./components/CourseRedirect";
import ContentRedirect from "./components/ContentRedirect";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5min — data considered fresh, no refetch
      gcTime: 15 * 60 * 1000,         // 15min — keep in cache after unmount
      refetchOnWindowFocus: false,     // prevent refetch storms with 9K users
      retry: 1,                        // reduce retry pressure on DB
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TrafficLogger />
          <AdminWebVitalsGate />
          <AppErrorBoundary>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />

            {/* Student */}
            <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/courses" element={<ProtectedRoute><StudentCourses /></ProtectedRoute>} />
            <Route path="/dashboard/assignments" element={<ProtectedRoute><StudentAssignments /></ProtectedRoute>} />
            <Route path="/dashboard/achievements" element={<ProtectedRoute><StudentAchievements /></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute><CourseCatalog /></ProtectedRoute>} />
            <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
            <Route path="/student/announcements" element={<ProtectedRoute><StudentAnnouncements /></ProtectedRoute>} />
            <Route path="/student/board" element={<ProtectedRoute><StudentBoard /></ProtectedRoute>} />

            {/* Teacher */}
            <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute><TeacherCourses /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute><TeacherAssignments /></ProtectedRoute>} />
            <Route path="/teacher/courses/new" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/edit" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/students/:studentId" element={<ProtectedRoute><TeacherStudentDetail /></ProtectedRoute>} />
            <Route path="/teacher/notifications" element={<ProtectedRoute><TeacherNotifications /></ProtectedRoute>} />
            <Route path="/teacher/announcements" element={<ProtectedRoute><TeacherAnnouncements /></ProtectedRoute>} />
            <Route path="/teacher/board" element={<ProtectedRoute><AdminBoard role="teacher" /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute><AdminAttendance role="teacher" /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin/courses/new" element={<AdminRoute><CreateCourse /></AdminRoute>} />
            <Route path="/admin/courses/:courseId/edit" element={<AdminRoute><CreateCourse /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/enrollments" element={<AdminRoute><AdminEnrollments /></AdminRoute>} />
            <Route path="/admin/learning" element={<AdminRoute><AdminLearning /></AdminRoute>} />
            <Route path="/admin/attendance" element={<AdminRoute><AdminAttendance role="admin" /></AdminRoute>} />
            <Route path="/admin/completion" element={<AdminRoute><AdminCompletion /></AdminRoute>} />
            <Route path="/admin/traffic" element={<AdminRoute><AdminTraffic /></AdminRoute>} />
            <Route path="/admin/branches" element={<AdminRoute><AdminBranches /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
            <Route path="/admin/board" element={<AdminRoute><AdminBoard role="admin" /></AdminRoute>} />
            <Route path="/admin/surveys" element={<AdminRoute><AdminSurveys /></AdminRoute>} />
            <Route path="/admin/videos" element={<AdminRoute><AdminVideos /></AdminRoute>} />

            {/* Dept Admin */}
            <Route path="/dept-admin" element={<ProtectedRoute><DeptAdminDashboard /></ProtectedRoute>} />

            {/* Course Detail & Content Player (role-based) */}
            <Route path="/admin/courses/:courseId" element={<AdminRoute><CourseDetail /></AdminRoute>} />
            <Route path="/teacher/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/admin/courses/:courseId/content/:contentId" element={<AdminRoute><ContentPlayer /></AdminRoute>} />
            <Route path="/teacher/courses/:courseId/content/:contentId" element={<ProtectedRoute><ContentPlayer /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId/content/:contentId" element={<ProtectedRoute><ContentPlayer /></ProtectedRoute>} />
            <Route path="/admin/courses/:courseId/assessment/:assessmentId" element={<AdminRoute><AssessmentPage /></AdminRoute>} />
            <Route path="/teacher/courses/:courseId/assessment/:assessmentId" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId/assessment/:assessmentId" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />

            {/* Legacy generic routes → redirect to role-based paths */}
            <Route path="/courses/:courseId" element={<ProtectedRoute><CourseRedirect /></ProtectedRoute>} />
            <Route path="/courses/:courseId/content/:contentId" element={<ProtectedRoute><ContentRedirect /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AppErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
