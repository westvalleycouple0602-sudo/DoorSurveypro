from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sqlite3, os

DB_PATH = os.environ.get("DB_PATH", "door_ref.db")

app = FastAPI(title="Door Reference API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/doors")
def list_doors(limit: int = 200, offset: int = 0, category: str = None, material: str = None):
    sql = "SELECT * FROM door_reference WHERE 1=1"
    params = []
    if category:
        sql += " AND category = ?"
        params.append(category)
    if material:
        sql += " AND material = ?"
        params.append(material)
    sql += " ORDER BY id LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    con.close()
    return [dict(zip(cols, r)) for r in rows]

@app.get("/doors/{door_id}")
def get_door(door_id: int):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT * FROM door_reference WHERE id=?", (door_id,))
    r = cur.fetchone()
    cols = [c[0] for c in cur.description]
    con.close()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(zip(cols, r))

@app.get("/options/{field}")
def get_options(field: str):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT value FROM options_lookup WHERE field=?", (field,))
    rows = [r[0] for r in cur.fetchall()]
    con.close()
    return {"field": field, "options": rows}

@app.get("/reference/survey")
def survey_reference():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT topic, guidance FROM survey_field_reference")
    rows = [{"topic": r[0], "guidance": r[1]} for r in cur.fetchall()]
    con.close()
    return rows

@app.get("/reference/hardware_locations")
def hardware_locations():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT item, recommended_centerline_in FROM hardware_location_cheat")
    rows = [{"item": r[0], "recommended_centerline_in": r[1]} for r in cur.fetchall()]
    con.close()
    return rows

@app.get("/reference/edge_lite_types")
def edge_lite_types():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT category, examples_or_notes FROM edge_lite_types_hmma_810")
    rows = [{"category": r[0], "examples_or_notes": r[1]} for r in cur.fetchall()]
    con.close()
    return rows

# Mount the static frontend (serves index.html at '/')
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
