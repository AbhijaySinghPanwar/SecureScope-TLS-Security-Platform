"""
scorer.py — Security scoring engine for SecureScope.

Computes a 0–100 score and letter grade (A+, A, B, C, D, F) based on
certificate validity, protocol strength, cipher quality, and HSTS.
"""

from typing import Optional
from app.models import CertificateInfo, TLSInfo, SecurityScore


# ─────────────────────────────────────────────
# Scoring weights (must sum to 100)
# ─────────────────────────────────────────────
WEIGHTS = {
    "certificate_validity": 30,   # Is cert valid and not expired?
    "protocol_version":     25,   # TLS 1.3 > 1.2 >> 1.1/1.0/SSL
    "cipher_strength":      25,   # AEAD vs legacy ciphers
    "hsts_policy":          10,   # HSTS header presence + max-age
    "key_strength":         10,   # RSA/EC key size
}

# Grade thresholds
GRADE_THRESHOLDS = [
    (97, "A+", "#00C853"),
    (90, "A",  "#00E676"),
    (80, "B",  "#FFEB3B"),
    (70, "C",  "#FF9800"),
    (60, "D",  "#FF5722"),
    (0,  "F",  "#F44336"),
]


def _score_certificate(cert: Optional[CertificateInfo]) -> int:
    """
    Score: 0–30
    - Expired:              0
    - Self-signed:         10
    - Expiry < 7 days:     18
    - Expiry < 30 days:    22
    - Weak key size:       -5
    - SHA-1 signature:     -5
    - Perfect:             30
    """
    if cert is None:
        return 0

    if cert.is_expired:
        return 0

    score = WEIGHTS["certificate_validity"]  # Start at max

    if cert.is_self_signed:
        score -= 20

    if cert.days_until_expiry < 7:
        score -= 12
    elif cert.days_until_expiry < 30:
        score -= 8

    if cert.key_type == "RSA" and cert.key_size < 2048:
        score -= 5

    if "sha1" in cert.signature_algorithm.lower():
        score -= 5

    return max(0, score)


def _score_protocol(tls: Optional[TLSInfo]) -> int:
    """
    Score: 0–25
    - TLS 1.3:   25
    - TLS 1.2:   18
    - TLS 1.1:    8
    - TLS 1.0:    4
    - SSL 3.0:    0
    """
    if tls is None:
        return 0

    if tls.is_weak_protocol:
        return 6

    proto_scores = {
        "TLSv1.3": 25,
        "TLSv1.2": 18,
        "TLSv1.1":  8,
        "TLSv1":    4,
        "SSLv3":    0,
        "SSLv2":    0,
    }
    return proto_scores.get(tls.protocol_version, 10)


def _score_cipher(tls: Optional[TLSInfo]) -> int:
    """
    Score: 0–25
    - Weak cipher:            0
    - 256-bit AEAD:          25
    - 128-bit AEAD:          20
    - Other known secure:    15
    """
    if tls is None:
        return 0

    if tls.is_weak_cipher:
        return 0

    cipher_upper = tls.cipher_suite.upper()

    # AEAD ciphers (most secure)
    if any(kw in cipher_upper for kw in ["GCM", "CHACHA20", "CCM", "POLY1305"]):
        return 25 if tls.cipher_bits >= 256 else 20

    return 15  # Other non-weak ciphers


def _score_hsts(tls: Optional[TLSInfo]) -> int:
    """
    Score: 0–10
    - No HSTS:                        0
    - HSTS present, max-age < 6mo:    5
    - HSTS present, max-age >= 1yr:  10
    """
    if tls is None:
        return 0

    if not tls.hsts_enabled:
        return 0

    if tls.hsts_max_age and tls.hsts_max_age >= 31536000:
        return 10
    if tls.hsts_max_age and tls.hsts_max_age >= 15768000:
        return 7
    return 5


def _score_key_strength(cert: Optional[CertificateInfo]) -> int:
    """
    Score: 0–10 based on public key algorithm and size.
    - EC / Ed25519:           10
    - RSA >= 4096:            10
    - RSA 2048–4095:           8
    - RSA < 2048:              2
    - Unknown:                 5
    """
    if cert is None:
        return 5

    kt = cert.key_type.upper()

    if kt in ("EC", "ED25519"):
        return 10

    if kt == "RSA":
        if cert.key_size >= 4096:
            return 10
        elif cert.key_size >= 2048:
            return 8
        else:
            return 2

    return 5


def _resolve_grade(score: int) -> tuple[str, str]:
    """Return (grade, color) for a given numeric score."""
    for threshold, grade, color in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade, color
    return "F", "#F44336"


def _build_summary(score: int, grade: str, cert: Optional[CertificateInfo], tls: Optional[TLSInfo]) -> str:
    """Generate a one-line human-readable verdict."""
    if grade == "A+":
        return "Excellent configuration — industry-leading security standards met."
    if grade == "A":
        return "Strong security configuration with minor room for improvement."
    if grade == "B":
        return "Good configuration but some improvements are recommended."
    if grade == "C":
        if cert and cert.is_expired:
            return "Certificate is expired — immediate action required."
        if tls and tls.is_weak_protocol:
            return "Outdated TLS protocol detected — upgrade required."
        return "Moderate security. Multiple issues should be addressed."
    if grade == "D":
        return "Poor security posture. Several critical issues found."
    return "Critical security failures. This domain is unsafe for users."


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────

def calculate_score(
    cert: Optional[CertificateInfo],
    tls: Optional[TLSInfo],
) -> SecurityScore:
    """
    Compute the overall security score and return a SecurityScore object.
    """
    cert_score     = _score_certificate(cert)
    proto_score    = _score_protocol(tls)
    cipher_score   = _score_cipher(tls)
    hsts_score     = _score_hsts(tls)
    key_score      = _score_key_strength(cert)

    total = cert_score + proto_score + cipher_score + hsts_score + key_score
    total = min(100, max(0, total))  # Clamp to [0, 100]

    grade, color = _resolve_grade(total)
    summary = _build_summary(total, grade, cert, tls)

    return SecurityScore(
        total_score=total,
        grade=grade,
        grade_color=color,
        breakdown={
            "certificate_validity": {
                "score": cert_score,
                "max": WEIGHTS["certificate_validity"],
                "label": "Certificate Validity",
            },
            "protocol_version": {
                "score": proto_score,
                "max": WEIGHTS["protocol_version"],
                "label": "Protocol Version",
            },
            "cipher_strength": {
                "score": cipher_score,
                "max": WEIGHTS["cipher_strength"],
                "label": "Cipher Strength",
            },
            "hsts_policy": {
                "score": hsts_score,
                "max": WEIGHTS["hsts_policy"],
                "label": "HSTS Policy",
            },
            "key_strength": {
                "score": key_score,
                "max": WEIGHTS["key_strength"],
                "label": "Key Strength",
            },
        },
        summary=summary,
    )
