import ssl
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

from app import history_store as history
from app.analyzer import analyze_vulnerabilities
from app.models import CertificateInfo, ScanRequest, TLSInfo
from app.scanner_runtime import _probe_supported_tls_versions, scan_tls
from app.scorer import calculate_score


def make_certificate(**overrides):
    base = {
        "subject": "example.com",
        "issuer": "Example CA",
        "issued_on": "2026-01-01 00:00:00 UTC",
        "expires_on": "2027-01-01 00:00:00 UTC",
        "days_until_expiry": 120,
        "is_expired": False,
        "is_self_signed": False,
        "san_domains": ["example.com"],
        "serial_number": "0x1234",
        "signature_algorithm": "SHA256",
        "key_size": 2048,
        "key_type": "RSA",
    }
    base.update(overrides)
    return CertificateInfo(**base)


def make_tls(**overrides):
    base = {
        "protocol_version": "TLSv1.3",
        "supported_versions": ["TLSv1.2", "TLSv1.3"],
        "cipher_suite": "TLS_AES_256_GCM_SHA384",
        "cipher_bits": 256,
        "is_weak_cipher": False,
        "is_weak_protocol": False,
        "supports_tls13": True,
        "supports_tls12": True,
        "hsts_enabled": True,
        "hsts_max_age": 31536000,
    }
    base.update(overrides)
    return TLSInfo(**base)


class ScanRequestTests(unittest.TestCase):
    def test_clean_domains_normalizes_and_deduplicates(self):
        request = ScanRequest(
            domains=[
                "https://Example.com/login",
                "example.com",
                "api.example.com:8443",
                " HTTP://BLOG.EXAMPLE.COM/path ",
            ]
        )

        self.assertEqual(
            request.domains,
            ["example.com", "api.example.com", "blog.example.com"],
        )


class AnalyzerAndScorerTests(unittest.TestCase):
    def test_legacy_protocol_support_is_flagged_even_when_tls13_negotiates(self):
        cert = make_certificate()
        tls = make_tls(
            supported_versions=["TLSv1", "TLSv1.2", "TLSv1.3"],
            is_weak_protocol=True,
        )

        findings = analyze_vulnerabilities(cert, tls)
        vuln_ids = [item.id for item in findings]

        self.assertIn("VULN-006", vuln_ids)

    def test_weak_protocol_support_reduces_score(self):
        cert = make_certificate()
        tls = make_tls(
            supported_versions=["TLSv1", "TLSv1.2", "TLSv1.3"],
            is_weak_protocol=True,
        )

        score = calculate_score(cert, tls)

        self.assertEqual(score.breakdown["protocol_version"]["score"], 6)
        self.assertLess(score.total_score, 90)


class ScannerRuntimeTests(unittest.TestCase):
    def test_probe_supported_versions_collects_successes(self):
        def fake_handshake(domain, port, tls_version=None):
            mapping = {
                ssl.TLSVersion.TLSv1_2: ("TLSv1.2", ("ECDHE", "TLSv1.2", 128)),
                ssl.TLSVersion.TLSv1_3: ("TLSv1.3", ("TLS_AES_256_GCM_SHA384", "TLSv1.3", 256)),
            }
            if tls_version in mapping:
                return mapping[tls_version]
            raise ssl.SSLError("unsupported")

        with patch("app.scanner_runtime._attempt_tls_handshake", side_effect=fake_handshake):
            supported = _probe_supported_tls_versions("example.com", 443)

        self.assertEqual(supported, ["TLSv1.2", "TLSv1.3"])

    def test_scan_tls_marks_legacy_support_as_weak(self):
        with patch("app.scanner_runtime._attempt_tls_handshake", return_value=("TLSv1.3", ("TLS_AES_256_GCM_SHA384", "TLSv1.3", 256))), \
             patch("app.scanner_runtime._probe_supported_tls_versions", return_value=["TLSv1", "TLSv1.2", "TLSv1.3"]), \
             patch("app.scanner_runtime._check_hsts", return_value=(True, 31536000)):
            tls = scan_tls("example.com")

        self.assertTrue(tls.is_weak_protocol)
        self.assertTrue(tls.supports_tls13)
        self.assertTrue(tls.supports_tls12)
        self.assertEqual(tls.supported_versions, ["TLSv1", "TLSv1.2", "TLSv1.3"])


class HistoryTests(unittest.TestCase):
    def test_history_round_trip(self):
        temp_dir = Path(__file__).resolve().parent / "_tmp_history"
        temp_dir.mkdir(exist_ok=True)
        history_path = temp_dir / f"history_{uuid.uuid4().hex}.json"

        with patch.object(history, "HISTORY_PATH", history_path), patch.object(history, "DATA_DIR", temp_dir):
            history.init_history_db()
            history.save_scan_history(
                {
                    "results": [
                        {
                            "domain": "example.com",
                            "scan_timestamp": "2026-04-07T10:00:00+00:00",
                            "reachable": True,
                            "score": {"total_score": 92},
                            "vulnerabilities": [{"severity": "CRITICAL"}],
                        },
                        {
                            "domain": "expired.badssl.com",
                            "scan_timestamp": "2026-04-07T10:00:00+00:00",
                            "reachable": False,
                            "score": None,
                            "vulnerabilities": [],
                        },
                    ],
                    "total_domains": 2,
                    "scan_duration_seconds": 1.75,
                }
            )

            items = history.list_scan_history(limit=5)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["domains"], ["example.com", "expired.badssl.com"])
        self.assertEqual(items[0]["reachable_domains"], 1)
        self.assertEqual(items[0]["average_score"], 92)
        self.assertEqual(items[0]["critical_findings"], 1)


if __name__ == "__main__":
    unittest.main()
