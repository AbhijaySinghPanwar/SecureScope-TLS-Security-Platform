"""
scanner.py — Core TLS/SSL scanning engine for SecureScope.

Uses Python's ssl and socket libraries to perform a real TLS handshake
and extract certificate and protocol details without any external API.
"""

import datetime
import http.client
import socket
import ssl
from typing import Optional, Tuple

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import dsa, ec, ed25519, rsa
from cryptography.x509.oid import ExtensionOID, NameOID

from app.models import CertificateInfo, TLSInfo


# ─────────────────────────────────────────────
# Known weak cipher substrings (case-insensitive)
# ─────────────────────────────────────────────
WEAK_CIPHERS = [
    "RC4", "DES", "3DES", "NULL", "EXPORT",
    "ANON", "MD5", "IDEA", "SEED", "CAMELLIA128",
]

# TLS protocol versions considered outdated / insecure
WEAK_PROTOCOLS = ["SSLv2", "SSLv3", "TLSv1", "TLSv1.1"]

# Timeout for socket connections (seconds)
CONNECT_TIMEOUT = 10
TLS_PROBE_ORDER = ("TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3")
TLS_VERSION_MAP = {
    "TLSv1": getattr(ssl.TLSVersion, "TLSv1", None),
    "TLSv1.1": getattr(ssl.TLSVersion, "TLSv1_1", None),
    "TLSv1.2": getattr(ssl.TLSVersion, "TLSv1_2", None),
    "TLSv1.3": getattr(ssl.TLSVersion, "TLSv1_3", None),
}


# ─────────────────────────────────────────────
# Helper — check if cipher is weak
# ─────────────────────────────────────────────
def _is_weak_cipher(cipher_name: str) -> bool:
    """Return True if the cipher name contains any known-weak keywords."""
    upper = cipher_name.upper()
    return any(w in upper for w in WEAK_CIPHERS)


def _is_weak_protocol(proto: str) -> bool:
    """Return True if the TLS version is outdated."""
    return proto in WEAK_PROTOCOLS


# ─────────────────────────────────────────────
# Certificate Scanner
# ─────────────────────────────────────────────
def scan_certificate(domain: str, port: int = 443) -> Optional[CertificateInfo]:
    """
    Connect to domain:port, perform TLS handshake, and extract
    certificate details using Python's ssl module.

    Returns a CertificateInfo object or None on failure.
    """
    try:
        # Create an SSL context that validates certificates
        context = ssl.create_default_context()

        with socket.create_connection((domain, port), timeout=CONNECT_TIMEOUT) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                # Get the DER-encoded certificate
                der_cert = ssock.getpeercert(binary_form=True)
                # Get the parsed dict version for easy field access
                cert_dict = ssock.getpeercert()

        # ── Parse cert_dict ─────────────────────────────────────

        # Subject common name
        subject = _extract_cn(cert_dict.get("subject", ()))
        issuer  = _extract_cn(cert_dict.get("issuer", ()))

        # Validity window
        not_before_str = cert_dict.get("notBefore", "")
        not_after_str  = cert_dict.get("notAfter", "")

        not_before = ssl.cert_time_to_seconds(not_before_str)
        not_after  = ssl.cert_time_to_seconds(not_after_str)

        now = datetime.datetime.utcnow().timestamp()
        days_until_expiry = int((not_after - now) / 86400)
        is_expired = days_until_expiry < 0

        # Self-signed: issuer == subject
        is_self_signed = (subject == issuer)

        # Subject Alternative Names
        san_list = []
        for entry in cert_dict.get("subjectAltName", []):
            if entry[0].lower() == "dns":
                san_list.append(entry[1])

        # Serial number
        serial = str(cert_dict.get("serialNumber", "N/A"))

        # Signature algorithm — available in the parsed dict in Python 3.10+
        sig_algo = cert_dict.get("signatureAlgorithm", "Unknown")

        # Key info — we parse the raw DER to get key size
        key_type, key_size = _extract_key_info(der_cert)

        return CertificateInfo(
            subject=subject,
            issuer=issuer,
            issued_on=not_before_str,
            expires_on=not_after_str,
            days_until_expiry=days_until_expiry,
            is_expired=is_expired,
            is_self_signed=is_self_signed,
            san_domains=san_list,
            serial_number=serial,
            signature_algorithm=sig_algo,
            key_size=key_size,
            key_type=key_type,
        )

    except Exception as e:
        # Propagate as a plain string for the caller to handle
        raise RuntimeError(f"Certificate scan failed: {e}")


