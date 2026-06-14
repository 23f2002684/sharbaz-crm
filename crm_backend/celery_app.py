import os
import httpx
from celery import Celery
from database import SessionLocal
from models import Campaign, CommunicationLog, Customer
from ai_service import generate_campaign_draft, parse_segment_query

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("crm_tasks", broker=redis_url, backend=redis_url)

CHANNEL_SERVICE_URL = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")

@celery_app.task
def execute_campaign_task(campaign_id: int):
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return
            
        # In a real app we'd construct a SQLAlchemy query from the parsed JSON
        # For the MVP, we simulate fetching based on the parsed segment query
        filters = parse_segment_query(campaign.segment_query)
        
        # For demonstration, we'll send to all 50 dummy customers instead of just 5
        customers = db.query(Customer).all()
        
        campaign.status = "Executing"
        db.commit()

        import random
        for customer in customers:
            comm_id = f"cmp_{campaign.id}_cust_{customer.id}"
            
            variant = "A" if random.random() < 0.5 else "B"
            template = campaign.variant_a_template if variant == "A" else campaign.variant_b_template
            msg = template.replace('{name}', customer.name) if template else f"Hi {customer.name}, check this out!"
            
            log = CommunicationLog(
                campaign_id=campaign.id,
                customer_id=customer.id,
                channel_communication_id=comm_id,
                status="Queued",
                variant=variant,
                personalized_message=msg
            )
            db.add(log)
            db.commit()
            
            payload = {
                "communication_id": comm_id,
                "recipient": customer.phone,
                "message": msg,
                "channel": campaign.channel
            }
            try:
                # Sync httpx since we are inside a celery worker (not async)
                httpx.post(f"{CHANNEL_SERVICE_URL}/send", json=payload, timeout=10.0)
            except Exception as e:
                log.status = "Failed"
                db.commit()
                print(f"Failed to dispatch: {e}")
                
        campaign.status = "Completed"
        db.commit()
    finally:
        db.close()
