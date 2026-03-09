"""
Migration script to add payment tables
Run this to create the new tables in your database
"""

from database import engine, Base
from models_payment import Subscription, Payment

def run_migration():
    """Create payment tables"""
    print("Creating payment tables...")
    Base.metadata.create_all(bind=engine, tables=[
        Subscription.__table__,
        Payment.__table__
    ])
    print("✅ Payment tables created successfully!")

if __name__ == "__main__":
    run_migration()
