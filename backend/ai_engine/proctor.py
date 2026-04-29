import cv2
import numpy as np
import os
import time

# Load OpenCV's built-in Haar Cascades for face and eye detection
# These files are typically included with opencv-python
try:
    # Try to find the cascade files in the opencv package
    cascade_path = cv2.data.haarcascades
    face_cascade = cv2.CascadeClassifier(os.path.join(cascade_path, 'haarcascade_frontalface_default.xml'))
    eye_cascade = cv2.CascadeClassifier(os.path.join(cascade_path, 'haarcascade_eye.xml'))
except Exception as e:
    print(f"Warning: Could not load Haar Cascades from cv2.data: {e}")
    # Fallback to current directory or common paths if needed
    face_cascade = cv2.CascadeClassifier(cv2.samples.findFile('haarcascades/haarcascade_frontalface_default.xml'))
    eye_cascade = cv2.CascadeClassifier(cv2.samples.findFile('haarcascades/haarcascade_eye.xml'))

EVIDENCE_DIR = "uploads/evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

def process_frame(frame_bytes: bytes, student_id: str, exam_id: str):
    """
    Processes a single video frame using OpenCV Haar Cascades.
    Returns a list of alerts (strings) and optionally saves an evidence image.
    """
    alerts = []
    
    # Decode image from bytes
    nparr = np.frombuffer(frame_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return ["Failed to decode image"]

    # Convert to grayscale for Haar Cascades
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Face Detection (Count faces)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    num_faces = len(faces)
        
    if num_faces == 0:
        alerts.append("No Face Detected")
    elif num_faces > 1:
        alerts.append("Multiple Faces Detected")
        save_evidence(img, student_id, exam_id, "multiple_faces")
        
    # 2. Gaze/Head Pose Heuristic (only if 1 face is detected)
    if num_faces == 1:
        (x, y, w, h) = faces[0]
        roi_gray = gray[y:y+h, x:x+w]
        
        # Detect eyes within the face ROI
        eyes = eye_cascade.detectMultiScale(roi_gray)
        
        # Simple heuristic: If 2 eyes are not detected, they might be looking away
        # Note: Haar cascades for eyes are sensitive to lighting and glasses, 
        # so we only flag if 0 eyes are found for a while.
        if len(eyes) == 0:
            # For a more robust FYP gaze check, we can check head position
            # If the face is too close to the edge or very small, it might be a flag
            pass
        
        # Basic "Looking Away" detection:
        # If the nose/center of the face is too far from the center of the bounding box
        # But Haar cascades don't give us landmarks easily.
        # We'll stick to Face Detection for now as it's the most reliable with cascades.
    
    return alerts

def save_evidence(img, student_id: str, exam_id: str, tag: str):
    timestamp = int(time.time())
    filename = f"{exam_id}_{student_id}_{tag}_{timestamp}.jpg"
    filepath = os.path.join(EVIDENCE_DIR, filename)
    cv2.imwrite(filepath, img)
    print(f"Saved evidence: {filepath}")
