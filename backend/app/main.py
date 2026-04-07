"""
main.py — FastAPI application entry point for SecureScope.

Exposes REST API endpoints consumed by the React frontend.
"""

import time
import asyncio
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import ScanRequest, ScanResponse, DomainResult
from app.history_store import init_history_db, list_scan_history, save_scan_history
from app.scanner_runtime import scan_certificate, scan_tls
from app.analyzer import analyze_vulnerabilities
from app.scorer import calculate_score


# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="SecureScope API",
    description="Intelligent TLS/HTTPS Security Analysis Platform",
    version="1.0.0",
    docs_url="/docs",           # Swagger UI at /docs
    redoc_url="/redoc",         # ReDoc UI at /redoc
)

# Allow the React dev server (port 5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_history_db()


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "SecureScope API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────
# Core scan endpoint
# ─────────────────────────────────────────────
@app.post("/api/scan", response_model=ScanResponse, tags=["Scanner"])
async def scan_domains(request: ScanRequest):
    """
    Accept one or more domain names and perform TLS/SSL analysis on each.

    Returns a ScanResponse with per-domain DomainResult objects including
    certificate info, TLS details, vulnerabilities, and a security score.
    """
    start_time = time.monotonic()

    # Run scans concurrently using asyncio + thread executor
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


# ─────────────────────────────────────────────
# Single-domain scan (runs in thread pool)
# ─────────────────────────────────────────────
def _scan_single_domain(domain: str) -> DomainResult:
    """
    Orchestrates certificate scan → TLS scan → vulnerability analysis → scoring.

    This runs synchronously and is called from a thread pool so it doesn't
    block the async event loop.
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    cert = None
    tls  = None
    error_msg = None

    # ── Step 1: Certificate scan ──────────────────
    try:
        cert = scan_certificate(domain)
    except RuntimeError as e:
        error_msg = str(e)
    except Exception as e:
        error_msg = f"Unexpected error during certificate scan: {e}"

    # ── Step 2: TLS scan ──────────────────────────
    if error_msg is None or cert is not None:
        try:
            tls = scan_tls(domain)
        except RuntimeError as e:
            # TLS scan failure is non-fatal if we have cert data
            if error_msg is None:
                error_msg = str(e)
        except Exception as e:
            if error_msg is None:
                error_msg = f"Unexpected error during TLS scan: {e}"

    # If both failed → domain is unreachable
    reachable = cert is not None or tls is not None

    # ── Step 3: Vulnerability analysis ───────────
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


# ─────────────────────────────────────────────
# Info endpoint (for frontend to show test domains)
# ─────────────────────────────────────────────
@app.get("/api/test-domains", tags=["Info"])
def test_domains():
    """Returns a list of sample domains to test with."""
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
    """Return recent persisted scan summaries."""
    return {"items": list_scan_history(limit=max(1, min(limit, 50)))}
