from fastapi import WebSocket, WebSocketDisconnect
from ai.monitoring_engine import monitoring_engine
import json
import base64
import time

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

manager = ConnectionManager()

async def monitoring_websocket_handler(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message['type'] == 'ping':
                await websocket.send_json({"type": "pong", "timestamp": int(time.time())})
                continue
                
            if message['type'] == 'frame':
                # Decode base64 frame
                frame_data = base64.b64decode(message['data'].split(',')[1] if ',' in message['data'] else message['data'])
                # Get session info (in a real app, use a cache or injected info)
                # For this stub, we call analyze_frame directly
                # We would need student_id, etc. which should be part of the WS handshake or session state
                results = await monitoring_engine.analyze_frame(
                    frame_data, 
                    session_id, 
                    "student_uid", # Placeholder
                    "exam_id",     # Placeholder
                    "Student Name" # Placeholder
                )
                
                if results['alerts']:
                    for alert in results['alerts']:
                        await websocket.send_json({
                            "type": "alert",
                            "alertType": alert['type'],
                            "severity": alert['severity'],
                            "message": alert['description'],
                            "timestamp": int(time.time())
                        })

    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        print(f"WS Error: {str(e)}")
        manager.disconnect(session_id)
