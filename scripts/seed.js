const admin = require('firebase-admin');

// Ensure you have FIREBASE_APPLICATION_CREDENTIALS environment variable set
// Alternatively, pass your serviceAccountKey.json path directly:
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });


const db = admin.firestore();

async function seedData() {
  console.log('Starting SEPS Firestore seed process...');

  try {
    // 1. Create Users
    console.log('Creating users...');
    const usersRef = db.collection('users');
    
    const adminUser = {
      uid: 'admin_123',
      email: 'admin@seps.edu',
      displayName: 'System Admin',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    };
    await usersRef.doc(adminUser.uid).set(adminUser);

    const instructor1 = {
      uid: 'instructor_1',
      email: 'instructor1@seps.edu',
      displayName: 'Dr. John Doe',
      role: 'instructor',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    };
    await usersRef.doc(instructor1.uid).set(instructor1);

    const instructor2 = {
      uid: 'instructor_2',
      email: 'instructor2@seps.edu',
      displayName: 'Prof. Jane Smith',
      role: 'instructor',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    };
    await usersRef.doc(instructor2.uid).set(instructor2);

    const students = [];
    for (let i = 1; i <= 5; i++) {
      const student = {
        uid: `student_${i}`,
        email: `student${i}@seps.edu`,
        displayName: `Student ${i}`,
        role: 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      };
      await usersRef.doc(student.uid).set(student);
      students.push(student.uid);
    }

    // 2. Create Exams
    console.log('Creating exams...');
    const examsRef = db.collection('exams');
    
    const scheduledExamRef = examsRef.doc();
    const scheduledExam = {
      examId: scheduledExamRef.id,
      title: 'Midterm Mathematics',
      description: 'Calculus and Algebra midterm exam.',
      instructorId: instructor1.uid,
      instructorName: instructor1.displayName,
      scheduledDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000 * 2)), // 2 days from now
      durationMinutes: 90,
      status: 'scheduled',
      questions: [
        {
          questionId: 'q1',
          questionText: 'What is the derivative of x^2?',
          questionType: 'mcq',
          options: ['x', '2x', 'x^2', '2'],
          correctAnswer: '2x'
        }
      ],
      enrolledStudents: students,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      maxStudents: 50
    };
    await scheduledExamRef.set(scheduledExam);

    const completedExamRef = examsRef.doc();
    const completedExam = {
      examId: completedExamRef.id,
      title: 'Intro to Computer Science',
      description: 'Final exam for CS101.',
      instructorId: instructor2.uid,
      instructorName: instructor2.displayName,
      scheduledDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 2)), // 2 days ago
      durationMinutes: 120,
      status: 'completed',
      questions: [
        {
          questionId: 'q1',
          questionText: 'Explain the difference between a stack and a queue.',
          questionType: 'short_answer',
          options: [],
          correctAnswer: ''
        }
      ],
      enrolledStudents: students.slice(0, 3), // Only first 3 students enrolled
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      maxStudents: 30
    };
    await completedExamRef.set(completedExam);

    // 3. Create Monitoring Alerts
    console.log('Creating monitoring alerts...');
    const alertsRef = db.collection('monitoringAlerts');
    
    // Alert 1
    await alertsRef.add({
      sessionId: 'session_123',
      examId: scheduledExam.examId,
      studentId: students[0],
      studentName: 'Student 1',
      alertType: 'multiple_faces',
      severity: 'high',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Second person detected in frame',
      evidenceImageURL: 'https://storage.googleapis.com/...',
      evidenceAudioURL: null,
      reviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      confidenceScore: 0.95
    });

    // Alert 2
    await alertsRef.add({
      sessionId: 'session_124',
      examId: scheduledExam.examId,
      studentId: students[1],
      studentName: 'Student 2',
      alertType: 'tab_switch',
      severity: 'medium',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Browser tab lost focus for 10 seconds',
      evidenceImageURL: null,
      evidenceAudioURL: null,
      reviewed: true,
      reviewedBy: instructor1.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewNote: 'Student was adjusting brightness.',
      confidenceScore: 1.0
    });

    // Alert 3
    await alertsRef.add({
      sessionId: 'session_125',
      examId: completedExam.examId,
      studentId: students[2],
      studentName: 'Student 3',
      alertType: 'audio_anomaly',
      severity: 'low',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Background talking detected',
      evidenceImageURL: null,
      evidenceAudioURL: 'https://storage.googleapis.com/...',
      reviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      confidenceScore: 0.82
    });

    // 4. Create System Config
    console.log('Creating system config...');
    const configRef = db.collection('systemConfig').doc('global');
    await configRef.set({
      maxConcurrentStudents: 100,
      gazeDeviationThresholdSeconds: 3,
      audioAnomalyThreshold: 0.75,
      evidenceRetentionDays: 90,
      allowedBrowsers: ['Chrome', 'Firefox', 'Edge']
    });

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

seedData();
