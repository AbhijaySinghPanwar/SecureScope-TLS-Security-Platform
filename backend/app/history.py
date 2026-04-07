"""
SQLite-backed scan history persistence for SecureScope.
"""

import json
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "securescope.db"


def init_history_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                domains_json TEXT NOT NULL,
                total_domains INTEGER NOT NULL,
                scan_duration_seconds REAL NOT NULL,
                reachable_domains INTEGER NOT NULL,
                average_score INTEGER,
                critical_findings INTEGER NOT NULL
            )
            """
        )
        connection.commit()


def save_scan_history(scan_response: dict) -> None:
    results = scan_response.get("results", [])
    reachable = [result for result in results if result.get("reachable")]
    score_values = [
        result.get("score", {}).get("total_score")
        for result in reachable
        if result.get("score", {}).get("total_score") is not None
    ]
    critical_findings = sum(
        1
        for result in results
        for vulnerability in result.get("vulnerabilities", [])
        if vulnerability.get("severity") == "CRITICAL"
    )

    domains = [result.get("domain") for result in results if result.get("domain")]
    average_score = round(sum(score_values) / len(score_values)) if score_values else None
    created_at = results[0]["scan_timestamp"] if results else None

    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO scan_history (
                created_at,
                domains_json,
                total_domains,
                scan_duration_seconds,
                reachable_domains,
                average_score,
                critical_findings
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                json.dumps(domains),
                scan_response.get("total_domains", len(domains)),
                scan_response.get("scan_duration_seconds", 0),
                len(reachable),
                average_score,
                critical_findings,
            ),
        )
        connection.commit()


def list_scan_history(limit: int = 10) -> list[dict]:
    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                domains_json,
                total_domains,
                scan_duration_seconds,
                reachable_domains,
                average_score,
                critical_findings
            FROM scan_history
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for row in rows:
        items.append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "domains": json.loads(row["domains_json"]),
                "total_domains": row["total_domains"],
                "scan_duration_seconds": row["scan_duration_seconds"],
                "reachable_domains": row["reachable_domains"],
                "average_score": row["average_score"],
                "critical_findings": row["critical_findings"],
            }
        )

    return items
