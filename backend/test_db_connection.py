import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables from .env.test
load_dotenv(".env.test")

# Fetch variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

print(f"Trying to connect to: {HOST}:{PORT}/{DBNAME}")
print(f"User: {USER}")

# Connect to the database
try:
    connection = psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=int(PORT),
        dbname=DBNAME,
        sslmode="require"  # Required for Supabase
    )
    print("✅ Connection successful!")
    
    # Create a cursor to execute SQL queries
    cursor = connection.cursor()
    
    # Example query
    cursor.execute("SELECT NOW();")
    result = cursor.fetchone()
    print("✅ Current Time:", result)
    
    # Check if our database has tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = cursor.fetchall()
    print(f"✅ Tables found: {len(tables)}")
    for table in tables:
        print(f"   - {table[0]}")

    # Close the cursor and connection
    cursor.close()
    connection.close()
    print("✅ Connection closed.")

except Exception as e:
    print(f"❌ Failed to connect: {e}")
    import traceback
    traceback.print_exc()
