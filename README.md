# ProctorAI - Full Stack Smart Exam Proctoring System

This project is a refactored version of the Smart Exam Proctoring System, migrating from a client-side Firebase/TensorFlow architecture to a robust Full-Stack system.

## 📂 Project Structure

- **/frontend** (formerly `proctorai-exam-system`): React (TypeScript + Tailwind CSS) application.
- **/backend**: FastAPI (Python) server handling AI proctoring (OpenCV + MediaPipe) and Firebase Admin integration.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Python 3.8+
- Firebase Service Account Key (for backend)

### Installation
1. **Frontend**:
   ```bash
   cd frontend
   npm install
   ```
2. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Running the Project
You can run both the frontend and backend simultaneously from this root directory:
```bash
npm run dev
```

Or run them separately:

**Backend**:
```bash
cd backend
python main.py
```

**Frontend**:
```bash
cd frontend
npm run dev
```

## 🛠 Features
- **Server-Side AI**: Real-time face detection, gaze tracking, and object detection moved to the Python backend for better performance and security.
- **WebSocket Streaming**: Real-time frame analysis via WebSockets.
- **Secure Auth**: Custom JWT-based authentication integrated with Firebase Admin.
- **Modern UI**: Premium dark-mode interface with glassmorphism aesthetics.
