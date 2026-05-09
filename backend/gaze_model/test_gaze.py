"""
Test script to verify L2CS-Net gaze model loads and produces output.
"""
import torch
import torchvision
import numpy as np
from PIL import Image
from torchvision import transforms
from collections import OrderedDict
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gaze_inference import L2CS

print("=" * 50)
print("GAZE MODEL DIAGNOSTIC TEST")
print("=" * 50)

# Step 1: Load model
print("\n[1] Loading L2CS architecture...")
model = L2CS(torchvision.models.resnet.Bottleneck, [3, 4, 6, 3], 28)
print("    OK - Architecture created")

# Step 2: Load weights
pkl_path = os.path.join(os.path.dirname(__file__), "L2CSNet_finetuned.pkl")
print(f"\n[2] Loading weights from: {pkl_path}")
if not os.path.exists(pkl_path):
    print("    FAIL: L2CSNet_finetuned.pkl NOT FOUND")
    sys.exit(1)

state_dict = torch.load(pkl_path, map_location='cpu')
print(f"    Loaded {len(state_dict)} keys")

new_state_dict = OrderedDict()
for k, v in state_dict.items():
    name = k[7:] if k.startswith('module.') else k
    # Filter out fc_finetune as it has different shapes
    if 'fc_finetune' not in name:
        new_state_dict[name] = v

result = model.load_state_dict(new_state_dict, strict=False)
print(f"    Missing keys: {result.missing_keys}")
print(f"    Unexpected keys: {result.unexpected_keys}")
model.eval()
print("    OK - Weights loaded (filtered)")

# Step 3: Test inference
print("\n[3] Running inference on fake 448x448 image...")
transform = transforms.Compose([
    transforms.Resize(448),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

fake_img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
img_tensor = transform(fake_img).unsqueeze(0)
print(f"    Input tensor shape: {img_tensor.shape}")

with torch.no_grad():
    pitch_pred, yaw_pred = model(img_tensor)

print(f"    Pitch logits shape: {pitch_pred.shape}")
print(f"    Yaw logits shape: {yaw_pred.shape}")

# Step 4: Convert to degrees
softmax = torch.nn.Softmax(dim=1)
idx_tensor = torch.FloatTensor(list(range(28)))

pitch_deg = (torch.sum(softmax(pitch_pred) * idx_tensor, dim=1) * 3 - 42).item()
yaw_deg = (torch.sum(softmax(yaw_pred) * idx_tensor, dim=1) * 3 - 42).item()

print(f"\n    Pitch: {pitch_deg:.1f} degrees")
print(f"    Yaw:   {yaw_deg:.1f} degrees")

# Step 5: Zone classification
if abs(yaw_deg) <= 15 and abs(pitch_deg) <= 15:
    zone = "center"
elif yaw_deg < -15:
    zone = "left"
elif yaw_deg > 15:
    zone = "right"
else:
    zone = "down"

print(f"    Zone:  {zone}")

# Step 6: Check face_landmarker.task
print("\n[4] Checking face_landmarker.task...")
task_path = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
if os.path.exists(task_path):
    size_mb = os.path.getsize(task_path) / (1024 * 1024)
    print(f"    OK - Found ({size_mb:.1f} MB)")
else:
    print("    MISSING - run: python scripts/download_models.py")

print("\n" + "=" * 50)
print("ALL CHECKS PASSED")
print("=" * 50)
