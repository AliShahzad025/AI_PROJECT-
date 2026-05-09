import firebase_admin
from firebase_admin import credentials, firestore
import os

def test_write():
    print("Testing Firebase Write Permissions (NO UNICODE)...")
    try:
        if not firebase_admin._apps:
            cred_path = "serviceAccountKey.json"
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
                
        db = firestore.client()
        doc_ref = db.collection("proctoring_events").document("test_connection")
        doc_ref.set({
            "session_id": "test_system",
            "type": "connection_test",
            "message": "DB WRITE SUCCESSFUL"
        })
        print("OK: DATABASE WRITE SUCCESSFUL")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_write()
