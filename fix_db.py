import sqlite3
import os

db_path = os.path.join('instance', 'app.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print("Attempting to add deleted_at column...")
        cursor.execute("ALTER TABLE note ADD COLUMN deleted_at DATETIME")
        conn.commit()
        print("Successfully added deleted_at column.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
