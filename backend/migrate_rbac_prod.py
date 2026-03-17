"""
Quick migration script to add RBAC fields to PostgreSQL
Run: python migrate_rbac_prod.py
"""
import psycopg2
import sys
from dotenv import load_dotenv
import os

load_dotenv()

def migrate():
    """Add RBAC fields to PostgreSQL database"""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
        print("❌ PostgreSQL DATABASE_URL not configured")
        print(f"Current DATABASE_URL: {DATABASE_URL}")
        return False
    
    # Fix postgres:// to postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    print(f"🔗 Connecting to: {DATABASE_URL[:50]}...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("\n📝 Running migrations...\n")
        
        # Add role column
        try:
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN role VARCHAR(20) DEFAULT 'user'
            """)
            conn.commit()
            print('✅ Column "role" added successfully')
        except psycopg2.OperationalError as e:
            if 'already exists' in str(e).lower():
                print('⚠️  Column "role" already exists')
                conn.rollback()
            else:
                print(f'❌ Error adding role column: {e}')
                conn.rollback()
                raise
        
        # Add is_active column
        try:
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN is_active BOOLEAN DEFAULT true
            """)
            conn.commit()
            print('✅ Column "is_active" added successfully')
        except psycopg2.OperationalError as e:
            if 'already exists' in str(e).lower():
                print('⚠️  Column "is_active" already exists')
                conn.rollback()
            else:
                print(f'❌ Error adding is_active column: {e}')
                conn.rollback()
                raise
        
        # Verify migration
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        
        print("\n📊 Users table columns:")
        for col in columns:
            print(f"   - {col[0]}")
        
        cursor.close()
        conn.close()
        
        print('\n✅ RBAC migration completed successfully!')
        print('\n🚀 Now you can:')
        print('   1. POST /api/admin/seed-admin?email=admin@email.com&senha=senha123')
        print('   2. Use admin endpoints to manage roles')
        
        return True
        
    except Exception as e:
        print(f'\n❌ Error during migration: {e}')
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("🔐 RBAC Migration Tool")
    print("=" * 60)
    success = migrate()
    sys.exit(0 if success else 1)
