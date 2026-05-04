import cv2
import numpy as np

class FaceDetector:
    def __init__(self):
        # Load Haar Cascade as a robust fallback for face detection
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    def detect(self, frame_bytes: bytes) -> dict:
        # Convert bytes to numpy array
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"face_count": 0, "faces": [], "frame_with_boxes": None}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        face_list = []
        for (x, y, w, h) in faces:
            face_list.append({
                "x": int(x),
                "y": int(y),
                "w": int(w),
                "h": int(h),
                "confidence": 1.0 # Haar cascade doesn't provide easy confidence
            })
            # Draw bounding box
            cv2.rectangle(img, (x, y), (x+w, y+h), (255, 0, 0), 2)

        # Encode back to JPEG
        _, buffer = cv2.imencode('.jpg', img)
        frame_with_boxes = buffer.tobytes()

        return {
            "face_count": len(face_list),
            "faces": face_list,
            "frame_with_boxes": frame_with_boxes
        }
