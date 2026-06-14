from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db
from celery_app import execute_campaign_task
from ai_service import parse_segment_query, generate_insight, vector_store, generate_campaign_draft
from datetime import datetime, timedelta
import random

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Xeno CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok"}

# --- CUSTOMER APIs ---
@app.post("/api/customers", response_model=schemas.CustomerResponse)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    db_cust = models.Customer(**customer.model_dump())
    db.add(db_cust)
    db.commit()
    db.refresh(db_cust)
    
    # Embed into Vector Store for RAG
    doc_text = f"Customer {db_cust.name} located in {db_cust.location}. Tags: {', '.join(db_cust.tags)}. Total spend: {db_cust.total_spend}."
    vector_store.add_document(doc_text, {"customer_id": db_cust.id})
    
    return db_cust

@app.get("/api/customers", response_model=List[schemas.CustomerResponse])
def get_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Customer).offset(skip).limit(limit).all()

# --- CAMPAIGN APIs ---
@app.post("/api/campaigns/draft")
def generate_draft(req: schemas.DraftRequest):
    filters = parse_segment_query(req.segment_query)
    draft = generate_campaign_draft(
        segment_info=filters, 
        product_context=req.segment_query
    )
    return {"draft": draft}

@app.post("/api/campaigns")
def create_campaign(campaign: schemas.CampaignCreate, db: Session = Depends(get_db)):
    db_campaign = models.Campaign(
        name=campaign.name,
        segment_query=campaign.segment_query,
        variant_a_template=campaign.variant_a_template,
        variant_b_template=campaign.variant_b_template
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    
    # Fire celery task
    execute_campaign_task.delay(db_campaign.id)
    
    return {"status": "Campaign Queued", "campaign_id": db_campaign.id}

@app.get("/api/campaigns")
def get_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(models.Campaign).order_by(models.Campaign.created_at.desc()).all()
    result = []
    for c in campaigns:
        logs = db.query(models.CommunicationLog.status, models.CommunicationLog.variant).filter(models.CommunicationLog.campaign_id == c.id).all()
        
        stat_counts = {"A": {}, "B": {}, "Total": {}}
        for s, v in logs:
            var = v if v in ["A", "B"] else "A"
            stat_counts[var][s] = stat_counts[var].get(s, 0) + 1
            stat_counts["Total"][s] = stat_counts["Total"].get(s, 0) + 1
            
        def calc_stats(counts):
            total_queued = counts.get("Queued", 0)
            total_sent = counts.get("Sent", 0)
            total_delivered = counts.get("Delivered", 0)
            total_read = counts.get("Read", 0) + counts.get("Clicked", 0) + counts.get("Converted", 0)
            total_failed = counts.get("Failed", 0)
            return {
                "Sent": total_sent + total_delivered + total_read + total_queued + total_failed, 
                "Delivered": total_delivered + total_read, 
                "Read": total_read,
                "Failed": total_failed
            }

        result.append({
            "id": c.id,
            "name": c.name,
            "segment_query": c.segment_query,
            "status": c.status,
            "stats": calc_stats(stat_counts["Total"]),
            "variant_stats": {
                "A": calc_stats(stat_counts["A"]),
                "B": calc_stats(stat_counts["B"])
            }
        })
    return result

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    db.query(models.CommunicationLog).filter(models.CommunicationLog.campaign_id == campaign_id).delete()
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted"}

# --- SEGMENTATION API ---
@app.post("/api/segment/parse")
def parse_segment(query: str):
    parsed = parse_segment_query(query)
    return {"parsed_filters": parsed}

# --- RECEIPT API (Callback from Channel Service) ---
@app.post("/api/receipt")
def receipt_callback(payload: schemas.CallbackPayload, db: Session = Depends(get_db)):
    log = db.query(models.CommunicationLog).filter(models.CommunicationLog.channel_communication_id == payload.communication_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
        
    log.status = payload.status
    db.commit()
    return {"status": "Updated"}

# --- INSIGHTS API ---
@app.get("/api/dashboard/insights")
def get_insights(db: Session = Depends(get_db)):
    # Calculate some KPI metrics
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    campaigns = db.query(models.Campaign).count()
    
    data = {
        "total_customers": total_customers,
        "total_orders": total_orders,
        "active_campaigns": campaigns
    }
    
    insight_text = generate_insight(data)
    return {
        "kpis": data,
        "ai_insight": insight_text
    }

@app.get("/api/communications/latest")
def get_latest_communications(db: Session = Depends(get_db)):
    logs = db.query(models.CommunicationLog).order_by(models.CommunicationLog.updated_at.desc()).limit(50).all()
    res = []
    for log in logs:
        res.append({
            "id": log.id,
            "status": log.status,
            "message": log.personalized_message or "Drafting message...",
            "customer_name": log.customer.name if log.customer else "Unknown",
            "variant": log.variant,
            "updated_at": log.updated_at
        })
    return res
# --- PREDICTIVE ANALYTICS API ---
@app.get("/api/dashboard/predictive")
def get_predictive_analytics(db: Session = Depends(get_db)):
    # 1. 30-Day Revenue Forecast
    # Real-time data: Group orders by date for the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    orders = db.query(models.Order).filter(models.Order.order_date >= thirty_days_ago).all()
    
    daily_revenue = {}
    for o in orders:
        day_str = o.order_date.strftime("%Y-%m-%d")
        daily_revenue[day_str] = daily_revenue.get(day_str, 0) + o.amount
        
    # Sort and create a simple moving average / linear trend for the next 30 days
    sorted_days = sorted(daily_revenue.keys())
    values = [daily_revenue[d] for d in sorted_days]
    
    # Realistic projection: Add 0.5% growth trend + random daily variance
    avg_recent = sum(values[-7:]) / 7 if len(values) >= 7 else (sum(values) / len(values) if values else 1000)
    
    forecast_values = []
    base_val = avg_recent
    for i in range(1, 31):
        daily_variance = random.uniform(-0.02, 0.03)
        base_val = base_val * (1 + 0.005 + daily_variance)
        forecast_values.append(round(base_val, 2))
    
    forecast_labels = [(datetime.utcnow() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, 31)]

    # 2. Churn Risk
    # Logic: Customers who haven't bought in 45+ days but have >1 previous orders are high risk.
    forty_five_days_ago = datetime.utcnow() - timedelta(days=45)
    high_risk_count = db.query(models.Customer).filter(
        models.Customer.last_purchase_date < forty_five_days_ago,
        models.Customer.total_spend > 0
    ).count()
    
    safe_count = db.query(models.Customer).filter(
        models.Customer.last_purchase_date >= forty_five_days_ago
    ).count()

    total_custs = db.query(models.Customer).count()
    new_or_inactive = total_custs - (high_risk_count + safe_count)

    return {
        "revenue_forecast": {
            "labels": forecast_labels,
            "values": forecast_values
        },
        "churn_risk": {
            "high_risk": high_risk_count,
            "safe": safe_count,
            "new_or_inactive": new_or_inactive if new_or_inactive > 0 else 0
        }
    }
