import urllib.request
import os

def download_file(url, filename):
    print(f"Downloading {url} to {filename}...")
    urllib.request.urlretrieve(url, filename)
    print("Done.")

def main():
    # Base directory for models
    model_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "gaze_model")
    os.makedirs(model_dir, exist_ok=True)

    # Face Landmarker Model
    face_landmarker_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    face_landmarker_path = os.path.join(model_dir, "face_landmarker.task")
    
    if not os.path.exists(face_landmarker_path):
        download_file(face_landmarker_url, face_landmarker_path)
    else:
        print("face_landmarker.task already exists.")

if __name__ == "__main__":
    main()
