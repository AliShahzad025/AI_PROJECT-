import { toast } from 'sonner';

const API_URL = "http://localhost:8000/api";
export const WS_URL = "ws://localhost:8000/ws";

// Helper for making API calls
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('proctorai_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'An error occurred');
    }
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

// ---- Auth ----

export const login = async (email: string, password: string) => {
  const res = await fetchAPI("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem('proctorai_token', res.token);
  localStorage.setItem('proctorai_user', JSON.stringify(res.user));
  return res.user;
};

export const register = async (email: string, password: string, name: string) => {
  const res = await fetchAPI("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name })
  });
  localStorage.setItem('proctorai_token', res.token);
  localStorage.setItem('proctorai_user', JSON.stringify(res.user));
  return res.user;
};

export const logout = () => {
  localStorage.removeItem('proctorai_token');
  localStorage.removeItem('proctorai_user');
  window.location.href = '/login';
};

export const getUser = () => {
  const user = localStorage.getItem('proctorai_user');
  return user ? JSON.parse(user) : null;
};

// Developer toggle for testing
export const setUserRoleLocal = (role: 'admin' | 'student') => {
  const user = getUser();
  if (user) {
    user.role = role;
    localStorage.setItem('proctorai_user', JSON.stringify(user));
    window.location.reload();
  }
};

// ---- Exams ----

export const getExams = async () => {
  return await fetchAPI("/exams/");
};

export const createExam = async (name: string, date: string, time: string, createdBy: string, questions: any[]) => {
  return await fetchAPI("/exams/", {
    method: "POST",
    body: JSON.stringify({ name, date, time, createdBy, questions })
  });
};

export const deleteExam = async (id: string) => {
  return await fetchAPI(`/exams/${id}`, { method: "DELETE" });
};

export const getExamById = async (id: string) => {
  return await fetchAPI(`/exams/${id}`);
};

// ---- Submissions ----

export const submitExam = async (examId: string, studentId: string, studentName: string, studentEmail: string, answers: any, incidents: any[], trustScore: number) => {
  return await fetchAPI("/exams/submit", {
    method: "POST",
    body: JSON.stringify({
      examId, studentId, studentName, studentEmail, answers, incidents, trustScore
    })
  });
};

export const getStudentSubmissions = async (studentId: string) => {
  return await fetchAPI(`/exams/submissions/${studentId}`);
};

export const getAllSubmissions = async () => {
  return await fetchAPI("/exams/admin/submissions");
};

export const getSubmissionDetails = async (submissionId: string) => {
  // Assuming a generic approach; for now, we just get all and filter
  // since we don't have a specific endpoint yet.
  const all = await getAllSubmissions();
  return all.find((s: any) => s.id === submissionId);
};

// ---- Settings (Mock for now, as it's not implemented on backend) ----

let mockSettings = {
  sensitivity: 'medium',
  allowedApps: 'Calculator, Notepad',
  timeLimit: 120,
  lockdown: true,
  isGazeEnabled: true,
  isObjectEnabled: true,
  isAudioEnabled: true,
  isIdentityEnabled: true
};

export const getSettings = async () => {
  return mockSettings;
};

export const updateSettings = async (settings: any) => {
  mockSettings = { ...mockSettings, ...settings };
  return mockSettings;
};
