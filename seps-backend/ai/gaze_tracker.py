import numpy as np
import cv2
import time

class GazeTracker:
    """
    Gaze tracking using OpenCV Haar Cascades for face and eye detection.
    This replaces the mediapipe-based approach which broke in v0.10.30+.
    """
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        self.gaze_history = {}  # session_id -> {"start_time": float, "last_direction": str}

    def analyze(self, frame_bytes: bytes, session_id: str) -> dict:
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"direction": "unknown", "confidence": 0.0, "is_suspicious": False, "consecutive_seconds": 0.0}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            return {"direction": "unknown", "confidence": 0.0, "is_suspicious": False, "consecutive_seconds": 0.0}

        # Use the largest face
        (fx, fy, fw, fh) = max(faces, key=lambda f: f[2] * f[3])
        face_roi_gray = gray[fy:fy+fh, fx:fx+fw]
        face_center_x = fx + fw / 2
        img_center_x = img.shape[1] / 2

        # Detect eyes within the face ROI
        eyes = self.eye_cascade.detectMultiScale(face_roi_gray, 1.1, 5, minSize=(20, 20))

        direction = "center"

        if len(eyes) >= 2:
            # Both eyes detected — check if face is centered
            face_offset_ratio = (face_center_x - img_center_x) / img_center_x
            if face_offset_ratio < -0.25:
                direction = "left"
            elif face_offset_ratio > 0.25:
                direction = "right"
        elif len(eyes) == 1:
            # Only one eye visible — likely looking to a side
            (ex, ey, ew, eh) = eyes[0]
            eye_center_in_face = ex + ew / 2
            if eye_center_in_face < fw * 0.35:
                direction = "left"
            elif eye_center_in_face > fw * 0.65:
                direction = "right"
        elif len(eyes) == 0:
            # No eyes detected — student may be looking down
            direction = "down"

        is_suspicious = direction != "center"
        now = time.time()

        if session_id not in self.gaze_history:
            self.gaze_history[session_id] = {"start_time": now if is_suspicious else None, "last_direction": direction}

        history = self.gaze_history[session_id]
        consecutive_seconds = 0.0

        if is_suspicious:
            if history["start_time"] is None or history["last_direction"] != direction:
                history["start_time"] = now
            consecutive_seconds = now - history["start_time"]
        else:
            history["start_time"] = None

        history["last_direction"] = direction

        return {
            "direction": direction,
            "confidence": 0.75,
            "is_suspicious": consecutive_seconds > 3.0,
            "consecutive_seconds": round(consecutive_seconds, 2)
        }
