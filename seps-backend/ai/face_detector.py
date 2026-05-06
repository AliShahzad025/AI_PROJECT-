import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os

class FaceDetector:
    def __init__(self):
        # MediaPipe Face Detection (Modern Task API)
        model_path = os.path.join(os.path.dirname(__file__), "face_detector.tflite")
        
        if not os.path.exists(model_path):
            print(f"Face Detector model not found at {model_path}")
            self.detector = None
            return

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceDetectorOptions(
            base_options=base_options,
            min_detection_confidence=0.5,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.FaceDetector.create_from_options(options)

    def detect(self, frame_bytes: bytes) -> dict:
        # Convert bytes to numpy array
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None or self.detector is None:
            return {"face_count": 0, "faces": [], "frame_with_boxes": None}

        # Convert to MediaPipe Image
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        
        # Detect faces
        detection_result = self.detector.detect(mp_image)
        
        face_list = []
        for detection in detection_result.detections:
            bbox = detection.bounding_box
            startX, startY = bbox.origin_x, bbox.origin_y
            width, height = bbox.width, bbox.height
            endX, endY = startX + width, startY + height
            
            score = detection.categories[0].score
            
            face_list.append({
                "x": int(startX),
                "y": int(startY),
                "w": int(width),
                "h": int(height),
                "confidence": float(score)
            })
            
            # Draw bounding box
            cv2.rectangle(img, (startX, startY), (endX, endY), (255, 0, 0), 2)

        # Encode back to JPEG
        _, buffer = cv2.imencode('.jpg', img)
        frame_with_boxes = buffer.tobytes()

        return {
            "face_count": len(face_list),
            "faces": face_list,
            "frame_with_boxes": frame_with_boxes
        }
