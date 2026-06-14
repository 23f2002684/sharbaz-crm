import asyncio
import random
import httpx
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI(title="Channel Service Stub")

CRM_RECEIPT_URL = os.getenv("CRM_RECEIPT_URL", "http://localhost:8000/api/receipt")

class SendRequest(BaseModel):
    communication_id: str
    recipient: str
    message: str
    channel: str

class CallbackPayload(BaseModel):
    communication_id: str
    status: str

async def simulate_lifecycle(communication_id: str):
    r = random.random()
    if r < 0.15:
        final_state = "Failed"
    elif r < 0.30:
        final_state = "Sent"
    elif r < 0.50:
        final_state = "Delivered"
    else:
        final_state = "Read"

    progression = []
    if final_state == "Failed":
        if random.random() < 0.5:
            progression = ["Failed"]
        else:
            progression = ["Sent", "Failed"]
    elif final_state == "Sent":
        progression = ["Sent"]
    elif final_state == "Delivered":
        progression = ["Sent", "Delivered"]
    elif final_state == "Read":
        progression = ["Sent", "Delivered", "Read"]
        
    for status in progression:
        await asyncio.sleep(random.uniform(1.0, 3.0))
        await send_callback(communication_id, status)

    if final_state == "Read":
        if random.random() < 0.3:
            await asyncio.sleep(random.uniform(1.0, 3.0))
            await send_callback(communication_id, "Clicked")
            if random.random() < 0.5:
                await asyncio.sleep(random.uniform(1.0, 3.0))
                await send_callback(communication_id, "Converted")

async def send_callback(communication_id: str, status: str):
    payload = CallbackPayload(communication_id=communication_id, status=status)
    async with httpx.AsyncClient() as client:
        try:
            await client.post(CRM_RECEIPT_URL, json=payload.model_dump(), timeout=10.0)
        except Exception as e:
            print(f"Failed to send callback for {communication_id}: {e}")

@app.post("/send")
async def send_message(req: SendRequest, background_tasks: BackgroundTasks):
    # Acknowledge immediately (Queued state is implicit upon receipt)
    background_tasks.add_task(simulate_lifecycle, req.communication_id)
    return {"status": "Queued", "communication_id": req.communication_id}
