"""
Single-service FastAPI entrypoint for SecureScope.

Serves API routes and, when available, the built React frontend from
`frontend/dist` so the whole app can run as one Render web service.
"""

import asyncio
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.analyzer import analyze_vulnerabilities
from app.history_store import init_history_db, list_scan_history, save_scan_history
from app.models import DomainResult, ScanRequest, ScanResponse
from app.scanner_runtime import scan_certificate, scan_tls
from app.scorer import calculate_score


FRONTEND_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

app = FastAPI(
    title="SecureScope API",
    description="Intelligent TLS/HTTPS Security Analysis Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_history_db()


@app.get("/", tags=["Health"])
def root():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return {"status": "ok", "service": "SecureScope API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/api/scan", response_model=ScanResponse, tags=["Scanner"])
async def scan_domains(request: ScanRequest):
    start_time = time.monotonic()
    loop = asyncio.get_running_loop()
    tasks = [loop.run_in_executor(None, _scan_single_domain, domain) for domain in request.domains]
    results = await asyncio.gather(*tasks)
    elapsed = round(time.monotonic() - start_time, 2)

    response = ScanResponse(
        results=list(results),
        total_domains=len(results),
        scan_duration_seconds=elapsed,
    )
    save_scan_history(response.model_dump(mode="json"))
    return response


def _scan_single_domain(domain: str) -> DomainResult:
    timestamp = datetime.now(timezone.utc).isoformat()
    cert = None
    tls = None
    error_msg = None

    try:
        cert = scan_certificate(domain)
    except RuntimeError as e:
        error_msg = str(e)
    except Exception as e:
        error_msg = f"Unexpected error during certificate scan: {e}"

    if error_msg is None or cert is not None:
        try:
            tls = scan_tls(domain)
        except RuntimeError as e:
            if error_msg is None:
                error_msg = str(e)
        except Exception as e:
            if error_msg is None:
                error_msg = f"Unexpected error during TLS scan: {e}"

    reachable = cert is not None or tls is not None
    vulnerabilities = []
    score = None

    if reachable:
        vulnerabilities = analyze_vulnerabilities(cert, tls)
        score = calculate_score(cert, tls)

    return DomainResult(
        domain=domain,
        scan_timestamp=timestamp,
        reachable=reachable,
        error_message=error_msg if not reachable else None,
        certificate=cert,
        tls=tls,
        vulnerabilities=vulnerabilities,
        score=score,
    )


@app.get("/api/test-domains", tags=["Info"])
def test_domains():
    return {
        "domains": [
            "google.com",
            "cloudflare.com",
            "github.com",
            "expired.badssl.com",
            "self-signed.badssl.com",
            "rc4.badssl.com",
            "tls-v1-0.badssl.com",
            "sha1-intermediate.badssl.com",
        ],
        "note": "badssl.com domains are intentionally misconfigured for testing.",
    }


@app.get("/api/history", tags=["Info"])
def scan_history(limit: int = 8):
    return {"items": list_scan_history(limit=max(1, min(limit, 50)))}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if not FRONTEND_INDEX_FILE.exists():
        return {
            "status": "frontend_not_built",
            "message": "Frontend build not found. Run `npm run build` in frontend.",
        }

    requested = FRONTEND_DIST_DIR / full_path
    if full_path and requested.exists() and requested.is_file():
        return FileResponse(requested)

    return FileResponse(FRONTEND_INDEX_FILE)
