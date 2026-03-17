"""
Migration script to add RBAC fields to users table
Run: python migrate_add_rbac.py
"""
import sqlite3
import sys

def migrate_sqlite():
    """Add RBAC fields to SQLite database"""
    try:
        conn = sqlite3.connect('financial.db')
        cursor = conn.cursor()
        
        # Add role column
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT "user"')
            conn.commit()
            print('✅ Column role added successfully')
        except sqlite3.OperationalError as e:
            if 'duplicate column name' in str(e):
                print('⚠️  Column role already exists')
            else:
                raise
        
        # Add is_active column
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1')
            conn.commit()
            print('✅ Column is_active added successfully')
        except sqlite3.OperationalError as e:
            if 'duplicate column name' in str(e):
                print('⚠️  Column is_active already exists')
            else:
                raise
        
        conn.close()
        print('\n✅ RBAC migration completed successfully')
        return True
        
    except Exception as e:
        print(f'❌ Error during migration: {e}')
        return False


def migrate_postgresql():
    """Add RBAC fields to PostgreSQL database"""
    import psycopg2
    from dotenv import load_dotenv
    import os
    
    load_dotenv()
    
    try:
        DATABASE_URL = os.getenv("DATABASE_URL")
        if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
            print("⚠️  PostgreSQL database not configured")
            return False
        
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Add role column
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT \'user\'')
            conn.commit()
            print('✅ Column role added successfully')
        except psycopg2.OperationalError as e:
            if 'already exists' in str(e):
                print('⚠️  Column role already exists')
                conn.rollback()
            else:
                raise
        
        # Add is_active column
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true')
            conn.commit()
            print('✅ Column is_active added successfully')
        except psycopg2.OperationalError as e:
            if 'already exists' in str(e):
                print('⚠️  Column is_active already exists')
                conn.rollback()
            else:
                raise
        
        conn.close()
        print('\n✅ RBAC migration completed successfully')
        return True
        
    except Exception as e:
        print(f'❌ Error during migration: {e}')
        return False


if __name__ == "__main__":
    print("🚀 Starting RBAC migration...\n")
    
    from database import DATABASE_URL
    
    if DATABASE_URL.startswith("postgresql"):
        success = migrate_postgresql()
    else:
        success = migrate_sqlite()
    
    sys.exit(0 if success else 1)
