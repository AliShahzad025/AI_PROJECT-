import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ExamRoom from './pages/ExamRoom';
import ExamResults from './pages/ExamResults';
import ProctoringReport from './pages/ProctoringReport';
import InstructorDashboard from './pages/InstructorDashboard';
import ManageExams from './pages/ManageExams';
import CreateExam from './pages/CreateExam';
import EditExam from './pages/EditExam';
import ExamReview from './pages/ExamReview';
import UserManagement from './pages/UserManagement';


export default function App() {
  return (
    <>
      <Toaster theme="dark" position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/report/:id" element={<ProctoringReport />} />
          
          {/* Instructor Routes */}
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/exams" element={<ManageExams />} />
          <Route path="/instructor/exams/create" element={<CreateExam />} />
          <Route path="/instructor/exams/:examId/edit" element={<EditExam />} />
          <Route path="/instructor/exams/:examId/review" element={<ExamReview />} />
          
          {/* Student Routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/exams" element={<StudentDashboard />} /> {/* Assuming StudentDashboard handles list */}
          <Route path="/student/exams/:id/session" element={<ExamRoom />} />
          
          <Route path="/results/:id" element={<ExamResults />} />

        </Routes>
      </BrowserRouter>
    </>
  );
}

