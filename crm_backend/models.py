from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    location = Column(String)
    total_spend = Column(Float, default=0.0)
    tags = Column(JSON) # e.g., ["High Value", "Frequent"]
    last_purchase_date = Column(DateTime, nullable=True)
    
    orders = relationship("Order", back_populates="customer")
    communications = relationship("CommunicationLog", back_populates="customer")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    product = Column(String)
    category = Column(String)
    amount = Column(Float)
    order_date = Column(DateTime, default=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="orders")

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    segment_query = Column(Text) # Natural language or JSON filter
    variant_a_template = Column(Text)
    variant_b_template = Column(Text)
    channel = Column(String, default="WhatsApp")
    status = Column(String, default="Draft") # Draft, Executing, Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    communications = relationship("CommunicationLog", back_populates="campaign")

class CommunicationLog(Base):
    __tablename__ = "communication_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    channel_communication_id = Column(String, index=True, nullable=True) # ID returned by Channel Service
    status = Column(String, default="Pending") # Pending, Queued, Sent, Delivered, Opened, Read, Clicked, Converted, Failed
    variant = Column(String, nullable=True) # "A" or "B"
    personalized_message = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")
