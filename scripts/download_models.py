import os
import requests

def download_file(url, path):
    print(f"Downloading {url} to {path}...")
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print("Done.")
    else:
        print(f"Failed to download {url}")

def main():
    ai_dir = os.path.join("seps-backend", "ai")
    if not os.path.exists(ai_dir):
        os.makedirs(ai_dir)

    # MediaPipe Models
    models = {
        "efficientdet.tflite": "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
        "face_detector.tflite": "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
    }

    for name, url in models.items():
        path = os.path.join(ai_dir, name)
        if not os.path.exists(path):
            download_file(url, path)
        else:
            print(f"{name} already exists.")

if __name__ == "__main__":
    main()
