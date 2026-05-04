from firebase.firebase_admin import bucket
import uuid

def upload_evidence(file_bytes: bytes, session_id: str, file_type: str = "image"):
    ext = "jpg" if file_type == "image" else "wav"
    folder = "images" if file_type == "image" else "audio"
    filename = f"evidence/{folder}/{session_id}/{uuid.uuid4()}.{ext}"
    
    blob = bucket.blob(filename)
    blob.upload_from_string(file_bytes, content_type=f"{folder}/{ext}")
    blob.make_public()
    return blob.public_url
