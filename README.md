# SecureAPI Platform

> A production-grade developer API gateway platform built with security at every layer.
> Think mini-Stripe API — developers register, create projects, generate scoped API keys, and call secured endpoints.

[![Phase](https://img.shields.io/badge/Phase-1%20Complete-brightgreen)]()
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20TypeScript%20%7C%20PostgreSQL%20%7C%20Docker-blue)]()
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20bcrypt%20%7C%20Parameterized%20SQL-red)]()

---

## What This Project Is

SecureAPI Platform is a multi-phase DevSecOps portfolio project that builds a real SaaS backend from scratch — then secures, hardens, and deploys it using industry-standard tools.

Each phase adds a new layer:
- **Phases 1–2:** Secure backend foundation (auth, rate limiting, security headers)
- **Phases 3–4:** Core product features (projects, API key management)
- **Phases 5–6:** Platform features (public API layer, usage logging)
- **Phase 7:** Secure CI/CD pipeline (Trivy, Semgrep, Gitleaks, OWASP ZAP)
- **Phase 8:** Kubernetes hardening (RBAC, NetworkPolicy, OPA/Gatekeeper, Falco)
- **Phase 9:** IaC security (Terraform, tfsec, Checkov)
- **Phase 10:** Observability (Prometheus, Grafana, Alertmanager)
- **Phase 11:** Supply chain security (SBOM, Cosign, SLSA)
- **Phase 12:** Threat modeling as code (pytm, STRIDE)
- **Phase 13:** Cloud deployment (AWS ECS/EKS, RDS, WAF)

---

## Phase 1 — Authentication System

### What Was Built

A production-grade authentication system with the following endpoints:

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /health | No | Health check |
| POST | /auth/register | No | Create account, returns JWT tokens |
| POST | /auth/login | No | Login, returns JWT tokens |
| GET | /auth/me | Yes | Returns current user profile |
| POST | /auth/refresh | No | Get new access token via refresh token |
| POST | /auth/logout | No | Revoke a refresh token |
| POST | /auth/logout-all | Yes | Revoke all tokens for this user |

### Stack

- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Express
- **Database:** PostgreSQL 16
- **Containerization:** Docker + Docker Compose
- **Authentication:** JWT (access + refresh tokens)
- **Password hashing:** bcrypt

### Architecture
secureapi-platform/
├── docker/
│   ├── Dockerfile          # Multi-stage build (builder + production)
│   ├── docker-compose.yml  # App + DB containers on private network
│   └── init.sql            # Database schema — runs automatically on first start
├── src/
│   ├── app.ts              # Express app, middleware, routes, error handlers
│   ├── config/
│   │   ├── env.ts          # Environment config — crashes if required vars missing
│   │   └── database.ts     # PostgreSQL connection pool
│   ├── middleware/
│   │   └── authGuard.ts    # JWT verification middleware
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts  # register, login, getMe, refresh, logout
│   │   │   └── auth.routes.ts      # Routes + input validation rules
│   │   └── users/
│   │       └── user.store.ts       # All database queries for users + tokens
│   ├── types/index.ts      # TypeScript interfaces
│   └── utils/jwt.ts        # Token generation, verification, hashing
### Security Decisions

Every decision in this phase was made deliberately. Here is what was chosen and why:

| Decision | Implementation | Reason |
|----------|---------------|--------|
| Password hashing | bcrypt cost factor 12 | ~300ms per hash — makes brute force impractical even with a leaked database |
| Access token lifetime | 15 minutes | Short window limits damage if a token is stolen |
| Refresh token lifetime | 7 days | Long-lived but used only at one endpoint — /auth/refresh |
| Refresh token storage | SHA-256 hash stored in DB | A database breach yields hashes, not usable tokens |
| Refresh token rotation | Old token revoked on every use | Stolen token detected the moment the real user next refreshes |
| Login error messages | Same message for wrong email and wrong password | Prevents user enumeration — attacker cannot discover valid emails |
| SQL queries | Parameterized queries only — never string concatenation | Eliminates SQL injection entirely |
| User data in responses | Explicit column selection — never SELECT * | password_hash can never be accidentally returned to a client |
| Docker user | Non-root user (appuser) inside container | Limits blast radius if the app is compromised |
| Docker build | Multi-stage build | Production image contains no TypeScript compiler, no source code, no dev tools |
| Request body size | express.json limit 10kb | Prevents payload flooding attacks |
| Stack fingerprinting | x-powered-by header disabled | No need to advertise the framework to attackers |

### How to Run

```bash
# Clone the repo
git clone https://github.com/Secsiren/secureapi-platform.git
cd secureapi-platform

# Create environment file
cp .env.example .env
# Edit .env and set your own JWT_SECRET

# Start everything
cd docker && docker compose --env-file ../.env up --build
```

### How to Test

```bash
# Health check
curl -s http://localhost:3333/health | python3 -m json.tool

# Register
curl -s -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SecurePass123","first_name":"Your Name"}' \
  | python3 -m json.tool

# Login
curl -s -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SecurePass123"}' \
  | python3 -m json.tool

# Get current user (replace TOKEN with accessToken from login)
curl -s http://localhost:3333/auth/me \
  -H "Authorization: Bearer TOKEN" \
  | python3 -m json.tool
```

### Certifications This Phase Supports

- **Certified API Security Professional (CASP)** — secure token lifecycle, credential handling, API response security
- **Certified DevSecOps Professional (CDP)** — security embedded from line one, not added later

---

## Author

**Beatrice Mwangi** — DevSecOps Engineer | Cloud Security Engineer
- GitHub: [github.com/Secsiren](https://github.com/Secsiren)
- LinkedIn: [linkedin.com/in/beatrice-warukira](https://linkedin.com/in/beatrice-warukira)
- Email: beatriceitsec@gmail.com
