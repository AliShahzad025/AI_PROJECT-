import firebase_admin
from firebase_admin import credentials, firestore
import time
import os
import sys

def monitor():
    print("=" * 60)
    print("LIVE VIOLATION MONITOR STARTED (NO EMOJIS)")
    print("Waiting for suspicious activity to be logged in Firestore...")
    print("=" * 60)

    try:
        if not firebase_admin._apps:
            # Check for service account in standard locations
            paths = [
                "backend/serviceAccountKey.json",
                "serviceAccountKey.json",
                os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json"),
                "backend/gaze_model/serviceAccountKey.json"
            ]
            
            cred = None
            for p in paths:
                if os.path.exists(p):
                    print(f"Using credentials from: {p}")
                    cred = credentials.Certificate(p)
                    break
            
            if cred:
                firebase_admin.initialize_app(cred)
            else:
                print("No service account file found. Using default credentials.")
                firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase Init Error: {e}")
        return

    db = firestore.client()
    
    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name == 'ADDED':
                data = change.document.to_dict()
                timestamp = data.get('timestamp', 'N/A')
                direction = data.get('gaze_direction', 'N/A')
                yaw = data.get('yaw', 0)
                pitch = data.get('pitch', 0)
                
                print("\n" + "!" * 40)
                print(f"ALERT: NEW VIOLATION DETECTED!")
                print(f"Time: {timestamp}")
                print(f"Type: Gaze Away ({direction})")
                print(f"Angles: Yaw {yaw} deg, Pitch {pitch} deg")
                print("!" * 40 + "\n")

    print("Subscribing to 'proctoring_events' collection...")
    col_query = db.collection("proctoring_events")
    query_watch = col_query.on_snapshot(on_snapshot)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        query_watch.unsubscribe()

if __name__ == "__main__":
    monitor()
