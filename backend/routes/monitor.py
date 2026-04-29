from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import base64
import json
from ai_engine.proctor import process_frame
import time

router = APIRouter()

# Store active connections: (exam_id, student_id) -> WebSocket
active_connections = {}

# Cooldown dictionary to prevent spamming the same alert
# (student_id, alert_type) -> last_timestamp
alert_cooldowns = {}
COOLDOWN_SECONDS = 5

@router.websocket("/monitor/{exam_id}/{student_id}")
async def websocket_endpoint(websocket: WebSocket, exam_id: str, student_id: str):
    await websocket.accept()
    conn_key = f"{exam_id}_{student_id}"
    active_connections[conn_key] = websocket
    print(f"Client connected: {conn_key}")
    
    try:
        while True:
            # Receive text (JSON containing base64 image or just raw text)
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
                if "image" in payload:
                    # Expecting data:image/jpeg;base64,...
                    img_data = payload["image"].split(",")[1] if "," in payload["image"] else payload["image"]
                    frame_bytes = base64.b64decode(img_data)
                    
                    # Process frame via AI engine
                    alerts = process_frame(frame_bytes, student_id, exam_id)
                    
                    # Filter alerts by cooldown
                    current_time = time.time()
                    sent_alerts = []
                    
                    for alert in alerts:
                        cooldown_key = f"{student_id}_{alert}"
                        last_time = alert_cooldowns.get(cooldown_key, 0)
                        
                        if current_time - last_time > COOLDOWN_SECONDS:
                            sent_alerts.append(alert)
                            alert_cooldowns[cooldown_key] = current_time
                    
                    if sent_alerts:
                        # Send alerts back to frontend
                        for alert in sent_alerts:
                            await websocket.send_json({
                                "type": "alert",
                                "message": alert,
                                "timestamp": current_time
                            })
                            
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"Error processing frame: {e}")
                
    except WebSocketDisconnect:
        print(f"Client disconnected: {conn_key}")
        if conn_key in active_connections:
            del active_connections[conn_key]
