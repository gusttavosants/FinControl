import sqlite3

conn = sqlite3.connect('financial.db')
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT "free"')
    conn.commit()
    print('Column plan added successfully')
except sqlite3.OperationalError as e:
    if 'duplicate column name' in str(e):
        print('Column plan already exists')
    else:
        print(f'Error: {e}')

conn.close()
