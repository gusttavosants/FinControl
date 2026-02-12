"""
Migration script: Add user_id columns to financial tables and create shared_accounts table.
Safe to run multiple times - checks if columns/tables already exist.
Does NOT delete any existing data.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "financial.db")


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create shared_accounts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shared_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL REFERENCES users(id),
            partner_id INTEGER REFERENCES users(id),
            partner_email VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ shared_accounts table ready")

    # 2. Add user_id column to financial tables (if not exists)
    tables = ["receitas", "despesas", "orcamento_categorias", "metas", "notifications"]
    for table in tables:
        # Check if column exists
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        if "user_id" not in columns:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER REFERENCES users(id)")
            print(f"✅ Added user_id to {table}")
        else:
            print(f"⏭️  user_id already exists in {table}")

    conn.commit()
    conn.close()
    print("\n🎉 Migration complete! No data was deleted.")


if __name__ == "__main__":
    migrate()
