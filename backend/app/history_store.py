"""
File-backed scan history persistence for SecureScope.
"""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
HISTORY_PATH = DATA_DIR / "scan_history.json"
MAX_STORED_SCANS = 50


def init_history_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not HISTORY_PATH.exists():
        HISTORY_PATH.write_text("[]", encoding="utf-8")


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

    payload = _read_history()
    next_id = (payload[-1]["id"] + 1) if payload else 1
    payload.append(
        {
            "id": next_id,
            "created_at": created_at,
            "domains": domains,
            "total_domains": scan_response.get("total_domains", len(domains)),
            "scan_duration_seconds": scan_response.get("scan_duration_seconds", 0),
            "reachable_domains": len(reachable),
            "average_score": average_score,
            "critical_findings": critical_findings,
        }
    )

    HISTORY_PATH.write_text(
        json.dumps(payload[-MAX_STORED_SCANS:], indent=2),
        encoding="utf-8",
    )


def list_scan_history(limit: int = 10) -> list[dict]:
    items = list(reversed(_read_history()))
    return items[:limit]


def _read_history() -> list[dict]:
    init_history_db()

    try:
        return json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return []
