from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: str
    phone: str
    location: str
    total_spend: float = 0.0
    tags: List[str] = []

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    last_purchase_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: int
    product: str
    category: str
    amount: float

class CampaignCreate(BaseModel):
    name: str
    segment_query: str
    variant_a_template: Optional[str] = None
    variant_b_template: Optional[str] = None

class DraftRequest(BaseModel):
    segment_query: str

class CallbackPayload(BaseModel):
    communication_id: str
    status: str
