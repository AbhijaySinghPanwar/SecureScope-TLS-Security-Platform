"""
analyzer.py — Vulnerability detection engine for SecureScope.

Inspects CertificateInfo and TLSInfo objects and returns a list of
detected Vulnerability items with severity and remediation advice.
"""

from typing import Optional
from app.models import CertificateInfo, TLSInfo, Vulnerability


# ─────────────────────────────────────────────
# Vulnerability definitions catalogue
# Each check is a standalone function that returns a Vulnerability or None.
# ─────────────────────────────────────────────

def _check_expired_cert(cert: CertificateInfo) -> Optional[Vulnerability]:
    if cert.is_expired:
        return Vulnerability(
            id="VULN-001",
            severity="CRITICAL",
            title="SSL Certificate Has Expired",
            description=(
                f"The certificate expired {abs(cert.days_until_expiry)} day(s) ago "
                f"(on {cert.expires_on}). Browsers will display a security warning "
                "and users will be unable to establish a trusted connection."
            ),
            recommendation=(
                "Renew the SSL/TLS certificate immediately. Use Let's Encrypt "
                "(free, auto-renewing) or your Certificate Authority. Enable "
                "auto-renewal to prevent this in future."
            ),
            cve_reference=None,
        )
    return None


def _check_expiry_soon(cert: CertificateInfo) -> Optional[Vulnerability]:
    """Warn when certificate expires within 30 days."""
    if not cert.is_expired and 0 <= cert.days_until_expiry <= 30:
        return Vulnerability(
            id="VULN-002",
            severity="HIGH",
            title="SSL Certificate Expiring Soon",
            description=(
                f"The certificate will expire in {cert.days_until_expiry} day(s) "
                f"(on {cert.expires_on}). Without renewal, visitors will see "
                "security warnings."
            ),
            recommendation=(
                "Renew the certificate before expiry. If using Let's Encrypt, "
                "ensure your certbot cron job is running. If using a paid CA, "
                "initiate the renewal process now."
            ),
        )
    return None


def _check_self_signed(cert: CertificateInfo) -> Optional[Vulnerability]:
    if cert.is_self_signed:
        return Vulnerability(
            id="VULN-003",
            severity="HIGH",
            title="Self-Signed Certificate Detected",
            description=(
                "The certificate is signed by the same entity it identifies "
                "(self-signed), not by a trusted Certificate Authority. "
                "Browsers will show an 'untrusted' security warning."
            ),
            recommendation=(
                "Replace the self-signed certificate with one issued by a "
                "trusted CA. Let's Encrypt provides free, browser-trusted "
                "certificates in minutes."
            ),
        )
    return None


def _check_weak_key(cert: CertificateInfo) -> Optional[Vulnerability]:
    """Flag RSA keys smaller than 2048 bits."""
    if cert.key_type == "RSA" and cert.key_size < 2048:
        return Vulnerability(
            id="VULN-004",
            severity="HIGH",
            title=f"Weak RSA Key Size ({cert.key_size}-bit)",
            description=(
                f"The certificate uses a {cert.key_size}-bit RSA key. "
                "Keys below 2048 bits are considered cryptographically weak "
                "and are vulnerable to factoring attacks."
            ),
            recommendation=(
                "Reissue the certificate with a minimum 2048-bit RSA key. "
                "Prefer 4096-bit RSA or ECC (ECDSA P-256) for stronger security."
            ),
            cve_reference="NIST SP 800-57",
        )
    return None


def _check_sha1_signature(cert: CertificateInfo) -> Optional[Vulnerability]:
    """Flag SHA-1 signed certificates (deprecated since 2017)."""
    if "sha1" in cert.signature_algorithm.lower():
        return Vulnerability(
            id="VULN-005",
            severity="MEDIUM",
            title="Deprecated SHA-1 Signature Algorithm",
            description=(
                "The certificate uses SHA-1 for its signature hash, which is "
                "cryptographically broken. SHA-1 collision attacks have been "
                "demonstrated (SHAttered, 2017)."
            ),
            recommendation=(
                "Reissue the certificate requesting SHA-256 (or stronger) "
                "as the signature algorithm. All modern CAs support SHA-256."
            ),
            cve_reference="CVE-2005-4900",
        )
    return None


