import sqlite3
import json
import uuid
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

DB_FILE = os.getenv("DB_FILE", "medisense_reports.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_email TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            health_score INTEGER,
            report_json TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def save_report(user_email: str, analysis_data: Dict[str, Any]) -> str:
    report_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    health_score = analysis_data.get('health_score', 0)
    
    # Store ID and date inside the JSON too for frontend convenience
    analysis_data['id'] = report_id
    analysis_data['created_at'] = created_at
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO reports (id, user_email, created_at, health_score, report_json) VALUES (?, ?, ?, ?, ?)",
        (report_id, user_email, created_at, health_score, json.dumps(analysis_data))
    )
    conn.commit()
    conn.close()
    return report_id

def get_reports_by_user(user_email: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(
        "SELECT id, created_at, health_score, report_json FROM reports WHERE user_email = ? ORDER BY created_at DESC", 
        (user_email,)
    )
    rows = c.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        data = json.loads(row['report_json'])
        # Ensure it has our DB fields
        data['id'] = row['id']
        data['created_at'] = row['created_at']
        results.append(data)
        
    return results

def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT report_json FROM reports WHERE id = ?", (report_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return json.loads(row['report_json'])
    return None

# Initialize on import
init_db()