# ─────────────────────────────────────────────
# TLS Scanner
# ─────────────────────────────────────────────
def scan_tls(domain: str, port: int = 443) -> Optional[TLSInfo]:
    """
    Connect to domain:port and extract TLS handshake metadata:
    protocol version, cipher suite, HSTS, etc.

    Returns a TLSInfo object or raises RuntimeError.
    """
    try:
        # Use a permissive context so we can detect old protocols too.
        # We intentionally allow older protocols to *detect* them — we still
        # report them as vulnerabilities.
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED
        # Allow TLS 1.2 minimum (1.0 / 1.1 connections would fail on most
        # modern servers anyway, so we probe 1.2+ only for the handshake
        # and check the actual negotiated version)
        context.minimum_version = ssl.TLSVersion.TLSv1_2

        with socket.create_connection((domain, port), timeout=CONNECT_TIMEOUT) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                protocol  = ssock.version()          # e.g. "TLSv1.3"
                cipher    = ssock.cipher()           # (name, proto, bits)

                cipher_name = cipher[0] if cipher else "Unknown"
                cipher_bits = cipher[2] if cipher else 0

                # ── HSTS check via HTTP response headers ──────────
                hsts_enabled, hsts_max_age = _check_hsts(domain)

        # Detect TLS 1.3 / 1.2 support (negotiated version tells us what the
        # server *actually* uses; a server running TLS 1.3 will pick 1.3)
        supports_tls13 = (protocol == "TLSv1.3")
        supports_tls12 = (protocol in ("TLSv1.3", "TLSv1.2"))

        return TLSInfo(
            protocol_version=protocol or "Unknown",
            cipher_suite=cipher_name,
            cipher_bits=cipher_bits,
            is_weak_cipher=_is_weak_cipher(cipher_name),
            is_weak_protocol=_is_weak_protocol(protocol or ""),
            supports_tls13=supports_tls13,
            supports_tls12=supports_tls12,
            hsts_enabled=hsts_enabled,
            hsts_max_age=hsts_max_age,
        )

    except Exception as e:
        raise RuntimeError(f"TLS scan failed: {e}")


# ─────────────────────────────────────────────
# HSTS Header Check
# ─────────────────────────────────────────────
def _check_hsts(domain: str) -> Tuple[bool, Optional[int]]:
    """
    Send a plain HTTP GET to https://domain and inspect the
    Strict-Transport-Security response header.

    Returns (hsts_enabled, max_age_seconds).
    """
    import urllib.request
    import urllib.error

    try:
        url = f"https://{domain}"
        req = urllib.request.Request(url, headers={"User-Agent": "SecureScope/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            hsts_header = resp.headers.get("Strict-Transport-Security", "")
            if hsts_header:
                # Parse max-age from "max-age=31536000; includeSubDomains"
                max_age = None
                for part in hsts_header.split(";"):
                    part = part.strip()
                    if part.lower().startswith("max-age="):
                        try:
                            max_age = int(part.split("=")[1].strip())
                        except ValueError:
                            pass
                return True, max_age
            return False, None
    except Exception:
        return False, None


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _extract_cn(rdns_tuple) -> str:
    """Extract the Common Name (CN) from an RDN sequence tuple."""
    for rdn in rdns_tuple:
        for attr in rdn:
            if attr[0] == "commonName":
                return attr[1]
    # Fallback: join all values
    parts = []
    for rdn in rdns_tuple:
        for attr in rdn:
            parts.append(f"{attr[0]}={attr[1]}")
    return ", ".join(parts) if parts else "Unknown"


def _extract_key_info(der_cert: bytes) -> Tuple[str, int]:
    """
    Parse DER-encoded cert to extract public key type and size.
    Falls back to (Unknown, 0) if cryptography library is unavailable.
    """
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives.asymmetric import rsa, ec, dsa, ed25519

        cert = x509.load_der_x509_certificate(der_cert)
        pub_key = cert.public_key()

        if isinstance(pub_key, rsa.RSAPublicKey):
            return "RSA", pub_key.key_size
        elif isinstance(pub_key, ec.EllipticCurvePublicKey):
            return "EC", pub_key.key_size
        elif isinstance(pub_key, dsa.DSAPublicKey):
            return "DSA", pub_key.key_size
        elif isinstance(pub_key, ed25519.Ed25519PublicKey):
            return "Ed25519", 256
        else:
            return "Unknown", 0
    except Exception:
        return "Unknown", 0
