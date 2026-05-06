import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Auth
import AuthPage from './pages/AuthPage';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import VerificationRequests from './pages/VerificationRequests';
import SystemConfig from './pages/SystemConfig';

// Instructor
import InstructorDashboard from './pages/InstructorDashboard';
import ManageExams from './pages/ManageExams';
import CreateExam from './pages/CreateExam';
import EditExam from './pages/EditExam';
import ExamReview from './pages/ExamReview';
import AIExamGenerator from './pages/AIExamGenerator';

// Student
import StudentDashboard from './pages/StudentDashboard';
import ExamList from './pages/ExamList';
import ExamSession from './pages/ExamSession';
import MyViolations from './pages/MyViolations';
import ExamCompleted from './pages/ExamCompleted';

// Fallbacks
import LandingPage from './pages/LandingPage';

export default function App() {
  return (
    <>
      <Toaster theme="dark" position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/verification" element={<VerificationRequests />} />
          <Route path="/admin/config" element={<SystemConfig />} />
          
          {/* Instructor Routes */}
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/exams" element={<ManageExams />} />
          <Route path="/instructor/exams/create" element={<CreateExam />} />
          <Route path="/instructor/exams/:examId/edit" element={<EditExam />} />
          <Route path="/instructor/exams/:examId/review" element={<ExamReview />} />
          <Route path="/instructor/ai-generator" element={<AIExamGenerator />} />
          
          {/* Student Routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/exams" element={<ExamList />} />
          <Route path="/student/exams/:examId/session" element={<ExamSession />} />
          <Route path="/student/violations" element={<MyViolations />} />
          <Route path="/student/completed" element={<ExamCompleted />} />
          
          {/* Global Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

