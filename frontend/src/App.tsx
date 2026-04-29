import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ExamRoom from './pages/ExamRoom';
import ExamResults from './pages/ExamResults';
import ProctoringReport from './pages/ProctoringReport';

export default function App() {
  return (
    <>
      <Toaster theme="dark" position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/admin/report/:id" element={<ProctoringReport />} />
          <Route path="/student/*" element={<StudentDashboard />} />
          <Route path="/exam/:id" element={<ExamRoom />} />
          <Route path="/results/:id" element={<ExamResults />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

