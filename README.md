# 🔐 SecureScope
**Intelligent TLS/HTTPS Security Analysis and Vulnerability Assessment Platform**

---
## 🌐 Live Deployment

🔗 https://securescope-tls-security-platform.onrender.com

---

## 🏗 Project Structure

```
securescope/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── main.py       # API routes
│   │   ├── scanner.py    # TLS/SSL scanning
│   │   ├── analyzer.py   # Vulnerability detection
│   │   ├── scorer.py     # Security scoring
│   │   └── models.py     # Pydantic schemas
│   ├── requirements.txt
│   └── run.py
│
└── frontend/         # React + Vite frontend
    ├── src/
    │   ├── components/   # UI components
    │   ├── pages/        # Dashboard & Result views
    │   ├── services/     # API client
    │   └── App.jsx
    └── package.json
```

---

## 🚀 Running the Project Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

---

### Backend Setup

```bash
cd securescope/backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python run.py
# → API available at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

---

### Frontend Setup

```bash
cd securescope/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
# → App available at http://localhost:5173
```

---

## ☁️ Deploying on Render

This repo includes a root-level `render.yaml` blueprint for a single Render web service.
Render builds the React frontend, then FastAPI serves the generated `frontend/dist` files and all API routes from one service.

### Render Steps

1. Push this repository to GitHub.
2. In Render, choose `New +` → `Blueprint`.
3. Select this repository.
4. Render will create one web service named `securescope`.
5. Open the deployed URL when the build finishes.

### Notes

- The health check path is `/health`.
- The frontend now uses same-origin API requests in production.
- Local file-based scan history is ephemeral on Render unless you later move it to a managed database or persistent disk.

---

## 🧪 Test Domains

| Domain | Expected Result |
|--------|----------------|
| `google.com` | A+ — Strong TLS 1.3, valid cert |
| `cloudflare.com` | A+ — Perfect configuration |
| `github.com` | A — Strong configuration |
| `expired.badssl.com` | F — Expired certificate |
| `self-signed.badssl.com` | F — Self-signed cert |
| `rc4.badssl.com` | F — Weak RC4 cipher |
| `tls-v1-0.badssl.com` | D/F — Outdated TLS 1.0 |
| `sha1-intermediate.badssl.com` | C/D — Deprecated SHA-1 |

> `badssl.com` is a public testing service specifically designed with intentional misconfigurations.

---

## 📡 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | Health check |
| GET | `/health` | Detailed health |
| POST | `/api/scan` | Scan domains |
| GET | `/api/test-domains` | Get sample domains |
| GET | `/docs` | Swagger UI |

### POST /api/scan — Example

**Request:**
```json
{
  "domains": ["google.com", "github.com"]
}
```

**Response:** ScanResponse with per-domain results including certificate, TLS, vulnerabilities, and score.

---

## 🔐 Security Scoring Algorithm

| Category | Weight | Description |
|----------|--------|-------------|
| Certificate Validity | 30pts | Expiry, self-signed, key size |
| Protocol Version | 25pts | TLS 1.3 > 1.2 >> 1.1/1.0 |
| Cipher Strength | 25pts | AEAD preferred, RC4/NULL = 0 |
| HSTS Policy | 10pts | Header presence + max-age |
| Key Strength | 10pts | RSA bits or EC curve |

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 97–100 | Excellent |
| A | 90–96 | Strong |
| B | 80–89 | Good |
| C | 70–79 | Fair |
| D | 60–69 | Poor |
| F | 0–59 | Critical issues |

---

## 🔬 Vulnerability IDs

| ID | Severity | Issue |
|----|----------|-------|
| VULN-001 | CRITICAL | Expired certificate |
| VULN-002 | HIGH | Certificate expiring soon (≤30 days) |
| VULN-003 | HIGH | Self-signed certificate |
| VULN-004 | HIGH | Weak RSA key (<2048 bits) |
| VULN-005 | MEDIUM | SHA-1 signature algorithm |
| VULN-006 | CRITICAL | Outdated TLS protocol |
| VULN-007 | HIGH | Weak cipher suite |
| VULN-008 | LOW | TLS 1.3 not supported |
| VULN-009 | MEDIUM | HSTS not configured |
| VULN-010 | LOW | HSTS max-age too short |

---

## 💡 Suggestions to Improve the Project

1. **Add OCSP Stapling check** — verify certificate revocation status
2. **Add CAA Record check** — DNS CAA records restrict which CAs can issue certs
3. **Add CT Log verification** — check Certificate Transparency logs
4. **Historical scan tracking** — store results in SQLite/PostgreSQL
5. **Scheduled monitoring** — cron-based re-scanning with email alerts
6. **PDF report export** — already implemented in frontend via jsPDF
7. **CVSS scoring** — map vulnerabilities to CVSS v3 scores
8. **Shodan integration** — enrich results with open port data
