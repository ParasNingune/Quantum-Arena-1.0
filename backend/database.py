import os
import uuid
import copy
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from pymongo import MongoClient, DESCENDING
from pymongo.collection import Collection

load_dotenv()

_CLIENT: Optional[MongoClient] = None
_COLLECTION: Optional[Collection] = None


def _coerce_int(value: Optional[str], default: int) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except ValueError:
        return default


def _discover_mongodb_uri() -> str:
    uri = (
        os.getenv("MONGODB_URI")
        or os.getenv("MONGO_URI")
        or os.getenv("MONGO_CONNECTION_STRING")
    )
    if uri:
        return uri

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if line.startswith("mongodb://") or line.startswith("mongodb+srv://"):
                    return line

    raise RuntimeError(
        "MongoDB URI not found. Set MONGODB_URI (or MONGO_URI) in backend/.env"
    )


def _get_collection() -> Collection:
    global _CLIENT, _COLLECTION
    if _COLLECTION is not None:
        return _COLLECTION

    mongodb_uri = _discover_mongodb_uri()
    db_name = os.getenv("MONGODB_DB_NAME", "medisense")
    collection_name = os.getenv("MONGODB_REPORTS_COLLECTION", "reports")

    _CLIENT = MongoClient(
        mongodb_uri,
        serverSelectionTimeoutMS=_coerce_int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS"), 5000),
        connectTimeoutMS=_coerce_int(os.getenv("MONGODB_CONNECT_TIMEOUT_MS"), 10000),
        socketTimeoutMS=_coerce_int(os.getenv("MONGODB_SOCKET_TIMEOUT_MS"), 30000),
        maxPoolSize=_coerce_int(os.getenv("MONGODB_MAX_POOL_SIZE"), 100),
        minPoolSize=_coerce_int(os.getenv("MONGODB_MIN_POOL_SIZE"), 0),
        maxIdleTimeMS=_coerce_int(os.getenv("MONGODB_MAX_IDLE_TIME_MS"), 300000),
    )
    _CLIENT.admin.command("ping")

    _COLLECTION = _CLIENT[db_name][collection_name]
    _COLLECTION.create_index([("user_email", DESCENDING), ("created_at", DESCENDING)])
    _COLLECTION.create_index([("created_at", DESCENDING)])
    return _COLLECTION


def save_report(user_email: str, analysis_data: Dict[str, Any]) -> str:
    report_id = str(uuid.uuid4())
    created_at_dt = datetime.now(timezone.utc)
    created_at_iso = created_at_dt.isoformat()
    health_score = int(analysis_data.get("health_score") or 0)

    payload = copy.deepcopy(analysis_data)
    payload["id"] = report_id
    payload["created_at"] = created_at_iso

    doc = {
        "_id": report_id,
        "user_email": user_email,
        "created_at": created_at_dt,
        "health_score": health_score,
        "report_json": payload,
    }

    collection = _get_collection()
    collection.insert_one(doc)
    return report_id


def get_reports_by_user(user_email: str) -> List[Dict[str, Any]]:
    collection = _get_collection()
    cursor = collection.find({"user_email": user_email}).sort("created_at", DESCENDING)

    results: List[Dict[str, Any]] = []
    for row in cursor:
        raw_payload = row.get("report_json") or {}
        if isinstance(raw_payload, str):
            try:
                raw_payload = json.loads(raw_payload)
            except json.JSONDecodeError:
                raw_payload = {}

        data = dict(raw_payload)
        data["id"] = row.get("_id")
        created_at = row.get("created_at")
        data["created_at"] = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
        results.append(data)
    return results


def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    collection = _get_collection()
    row = collection.find_one({"_id": report_id})
    if not row:
        return None

    raw_payload = row.get("report_json") or {}
    if isinstance(raw_payload, str):
        try:
            raw_payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            raw_payload = {}

    data = dict(raw_payload)
    data["id"] = row.get("_id")
    created_at = row.get("created_at")
    data["created_at"] = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
    return data
