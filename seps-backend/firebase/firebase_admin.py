import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from config.settings import settings
import os

# Using absolute path for service account or relative to project root
cert_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
if not os.path.isabs(cert_path):
    # Try to find it in the parent directory if not found in current
    if not os.path.exists(cert_path):
        parent_cert_path = os.path.join("..", cert_path)
        if os.path.exists(parent_cert_path):
            cert_path = parent_cert_path

cred = credentials.Certificate(cert_path)
firebase_admin.initialize_app(cred, {
    'storageBucket': settings.FIREBASE_STORAGE_BUCKET
})

db = firestore.client()
bucket = storage.bucket()

def get_db():
    return db

def get_bucket():
    return bucket

def get_auth():
    return auth
