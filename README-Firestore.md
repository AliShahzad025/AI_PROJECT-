# Firestore Database Schema & Relationships

The Smart Exam Proctoring System (SEPS) uses Cloud Firestore as its primary database. The database is structured into five main root-level collections, designed for scalability and efficient querying based on the system's access patterns.

## Collection Relationships

### `users`
- **Role:** Central identity and profile storage.
- **Relationships:**
  - `exams.instructorId` -> `users.uid` (Instructor who created the exam)
  - `exams.enrolledStudents` -> Array of `users.uid` (Students enrolled in the exam)
  - `examSessions.studentId` -> `users.uid` (Student taking the exam)
  - `monitoringAlerts.studentId` -> `users.uid` (Student who triggered the alert)
  - `monitoringAlerts.reviewedBy` -> `users.uid` (Instructor who reviewed the alert)

### `exams`
- **Role:** Stores exam definitions, metadata, and the question bank for a specific test.
- **Relationships:**
  - Tied to a specific instructor (`instructorId`).
  - Contains an array of enrolled student UIDs (`enrolledStudents`).
  - Serves as the parent reference for all active/past sessions (`examSessions.examId`) and monitoring alerts (`monitoringAlerts.examId`).

### `examSessions`
- **Role:** Represents a single student's attempt at an exam.
- **Relationships:**
  - Links a student (`studentId`) to an exam (`examId`).
  - **One-to-Many:** One `examSession` can have many `monitoringAlerts` tied to it (`monitoringAlerts.sessionId`).

### `monitoringAlerts`
- **Role:** Logs anomalies detected by the AI proctoring engine (e.g., multiple faces, tab switching).
- **Relationships:**
  - Tied contextually to `sessionId`, `examId`, and `studentId` for easy filtering.
  - Optionally tied to the `instructorId` (via `reviewedBy`) when an instructor resolves the alert.

### `systemConfig`
- **Role:** Global settings for the application (e.g., alert thresholds, evidence retention policies).
- **Relationships:** Independent singleton document (`"global"`), not directly relational but affects the behavior of the AI engine and backend clean-up jobs.
