import cv2
import torch
import torch.nn as nn
import torchvision
from torchvision import transforms
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import base64
from collections import OrderedDict

# L2CS Model Architecture (ResNet50 based)
class L2CS(nn.Module):
    def __init__(self, block, layers, binary_number):
        super(L2CS, self).__init__()
        self.inplanes = 64
        self.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        self.layer1 = self._make_layer(block, 64, layers[0])
        self.layer2 = self._make_layer(block, 128, layers[1], stride=2)
        self.layer3 = self._make_layer(block, 256, layers[2], stride=2)
        self.layer4 = self._make_layer(block, 512, layers[3], stride=2)
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        
        # Keys from your .pkl file: fc_yaw_gaze and fc_pitch_gaze
        # These use the standard 2048 features from ResNet50
        self.fc_yaw_gaze = nn.Linear(512 * block.expansion, binary_number)
        self.fc_pitch_gaze = nn.Linear(512 * block.expansion, binary_number)
        
        # NOTE: We skip fc_finetune as it requires 2051 features and is not 
        # used for the primary gaze estimation (yaw/pitch).

    def _make_layer(self, block, planes, blocks, stride=1):
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(self.inplanes, planes * block.expansion, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(planes * block.expansion),
            )
        layers = []
        layers.append(block(self.inplanes, planes, stride, downsample))
        self.inplanes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.inplanes, planes))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        
        yaw = self.fc_yaw_gaze(x)
        pitch = self.fc_pitch_gaze(x)
        return pitch, yaw # Standard L2CS output order

# Initialize MediaPipe Tasks Face Landmarker
MODEL_DIR = os.path.dirname(__file__)
TASK_PATH = os.path.join(MODEL_DIR, "face_landmarker.task")

if not os.path.exists(TASK_PATH):
    print(f"ERROR: MediaPipe task file not found at {TASK_PATH}")
    detector = None
else:
    base_options = python.BaseOptions(model_asset_path=TASK_PATH)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=5
    )
    detector = vision.FaceLandmarker.create_from_options(options)

class GazeInference:
    def __init__(self, model_path):
        self.device = torch.device('cpu')
        self.model = L2CS(torchvision.models.resnet.Bottleneck, [3, 4, 6, 3], 28)
        
        if os.path.exists(model_path):
            try:
                state_dict = torch.load(model_path, map_location=self.device)
                
                # Filter out 'fc_finetune' as it has incompatible shapes and is not needed
                new_state_dict = OrderedDict()
                for k, v in state_dict.items():
                    name = k[7:] if k.startswith('module.') else k
                    if 'fc_finetune' not in name:
                        new_state_dict[name] = v
                
                self.model.load_state_dict(new_state_dict, strict=False)
                print("Gaze model loaded successfully (filtered fc_finetune).")
            except Exception as e:
                print(f"Error loading gaze model: {e}")
        
        self.model.to(self.device)
        self.model.eval()
        
        # CORRECT Preprocessing as per Problem 2
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize(448),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.consecutive_non_center = 0
        self.softmax = nn.Softmax(dim=1)
        self.idx_tensor = torch.arange(28).float().to(self.device)

    def process_frame(self, base64_frame):
        if detector is None: return {"gaze": "error", "message": "No detector"}
            
        try:
            encoded_data = base64_frame.split(',')[1] if ',' in base64_frame else base64_frame
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None: return {"gaze": "error"}
            
            h, w, _ = frame.shape
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = detector.detect(mp_image)
            
            if not detection_result.face_landmarks:
                return {"gaze": "no_face", "yaw": 0, "pitch": 0, "suspicious": False}
            
            if len(detection_result.face_landmarks) > 1:
                return {"gaze": "multiple_faces", "yaw": 0, "pitch": 0, "suspicious": True}
            
            landmarks = detection_result.face_landmarks[0]
            xs = [lm.x for lm in landmarks]
            ys = [lm.y for lm in landmarks]
            xmin, xmax = int(min(xs) * w), int(max(xs) * w)
            ymin, ymax = int(min(ys) * h), int(max(ys) * h)
            
            pad = 25 # Reverted to safe padding
            xmin, ymin = max(0, xmin - pad), max(0, ymin - pad)
            xmax, ymax = min(w, xmax + pad), min(h, ymax + pad)
            
            face_img = frame[ymin:ymax, xmin:xmax]
            if face_img.size == 0: return {"gaze": "no_face", "yaw": 0, "pitch": 0}
            
            # Inference with Correct Preprocessing
            face_tensor = self.transform(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                pitch_logits, yaw_logits = self.model(face_tensor)
                
                # CORRECT Angle Computation as per Problem 3
                pitch_deg = (torch.sum(self.softmax(pitch_logits) * self.idx_tensor, dim=1) * 3 - 42).item()
                yaw_deg = (torch.sum(self.softmax(yaw_logits) * self.idx_tensor, dim=1) * 3 - 42).item()
            
            # RAW DEBUG LOG
            print(f"RAW AI DATA -> Yaw: {yaw_deg:.2f}, Pitch: {pitch_deg:.2f}")
                
            gaze_zone = "center"
            if yaw_deg < -15: gaze_zone = "left"
            elif yaw_deg > 15: gaze_zone = "right"
            elif pitch_deg < -15: gaze_zone = "down"
            elif pitch_deg > 15: gaze_zone = "up"
                
            if gaze_zone != "center":
                self.consecutive_non_center += 1
            else:
                self.consecutive_non_center = 0
                
            is_suspicious = self.consecutive_non_center >= 2
            
            return {
                "gaze": gaze_zone,
                "yaw": round(yaw_deg, 2),
                "pitch": round(pitch_deg, 2),
                "suspicious": is_suspicious
            }
            
        except Exception as e:
            print(f"Inference error: {e}")
            return {"gaze": "error", "yaw": 0, "pitch": 0, "suspicious": False}
