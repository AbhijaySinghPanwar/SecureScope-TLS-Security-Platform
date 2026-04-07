"""
Runtime TLS/SSL scanning engine for SecureScope.

This scanner intentionally uses unverified TLS handshakes so it can still
collect details from expired or self-signed endpoints and report those
problems accurately instead of treating them as unreachable.
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


WEAK_CIPHERS = [
    "RC4",
    "DES",
    "3DES",
    "NULL",
    "EXPORT",
    "ANON",
    "MD5",
    "IDEA",
    "SEED",
    "CAMELLIA128",
]
WEAK_PROTOCOLS = ["SSLv2", "SSLv3", "TLSv1", "TLSv1.1"]
CONNECT_TIMEOUT = 10
TLS_PROBE_ORDER = ("TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3")
TLS_VERSION_MAP = {
    "TLSv1": getattr(ssl.TLSVersion, "TLSv1", None),
    "TLSv1.1": getattr(ssl.TLSVersion, "TLSv1_1", None),
    "TLSv1.2": getattr(ssl.TLSVersion, "TLSv1_2", None),
    "TLSv1.3": getattr(ssl.TLSVersion, "TLSv1_3", None),
}


def _is_weak_cipher(cipher_name: str) -> bool:
    upper = cipher_name.upper()
    return any(keyword in upper for keyword in WEAK_CIPHERS)


def _is_weak_protocol(proto: str) -> bool:
    return proto in WEAK_PROTOCOLS


def scan_certificate(domain: str, port: int = 443) -> Optional[CertificateInfo]:
    try:
        cert = _fetch_peer_certificate(domain, port)
        key_type, key_size = _extract_key_info(cert)
        now = datetime.datetime.now(datetime.timezone.utc)

        not_before = _coerce_utc(cert.not_valid_before_utc if hasattr(cert, "not_valid_before_utc") else cert.not_valid_before)
        not_after = _coerce_utc(cert.not_valid_after_utc if hasattr(cert, "not_valid_after_utc") else cert.not_valid_after)
        days_until_expiry = int((not_after - now).total_seconds() / 86400)

        return CertificateInfo(
            subject=_name_to_display(cert.subject),
            issuer=_name_to_display(cert.issuer),
            issued_on=_format_dt(not_before),
            expires_on=_format_dt(not_after),
            days_until_expiry=days_until_expiry,
            is_expired=not_after < now,
            is_self_signed=cert.issuer == cert.subject,
            san_domains=_extract_san_domains(cert),
            serial_number=hex(cert.serial_number).upper().replace("X", "x"),
            signature_algorithm=_extract_signature_algorithm(cert),
            key_size=key_size,
            key_type=key_type,
        )
    except Exception as e:
        raise RuntimeError(f"Certificate scan failed: {e}")


def scan_tls(domain: str, port: int = 443) -> Optional[TLSInfo]:
    try:
        protocol, cipher = _attempt_tls_handshake(domain, port)
        cipher_name = cipher[0] if cipher else "Unknown"
        cipher_bits = cipher[2] if cipher else 0
        supported_versions = _probe_supported_tls_versions(domain, port)
        hsts_enabled, hsts_max_age = _check_hsts(domain)

        return TLSInfo(
            protocol_version=protocol or "Unknown",
            supported_versions=supported_versions,
            cipher_suite=cipher_name,
            cipher_bits=cipher_bits,
            is_weak_cipher=_is_weak_cipher(cipher_name),
            is_weak_protocol=any(_is_weak_protocol(version) for version in supported_versions or [protocol or ""]),
            supports_tls13="TLSv1.3" in supported_versions,
            supports_tls12="TLSv1.2" in supported_versions or "TLSv1.3" in supported_versions,
            hsts_enabled=hsts_enabled,
            hsts_max_age=hsts_max_age,
        )
    except Exception as e:
        raise RuntimeError(f"TLS scan failed: {e}")


def _fetch_peer_certificate(domain: str, port: int) -> x509.Certificate:
    context = _build_client_context()
    with socket.create_connection((domain, port), timeout=CONNECT_TIMEOUT) as sock:
        with context.wrap_socket(sock, server_hostname=domain) as ssock:
            der_cert = ssock.getpeercert(binary_form=True)
    return x509.load_der_x509_certificate(der_cert)


def _attempt_tls_handshake(
    domain: str,
    port: int,
    tls_version: Optional[ssl.TLSVersion] = None,
) -> Tuple[str, tuple]:
    context = _build_client_context(tls_version=tls_version)
    with socket.create_connection((domain, port), timeout=CONNECT_TIMEOUT) as sock:
        with context.wrap_socket(sock, server_hostname=domain) as ssock:
            return ssock.version() or "Unknown", ssock.cipher()


def _build_client_context(tls_version: Optional[ssl.TLSVersion] = None) -> ssl.SSLContext:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    if tls_version is not None:
        context.minimum_version = tls_version
        context.maximum_version = tls_version
    return context


def _probe_supported_tls_versions(domain: str, port: int) -> list[str]:
    supported = []
    for label in TLS_PROBE_ORDER:
        version = TLS_VERSION_MAP.get(label)
        if version is None:
            continue

        try:
            negotiated, _ = _attempt_tls_handshake(domain, port, tls_version=version)
        except (ssl.SSLError, OSError):
            continue

        if negotiated and negotiated not in supported:
            supported.append(negotiated)

    return supported


def _check_hsts(domain: str) -> Tuple[bool, Optional[int]]:
    try:
        connection = http.client.HTTPSConnection(
            domain,
            timeout=8,
            context=_build_client_context(),
        )
        connection.request("GET", "/", headers={"User-Agent": "SecureScope/1.0"})
        response = connection.getresponse()
        hsts_header = response.headers.get("Strict-Transport-Security", "")
        connection.close()

        if not hsts_header:
            return False, None

        max_age = None
        for part in hsts_header.split(";"):
            item = part.strip()
            if item.lower().startswith("max-age="):
                try:
                    max_age = int(item.split("=", 1)[1].strip())
                except ValueError:
                    max_age = None

        return True, max_age
    except Exception:
        return False, None


def _extract_san_domains(cert: x509.Certificate) -> list[str]:
    try:
        san = cert.extensions.get_extension_for_oid(ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
    except x509.ExtensionNotFound:
        return []
    return san.value.get_values_for_type(x509.DNSName)


def _extract_signature_algorithm(cert: x509.Certificate) -> str:
    hash_algorithm = getattr(cert, "signature_hash_algorithm", None)
    if hash_algorithm is None:
        return (cert.signature_algorithm_oid._name or cert.signature_algorithm_oid.dotted_string).upper()
    return hash_algorithm.name.upper()


def _name_to_display(name: x509.Name) -> str:
    attrs = name.get_attributes_for_oid(NameOID.COMMON_NAME)
    if attrs:
        return attrs[0].value
    return ", ".join(f"{attr.oid._name or attr.oid.dotted_string}={attr.value}" for attr in name) or "Unknown"


def _extract_key_info(cert: x509.Certificate) -> Tuple[str, int]:
    try:
        public_key = cert.public_key()
        if isinstance(public_key, rsa.RSAPublicKey):
            return "RSA", public_key.key_size
        if isinstance(public_key, ec.EllipticCurvePublicKey):
            return "EC", public_key.key_size
        if isinstance(public_key, dsa.DSAPublicKey):
            return "DSA", public_key.key_size
        if isinstance(public_key, ed25519.Ed25519PublicKey):
            return "Ed25519", 256
        return "Unknown", 0
    except Exception:
        return "Unknown", 0


def _coerce_utc(value: datetime.datetime) -> datetime.datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=datetime.timezone.utc)
    return value.astimezone(datetime.timezone.utc)


def _format_dt(value: datetime.datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M:%S UTC")