def _check_weak_protocol(tls: TLSInfo) -> Optional[Vulnerability]:
    if tls.is_weak_protocol:
        return Vulnerability(
            id="VULN-006",
            severity="CRITICAL",
            title=f"Outdated TLS Protocol in Use ({tls.protocol_version})",
            description=(
                f"The server negotiated {tls.protocol_version}, which is deprecated "
                "and contains known vulnerabilities (POODLE, BEAST, DROWN). "
                "PCI DSS v3.2+ mandates TLS 1.2 minimum."
            ),
            recommendation=(
                "Disable TLS 1.0 and 1.1 on your server. Enable TLS 1.2 as "
                "minimum and prefer TLS 1.3. For Nginx: ssl_protocols TLSv1.2 TLSv1.3; "
                "For Apache: SSLProtocol -all +TLSv1.2 +TLSv1.3"
            ),
            cve_reference="CVE-2014-3566",
        )
    return None


def _check_weak_cipher(tls: TLSInfo) -> Optional[Vulnerability]:
    if tls.is_weak_cipher:
        return Vulnerability(
            id="VULN-007",
            severity="HIGH",
            title=f"Weak Cipher Suite Detected ({tls.cipher_suite})",
            description=(
                f"The negotiated cipher suite '{tls.cipher_suite}' is considered "
                "weak. Weak ciphers may be vulnerable to known attacks such as "
                "SWEET32, BEAST, or brute-force decryption."
            ),
            recommendation=(
                "Configure your server to prefer modern AEAD cipher suites: "
                "TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 (TLS 1.3). "
                "Disable RC4, 3DES, NULL, EXPORT, and anon cipher suites."
            ),
            cve_reference="CVE-2016-2183",  # SWEET32
        )
    return None


def _check_no_tls13(tls: TLSInfo) -> Optional[Vulnerability]:
    """Flag if the server doesn't support TLS 1.3."""
    if not tls.supports_tls13:
        return Vulnerability(
            id="VULN-008",
            severity="LOW",
            title="TLS 1.3 Not Supported",
            description=(
                "The server does not support TLS 1.3, the latest and most secure "
                "version of the TLS protocol. TLS 1.3 removes legacy features, "
                "improves performance, and provides forward secrecy by default."
            ),
            recommendation=(
                "Upgrade your TLS stack to support TLS 1.3. OpenSSL 1.1.1+ "
                "and most modern web servers (Nginx 1.13+, Apache 2.4.37+) "
                "support TLS 1.3 out of the box."
            ),
        )
    return None


def _check_missing_hsts(tls: TLSInfo) -> Optional[Vulnerability]:
    if not tls.hsts_enabled:
        return Vulnerability(
            id="VULN-009",
            severity="MEDIUM",
            title="HTTP Strict Transport Security (HSTS) Not Configured",
            description=(
                "The server does not send a Strict-Transport-Security header. "
                "Without HSTS, users may be vulnerable to SSL stripping attacks "
                "where an attacker downgrades the connection to plain HTTP."
            ),
            recommendation=(
                "Add the HSTS header to your server responses:\n"
                "  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n"
                "For Nginx: add_header Strict-Transport-Security '...' always;\n"
                "For Apache: Header always set Strict-Transport-Security '...'"
            ),
        )
    return None


def _check_short_hsts(tls: TLSInfo) -> Optional[Vulnerability]:
    """Flag HSTS max-age below 6 months (15768000 seconds)."""
    if tls.hsts_enabled and tls.hsts_max_age is not None and tls.hsts_max_age < 15768000:
        return Vulnerability(
            id="VULN-010",
            severity="LOW",
            title=f"HSTS max-age Too Short ({tls.hsts_max_age}s)",
            description=(
                f"HSTS is enabled but the max-age is only {tls.hsts_max_age} seconds "
                "(less than 6 months). OWASP and browser preload lists require "
                "a minimum of 1 year (31536000 seconds)."
            ),
            recommendation=(
                "Increase HSTS max-age to at least 31536000 (1 year):\n"
                "  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
            ),
        )
    return None


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────

def analyze_vulnerabilities(
    cert: Optional[CertificateInfo],
    tls: Optional[TLSInfo],
) -> list[Vulnerability]:
    """
    Run all vulnerability checks and return a deduplicated,
    severity-sorted list of Vulnerability objects.

    Severity order: CRITICAL > HIGH > MEDIUM > LOW > INFO
    """
    findings: list[Vulnerability] = []

    # Certificate checks
    if cert:
        for check_fn in [
            _check_expired_cert,
            _check_expiry_soon,
            _check_self_signed,
            _check_weak_key,
            _check_sha1_signature,
        ]:
            result = check_fn(cert)
            if result:
                findings.append(result)

    # TLS checks
    if tls:
        for check_fn in [
            _check_weak_protocol,
            _check_weak_cipher,
            _check_no_tls13,
            _check_missing_hsts,
            _check_short_hsts,
        ]:
            result = check_fn(tls)
            if result:
                findings.append(result)

    # Sort by severity
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
    findings.sort(key=lambda v: severity_order.get(v.severity, 99))

    return findings
