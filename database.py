import psycopg2
from psycopg2 import sql
import os

# Update these to match your environment
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", 5432),
    "dbname": os.getenv("DB_NAME", "app_db"),
    "user": os.getenv("DB_USER", "app_user"),
    "password": os.getenv("DB_PASSWORD", "password"),
}

SQL_FILE = "db.sql"


def get_db():
    conn = psycopg2.connect(**DB_CONFIG)
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    try:
        with open(SQL_FILE, 'r') as sql_startup:
            db_data = sql_startup.read()
        c.execute(db_data)

    except Exception as e:
        conn.rollback()  # Undo changes if something fails
        print(f"Error: {e}")
    finally:
        conn.commit()
        conn.close()

def feed_data():
    conn = get_db()
    c = conn.cursor()

    #c.execute("INSERT INTO players (username) VALUES (%s) RETURNING id", ("hduy", ))
    #user_id = c.fetchone()[0]
    #print("UID", user_id)
    #c.execute("INSERT INTO sessions (date, owner) VALUES (%s, %s)", ("04-04-2026", user_id))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database Created!!!")
