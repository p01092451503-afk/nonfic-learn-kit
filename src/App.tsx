import { lazy, Suspense } from "react";
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
import BrandLoader from "./components/BrandLoader";
import AppErrorBoundary from "./components/AppErrorBoundary";

// Lazy-load all non-critical routes to drastically reduce initial bundle.
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentCourses = lazy(() => import("./pages/student/StudentCourses"));
const StudentAssignments = lazy(() => import("./pages/student/StudentAssignments"));
const StudentAchievements = lazy(() => import("./pages/student/StudentAchievements"));
const CourseCatalog = lazy(() => import("./pages/student/CourseCatalog"));
const MyPage = lazy(() => import("./pages/student/MyPage"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherCourses = lazy(() => import("./pages/teacher/TeacherCourses"));
const TeacherAssignments = lazy(() => import("./pages/teacher/TeacherAssignments"));
const CreateCourse = lazy(() => import("./pages/teacher/CreateCourse"));
const TeacherStudents = lazy(() => import("./pages/teacher/TeacherStudents"));
const TeacherStudentDetail = lazy(() => import("./pages/teacher/TeacherStudentDetail"));
const TeacherNotifications = lazy(() => import("./pages/teacher/TeacherNotifications"));
const TeacherAnnouncements = lazy(() => import("./pages/teacher/TeacherAnnouncements"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminLearning = lazy(() => import("./pages/admin/AdminLearning"));
const AdminAttendance = lazy(() => import("./pages/admin/AdminAttendance"));
const AdminCompletion = lazy(() => import("./pages/admin/AdminCompletion"));
const AdminTraffic = lazy(() => import("./pages/admin/AdminTraffic"));
const AdminBranches = lazy(() => import("./pages/admin/AdminBranches"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const StudentAnnouncements = lazy(() => import("./pages/student/StudentAnnouncements"));
const AdminBoard = lazy(() => import("./pages/admin/AdminBoard"));
const AdminSurveys = lazy(() => import("./pages/admin/AdminSurveys"));
const AdminVideos = lazy(() => import("./pages/admin/AdminVideos"));
const StudentBoard = lazy(() => import("./pages/student/StudentBoard"));
const DeptAdminDashboard = lazy(() => import("./pages/DeptAdminDashboard"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const AdminEnrollments = lazy(() => import("./pages/admin/AdminEnrollments"));
const ContentPlayer = lazy(() => import("./pages/ContentPlayer"));
const AssessmentPage = lazy(() => import("./pages/AssessmentPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CourseRedirect = lazy(() => import("./components/CourseRedirect"));
const ContentRedirect = lazy(() => import("./components/ContentRedirect"));

const RouteFallback = () => null;


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
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
          </AppErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
