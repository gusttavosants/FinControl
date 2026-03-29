"""
Migration script to add payment tables
Run this to create the new tables in your database
"""

from database import engine, Base
import models
import models_payment

def run_migration():
    """Create all database tables"""
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    print("✅ All database tables initialized successfully!")

if __name__ == "__main__":
    run_migration()
