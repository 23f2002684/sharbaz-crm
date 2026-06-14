import json
import random
from datetime import datetime, timedelta
from database import engine, SessionLocal
from models import Base, Customer, Order

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if we already seeded
    if db.query(Customer).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    print("Seeding dummy data...")
    
    locations = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune"]
    tags_pool = ["High Value", "Frequent", "At Risk", "Newbie", "Discount Seeker"]
    products = [
        ("Coffee Beans", "Beverage", 500),
        ("T-Shirt", "Apparel", 999),
        ("Jeans", "Apparel", 1999),
        ("Face Wash", "Beauty", 350),
        ("Lipstick", "Beauty", 750)
    ]
    
    customers = []
    # Seed Customers
    for i in range(1, 51):
        c = Customer(
            name=f"Customer {i}",
            email=f"customer{i}@example.com",
            phone=f"+9198765432{i:02d}",
            location=random.choice(locations),
            total_spend=0.0,
            tags=random.sample(tags_pool, k=random.randint(1, 3))
        )
        customers.append(c)
        db.add(c)
    
    db.commit()
    
    # Seed Orders
    for c in customers:
        num_orders = random.randint(1, 5)
        total_spend = 0
        last_date = None
        for _ in range(num_orders):
            prod, cat, base_price = random.choice(products)
            amount = base_price * random.uniform(0.9, 1.1)
            total_spend += amount
            
            order_date = datetime.utcnow() - timedelta(days=random.randint(1, 60))
            if last_date is None or order_date > last_date:
                last_date = order_date
                
            o = Order(
                customer_id=c.id,
                product=prod,
                category=cat,
                amount=amount,
                order_date=order_date
            )
            db.add(o)
            
        c.total_spend = total_spend
        c.last_purchase_date = last_date
        db.add(c)
        
    db.commit()
    print("Database seeding completed.")
    db.close()

if __name__ == "__main__":
    seed_db()
