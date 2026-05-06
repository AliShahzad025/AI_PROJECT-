import { toast } from 'sonner';

const API_URL = "http://127.0.0.1:8000/api";
export const WS_URL = "ws://127.0.0.1:8000/ws";

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

export const googleLogin = async (idToken: string) => {
  const res = await fetchAPI("/auth/google-login", {
    method: "POST",
    body: JSON.stringify({ idToken })
  });
  localStorage.setItem('proctorai_token', res.token);
  localStorage.setItem('proctorai_user', JSON.stringify(res.user));
  return res.user;
};

export const register = async (email: string, password: string, name: string, role: string) => {
  const res = await fetchAPI("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, role })
  });
  localStorage.setItem('proctorai_token', res.token);
  localStorage.setItem('proctorai_user', JSON.stringify(res.user));
  return res.user;
};

export const logout = () => {
  localStorage.removeItem('proctorai_token');
  localStorage.removeItem('proctorai_user');
  window.dispatchEvent(new Event('proctorai_auth_change'));
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
    window.dispatchEvent(new Event('proctorai_auth_change'));
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

// ---- Settings (Mock for now) ----

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

// ---- Subscriptions (Mocking real-time behavior for the UI) ----

export const subscribeToExams = (callback: (exams: any[]) => void) => {
  getExams().then(callback).catch(() => callback([]));
  const interval = setInterval(() => getExams().then(callback), 10000);
  return () => clearInterval(interval);
};

export const subscribeToSettings = (callback: (settings: any) => void) => {
  getSettings().then(callback);
  return () => { };
};

export const subscribeToSubmissions = (callback: (submissions: any[]) => void) => {
  getAllSubmissions().then(callback).catch(() => callback([]));
  const interval = setInterval(() => getAllSubmissions().then(callback), 10000);
  return () => clearInterval(interval);
};

export const subscribeToStudentSubmissions = (studentId: string, callback: (submissions: any[]) => void) => {
  getStudentSubmissions(studentId).then(callback).catch(() => callback([]));
  const interval = setInterval(() => getStudentSubmissions(studentId).then(callback), 10000);
  return () => clearInterval(interval);
};

export const getUsers = async () => {
  return await fetchAPI("/users/");
};

export const verifyUser = async (uid: string) => {
  return await fetchAPI(`/users/${uid}/verify`, { method: "POST" });
};

export const deleteUser = async (uid: string) => {
  return await fetchAPI(`/users/${uid}`, { method: "DELETE" });
};

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  getUsers().then(callback).catch(() => callback([]));
  const interval = setInterval(() => getUsers().then(callback), 10000);
  return () => clearInterval(interval);
};

export const setUserRole = async (uid: string, email: string, name: string, role: string) => {
  const res = await fetchAPI(`/users/${uid}/role`, { 
    method: "POST",
    body: JSON.stringify({ role })
  });
  
  const user = getUser();
  if (user && user.uid === uid) {
    user.role = role;
    localStorage.setItem('proctorai_user', JSON.stringify(user));
    window.dispatchEvent(new Event('proctorai_auth_change'));
  }
  return res;
};
