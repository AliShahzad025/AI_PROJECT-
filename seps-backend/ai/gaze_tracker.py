import mediapipe as mp
import numpy as np
import cv2
import time

class GazeTracker:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.gaze_history = {} # session_id -> {"start_time": float, "last_direction": str}

    def analyze(self, frame_bytes: bytes, session_id: str) -> dict:
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"direction": "unknown", "confidence": 0.0, "is_suspicious": False, "consecutive_seconds": 0.0}

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(img_rgb)
        
        if not results.multi_face_landmarks:
            return {"direction": "unknown", "confidence": 0.0, "is_suspicious": False, "consecutive_seconds": 0.0}

        landmarks = results.multi_face_landmarks[0].landmark
        
        # Simple heuristic using eye landmarks
        # Right eye: 33, 133, 159, 145 (inner, outer, top, bottom)
        # Left eye: 362, 263, 386, 374
        # Iris landmarks: 468-472 (left), 473-477 (right)
        
        left_iris = landmarks[468]
        right_iris = landmarks[473]
        
        # Average iris position relative to eye corners
        # This is a stub heuristic for direction
        # In a real app, you'd calculate eye center and iris offset
        
        direction = "center"
        # Dummy logic for stub: if iris x is far from center
        if left_iris.x < 0.45: direction = "left"
        elif left_iris.x > 0.55: direction = "right"
        elif left_iris.y > 0.6: direction = "down"

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
            "confidence": 0.8,
            "is_suspicious": consecutive_seconds > 3.0,
            "consecutive_seconds": round(consecutive_seconds, 2)
        }
