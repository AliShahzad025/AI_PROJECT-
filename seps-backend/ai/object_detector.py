import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os

class ObjectDetector:
    def __init__(self):
        # MediaPipe Object Detection (Modern Task API)
        model_path = os.path.join(os.path.dirname(__file__), "efficientdet.tflite")
        
        if not os.path.exists(model_path):
            print(f"Object Detector model not found at {model_path}")
            self.detector = None
            return

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.ObjectDetectorOptions(
            base_options=base_options,
            score_threshold=0.5,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.ObjectDetector.create_from_options(options)
        
        # Unauthorized items for proctoring
        self.prohibited_categories = ["cell phone", "book", "laptop", "tablet"]

    def detect(self, frame_bytes: bytes) -> dict:
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None or self.detector is None:
            return {"objects": [], "violations": [], "frame_with_boxes": None}

        # Convert to MediaPipe Image
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        
        # Detect objects
        detection_result = self.detector.detect(mp_image)
        
        found_objects = []
        violations = []
        
        for detection in detection_result.detections:
            category = detection.categories[0]
            label = category.category_name.lower()
            score = category.score
            
            bbox = detection.bounding_box
            startX, startY = bbox.origin_x, bbox.origin_y
            width, height = bbox.width, bbox.height
            endX, endY = startX + width, startY + height
            
            found_objects.append({
                "label": label,
                "confidence": float(score),
                "box": [int(startX), int(startY), int(endX), int(endY)]
            })
            
            # Check for violations
            if label in self.prohibited_categories:
                violations.append({
                    "type": "prohibited_object",
                    "object": label,
                    "confidence": float(score)
                })
                color = (0, 0, 255) # Red for violations
                text = f"VIOLATION: {label} ({score:.2f})"
            else:
                color = (0, 255, 0) # Green for others
                text = f"{label} ({score:.2f})"
            
            # Draw on frame
            cv2.rectangle(img, (startX, startY), (endX, endY), color, 2)
            cv2.putText(img, text, (startX, startY - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        _, buffer = cv2.imencode('.jpg', img)
        return {
            "objects": found_objects,
            "violations": violations,
            "frame_with_boxes": buffer.tobytes()
        }
