# replit_example_load.py
import sqlite3
from pathlib import Path

BASE = Path(__file__).parent
db_path = BASE / "hollow_metal.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("Tables:")
for (name,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table'"):
    print(" -", name)

print("\nSample (materials by corrosion_resistance_rank DESC):")
for row in cur.execute("SELECT material_id,name,corrosion_resistance_rank FROM materials ORDER BY corrosion_resistance_rank DESC"):
    print(row)
conn.close()
