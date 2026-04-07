"""
models.py — Pydantic data models for SecureScope API.
Defines request/response schemas used across the application.
"""

from typing import Optional
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────

class ScanRequest(BaseModel):
    """Incoming scan request — one or more domain names."""
    domains: list[str]

    @field_validator("domains")
    @classmethod
    def clean_domains(cls, domains):
        """Strip schemes, paths, ports, and duplicates while preserving order."""
        cleaned = []
        seen = set()

        for d in domains:
            candidate = d.strip()
            if not candidate:
                continue

            parsed = urlsplit(candidate if "://" in candidate else f"https://{candidate}")
            host = (parsed.hostname or parsed.path or "").strip().rstrip(".").lower()

            if host and host not in seen:
                seen.add(host)
                cleaned.append(host)

        if not cleaned:
            raise ValueError("At least one valid domain is required.")
        return cleaned


# ─────────────────────────────────────────────
# Certificate Model
# ─────────────────────────────────────────────

class CertificateInfo(BaseModel):
    """SSL/TLS certificate details extracted from a domain."""
    subject: str                        # Certificate issued to (CN)
    issuer: str                         # Certificate authority
    issued_on: str                      # notBefore date
    expires_on: str                     # notAfter date
    days_until_expiry: int              # Positive = valid, negative = expired
    is_expired: bool
    is_self_signed: bool
    san_domains: list[str]              # Subject Alternative Names
    serial_number: str
    signature_algorithm: str
    key_size: int                       # RSA key size in bits
    key_type: str                       # RSA / EC / DSA


# ─────────────────────────────────────────────
# TLS Details Model
# ─────────────────────────────────────────────

class TLSInfo(BaseModel):
    """TLS handshake details for a domain."""
    protocol_version: str               # e.g. TLSv1.3
    supported_versions: list[str] = Field(default_factory=list)
    cipher_suite: str                   # e.g. TLS_AES_256_GCM_SHA384
    cipher_bits: int                    # Key exchange bits
    is_weak_cipher: bool
    is_weak_protocol: bool
    supports_tls13: bool
    supports_tls12: bool
    hsts_enabled: bool                  # HTTP Strict Transport Security header
    hsts_max_age: Optional[int]         # HSTS max-age in seconds


# ─────────────────────────────────────────────
# Vulnerability Model
# ─────────────────────────────────────────────

class Vulnerability(BaseModel):
    """A single detected security issue."""
    id: str                             # Unique identifier e.g. VULN-001
    severity: str                       # CRITICAL / HIGH / MEDIUM / LOW / INFO
    title: str
    description: str
    recommendation: str
    cve_reference: Optional[str] = None


# ─────────────────────────────────────────────
# Scoring Model
# ─────────────────────────────────────────────

class SecurityScore(BaseModel):
    """Overall security score and grade for a domain."""
    total_score: int                    # 0–100
    grade: str                          # A+, A, B, C, D, F
    grade_color: str                    # For UI badge color
    breakdown: dict                     # Per-category scores
    summary: str                        # One-line human-readable verdict


# ─────────────────────────────────────────────
# Final Domain Result
# ─────────────────────────────────────────────

class DomainResult(BaseModel):
    """Full scan result for a single domain."""
    domain: str
    scan_timestamp: str
    reachable: bool
    error_message: Optional[str] = None
    certificate: Optional[CertificateInfo] = None
    tls: Optional[TLSInfo] = None
    vulnerabilities: list[Vulnerability] = Field(default_factory=list)
    score: Optional[SecurityScore] = None


class ScanResponse(BaseModel):
    """API response — results for all scanned domains."""
    results: list[DomainResult]
    total_domains: int
    scan_duration_seconds: float
